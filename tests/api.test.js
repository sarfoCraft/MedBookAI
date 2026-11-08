const request = require('supertest');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const { validState } = require('./fixtures');
const { encryptJson } = require('../src/lib/crypto');

function makePrisma({ expired = false, role = 'OWNER', branch = null, providerName = null, initialState = null } = {}) {
  const organization = {
    id: 'org-1', name: 'Test Clinic', slug: 'test-clinic', subscriptionStatus: 'TRIAL', timezone: 'America/New_York',
    trialStartedAt: new Date(Date.now() - 1000 * 60 * 60),
    trialEndsAt: expired ? new Date(Date.now() - 1000) : new Date(Date.now() + 86400000)
  };
  const user = {
    id: 'user-1', organizationId: 'org-1', email: 'owner@test.example', displayName: 'Test Owner', firebaseUid: null,
    role, branch, providerName, isActive: true, passwordHash: bcrypt.hashSync('a-strong-test-password-123', 4), organization
  };
  let stateRow = initialState ? { id: 'state-1', organizationId: 'org-1', version: 1, payload: encryptJson(initialState, 'cd'.repeat(32)), updatedAt: new Date() } : null;
  const db = {
    user: {
      findUnique: jest.fn(async ({ where }) => where.email === user.email || where.id === user.id || (where.firebaseUid && where.firebaseUid === user.firebaseUid) ? user : null),
      update: jest.fn(async ({ data }) => Object.assign(user, data)),
      findMany: jest.fn(async () => [user]),
      findFirst: jest.fn(async ({ where }) => where.id === user.id ? user : null),
      create: jest.fn(async ({ data, select }) => ({ id: 'user-2', ...data, createdAt: new Date() }))
    },
    session: { deleteMany: jest.fn(async () => ({ count: 0 })) },
    clinicState: {
      findUnique: jest.fn(async () => stateRow),
      create: jest.fn(async ({ data }) => { stateRow = { id: 'state-1', ...data, updatedAt: new Date() }; return stateRow; }),
      updateMany: jest.fn(async ({ where, data }) => {
        if (!stateRow || stateRow.version !== where.version) return { count: 0 };
        stateRow = { ...stateRow, ...data, updatedAt: new Date() };
        return { count: 1 };
      })
    },
    auditEvent: { create: jest.fn(async () => ({ id: 'audit-1' })), findMany: jest.fn(async () => []) },
    backup: { create: jest.fn(async () => ({ id: 'backup-1' })) },
    $transaction: jest.fn(async (callback) => callback(db)),
    $queryRaw: jest.fn(async () => [{ '?column?': 1 }])
  };
  return { db, user, organization, getStateRow: () => stateRow };
}

async function signedInAgent(app) {
  const agent = request.agent(app);
  const sessionResponse = await agent.get('/api/auth/session').expect(200);
  const login = await agent.post('/api/auth/login')
    .set('x-csrf-token', sessionResponse.body.csrfToken)
    .send({ email: 'owner@test.example', password: 'a-strong-test-password-123' })
    .expect(200);
  return { agent, csrfToken: login.body.csrfToken };
}

const env = {
  NODE_ENV: 'test',
  SESSION_SECRET: 'test-session-secret-that-is-long-enough-123456',
  DATA_ENCRYPTION_KEY: 'cd'.repeat(32),
  TRUST_PROXY: 'false'
};

describe('MedBook API security and persistence', () => {
  test('exposes only public Firebase web configuration', async () => {
    const { db } = makePrisma();
    const app = createApp({
      prisma: db, sessionStore: new session.MemoryStore(),
      env: { ...env, FIREBASE_API_KEY: 'public-web-key', FIREBASE_PROJECT_ID: 'medbook-demo', FIREBASE_APP_ID: 'app-id', FIREBASE_SERVICE_ACCOUNT_JSON: 'never-return-this' }
    });
    const response = await request(app).get('/api/config/firebase').expect(200);
    expect(response.body.enabled).toBe(true);
    expect(response.body.config.apiKey).toBe('public-web-key');
    expect(JSON.stringify(response.body)).not.toContain('never-return-this');
  });

  test('verifies Firebase ID tokens and maps the UID to a Prisma user before creating a session', async () => {
    const { db, user } = makePrisma();
    user.firebaseUid = 'firebase-uid-1';
    const firebaseAuth = {
      verifyIdToken: jest.fn(async () => ({ uid: 'firebase-uid-1', email: user.email, email_verified: true }))
    };
    const app = createApp({ prisma: db, firebaseAuth, sessionStore: new session.MemoryStore(), env });
    const agent = request.agent(app);
    const csrf = await agent.get('/api/auth/session').expect(200);
    const response = await agent.post('/api/auth/firebase-login')
      .set('x-csrf-token', csrf.body.csrfToken)
      .send({ idToken: 'x'.repeat(150) })
      .expect(200);
    expect(response.body.authenticated).toBe(true);
    expect(response.body.user.email).toBe(user.email);
    expect(firebaseAuth.verifyIdToken).toHaveBeenCalledWith('x'.repeat(150), true);
  });

  test('prevents Firebase-linked accounts from bypassing Firebase with the legacy password endpoint', async () => {
    const { db, user } = makePrisma();
    user.firebaseUid = 'firebase-uid-1';
    const app = createApp({ prisma: db, sessionStore: new session.MemoryStore(), env });
    const agent = request.agent(app);
    const csrf = await agent.get('/api/auth/session').expect(200);
    await agent.post('/api/auth/login')
      .set('x-csrf-token', csrf.body.csrfToken)
      .send({ email: user.email, password: 'a-strong-test-password-123' })
      .expect(401);
  });

  test('serves the appointment lifecycle rules required by the frontend', async () => {
    const { db } = makePrisma();
    const app = createApp({ prisma: db, sessionStore: new session.MemoryStore(), env });
    await request(app).get('/appointment-domain.js').expect(200).expect('Content-Type', /javascript/);
  });

  test('requires authentication to read clinic state', async () => {
    const { db } = makePrisma();
    const app = createApp({ prisma: db, sessionStore: new session.MemoryStore(), env });
    await request(app).get('/api/state').expect(401);
  });

  test('requires CSRF token for sign-in', async () => {
    const { db } = makePrisma();
    const app = createApp({ prisma: db, sessionStore: new session.MemoryStore(), env });
    await request(app).post('/api/auth/login').send({ email: 'owner@test.example', password: 'a-strong-test-password-123' }).expect(403);
  });

  test('signs in and saves an encrypted, versioned clinic snapshot', async () => {
    const { db, getStateRow } = makePrisma();
    const app = createApp({ prisma: db, sessionStore: new session.MemoryStore(), env });
    const { agent, csrfToken } = await signedInAgent(app);
    await agent.get('/api/state').expect(200).expect((res) => expect(res.body.version).toBe(0));
    const saved = await agent.put('/api/state').set('x-csrf-token', csrfToken)
      .send({ expectedVersion: 0, state: validState() }).expect(200);
    expect(saved.body.version).toBe(1);
    expect(getStateRow().payload.alg).toBe('A256GCM');
    expect(JSON.stringify(getStateRow().payload)).not.toContain('patients');
  });

  test('rejects writes after the server-side trial expires', async () => {
    const { db } = makePrisma({ expired: true });
    const app = createApp({ prisma: db, sessionStore: new session.MemoryStore(), env });
    const { agent, csrfToken } = await signedInAgent(app);
    await agent.put('/api/state').set('x-csrf-token', csrfToken)
      .send({ expectedVersion: 0, state: validState() }).expect(402);
  });


  test('exports a backup and stores an encrypted backup copy', async () => {
    const { db } = makePrisma();
    const app = createApp({ prisma: db, sessionStore: new session.MemoryStore(), env });
    const { agent, csrfToken } = await signedInAgent(app);
    await agent.put('/api/state').set('x-csrf-token', csrfToken)
      .send({ expectedVersion: 0, state: validState() }).expect(200);
    const exported = await agent.get('/api/backup/export').expect(200);
    expect(exported.body._meta.app).toBe('MedBook AI');
    expect(exported.body.state).toHaveProperty('billing');
    expect(db.backup.create).toHaveBeenCalled();
  });

  test('restore ignores billing values in uploaded JSON', async () => {
    const { db, organization } = makePrisma();
    const app = createApp({ prisma: db, sessionStore: new session.MemoryStore(), env });
    const { agent, csrfToken } = await signedInAgent(app);
    const backup = {
      _meta: { app: 'MedBook AI', schema: 'medbook-state-v1', version: '2.4' },
      state: { ...validState(), billing: { plan: 'paid', trialEndsAt: '2099-01-01' } }
    };
    const restored = await agent.post('/api/backup/restore').set('x-csrf-token', csrfToken)
      .send({ expectedVersion: 0, backup }).expect(200);
    expect(restored.body.state).not.toHaveProperty('billing');
    expect(restored.body.billing.status).toBe('trial');
    expect(organization.subscriptionStatus).toBe('TRIAL');
  });

  test('requires an integrity checksum for v2.7 backup files', async () => {
    const { db } = makePrisma();
    const app = createApp({ prisma: db, sessionStore: new session.MemoryStore(), env });
    const { agent, csrfToken } = await signedInAgent(app);
    const backup = { _meta: { app: 'MedBook AI', schema: 'medbook-state-v1', version: '2.7.0' }, state: validState() };
    await agent.post('/api/backup/restore').set('x-csrf-token', csrfToken)
      .send({ expectedVersion: 0, backup }).expect(400);
    expect(db.backup.create).not.toHaveBeenCalled();
  });

  test('blocks backup restoration when the clinic trial has expired', async () => {
    const { db } = makePrisma({ expired: true });
    const app = createApp({ prisma: db, sessionStore: new session.MemoryStore(), env });
    const { agent, csrfToken } = await signedInAgent(app);
    const backup = { _meta: { app: 'MedBook AI', schema: 'medbook-state-v1', version: '2.6' }, state: validState() };
    await agent.post('/api/backup/restore').set('x-csrf-token', csrfToken)
      .send({ expectedVersion: 0, backup }).expect(402);
    expect(db.backup.create).not.toHaveBeenCalled();
  });

  test('read-only Staff accounts cannot write clinic snapshots', async () => {
    const { db } = makePrisma({ role: 'STAFF', branch: 'Main Clinic', providerName: 'Reception Staff' });
    const app = createApp({ prisma: db, sessionStore: new session.MemoryStore(), env });
    const { agent, csrfToken } = await signedInAgent(app);
    await agent.put('/api/state').set('x-csrf-token', csrfToken)
      .send({ expectedVersion: 0, state: validState() }).expect(403);
  });

  test('owner can create a branch-scoped receptionist account with an individual password', async () => {
    const state = validState();
    state.practices = [{ id: 'PR-1', branch: 'Main Clinic' }];
    const { db } = makePrisma();
    const app = createApp({ prisma: db, sessionStore: new session.MemoryStore(), env });
    const { agent, csrfToken } = await signedInAgent(app);
    await agent.put('/api/state').set('x-csrf-token', csrfToken)
      .send({ expectedVersion: 0, state }).expect(200);
    const created = await agent.post('/api/users').set('x-csrf-token', csrfToken).send({
      email: 'reception@test.example', displayName: 'Reception One', password: 'Strong-Reception-Password-123!',
      role: 'RECEPTIONIST', branch: 'Main Clinic'
    }).expect(201);
    expect(created.body.user.role).toBe('RECEPTIONIST');
    expect(db.user.create).toHaveBeenCalled();
  });

  test('rejects invalid state payloads before writing to the database', async () => {
    const { db } = makePrisma();
    const app = createApp({ prisma: db, sessionStore: new session.MemoryStore(), env });
    const { agent, csrfToken } = await signedInAgent(app);
    await agent.put('/api/state').set('x-csrf-token', csrfToken)
      .send({ expectedVersion: 0, state: { patients: [] } }).expect(400);
    expect(db.clinicState.create).not.toHaveBeenCalled();
  });
});
