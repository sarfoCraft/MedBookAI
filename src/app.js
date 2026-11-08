const path = require('node:path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const { rateLimit } = require('express-rate-limit');
const { z } = require('zod');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const { encryptJson, decryptJson, checksum } = require('./lib/crypto');
const { validateState } = require('./lib/state-schema');
const { isTrialOrSubscriptionActive, billingSummary } = require('./lib/trial');
const { PrismaSessionStore } = require('./lib/prisma-session-store');
const { todayInTimezone, validTimeZone } = require('./lib/time');
const { ROLE_LABELS, scopeStateForUser, mergeStateForUser, canWriteClinicState } = require('./lib/access');
const { applyServerAppointmentMetadata, validateSnapshotTransitions, validateRoleChanges, auditSnapshotChanges } = require('./lib/snapshot');

const ROOT = path.resolve(__dirname, '..');
const LOGIN_SCHEMA = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200)
}).strict();
const FIREBASE_LOGIN_SCHEMA = z.object({
  idToken: z.string().min(100).max(10000)
}).strict();
const RESTORE_SCHEMA = z.object({
  expectedVersion: z.number().int().nonnegative(),
  backup: z.object({
    _meta: z.object({
      app: z.literal('MedBook AI'),
      schema: z.literal('medbook-state-v1'),
      version: z.string().max(30).optional(),
      exportedAt: z.string().datetime({ offset: true }).optional(),
      stateVersion: z.number().int().nonnegative().optional(),
      checksum: z.string().regex(/^[a-f0-9]{64}$/i).optional()
    }).strict(),
    state: z.record(z.string(), z.unknown())
  }).strict()
}).strict();
const USER_CREATE_SCHEMA = z.object({
  email: z.string().trim().email().max(254),
  displayName: z.string().trim().min(2).max(100),
  password: z.string().min(14).max(200),
  role: z.enum(['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'BILLING', 'AUDITOR', 'STAFF']),
  providerName: z.string().trim().max(160).optional().nullable(),
  branch: z.string().trim().max(160).optional().nullable()
}).strict();
const USER_UPDATE_SCHEMA = z.object({
  displayName: z.string().trim().min(2).max(100).optional(),
  role: z.enum(['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'BILLING', 'AUDITOR', 'STAFF']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(14).max(200).optional(),
  providerName: z.string().trim().max(160).nullable().optional(),
  branch: z.string().trim().max(160).nullable().optional()
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'At least one account field must be supplied.' });
const REASON_SCHEMA = z.string().trim().min(8).max(500).optional();

async function revokeUserSessions(tx, userId) {
  // Express session data is stored as JSONB; the authenticated user ID is at the root of the session object.
  await tx.session.deleteMany({ where: { OR: [{ userId }, { data: { path: ['userId'], equals: userId } }] } });
}

function safeUser(user, organization) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role] || user.role,
    providerName: user.providerName || null,
    branch: user.branch || null,
    organization: { id: organization.id, name: organization.name, timezone: organization.timezone || 'UTC' }
  };
}

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function createApp({ prisma, sessionStore, firebaseAuth = null, env = process.env } = {}) {
  if (!prisma) throw new Error('createApp requires a Prisma client.');
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
  if (!env.DATA_ENCRYPTION_KEY || !/^[a-f0-9]{64}$/i.test(env.DATA_ENCRYPTION_KEY)) throw new Error('DATA_ENCRYPTION_KEY must be 64 hexadecimal characters.');

  const app = express();
  const firebaseClientConfigured = Boolean(env.FIREBASE_API_KEY && env.FIREBASE_PROJECT_ID && env.FIREBASE_APP_ID);
  app.disable('x-powered-by');
  if (String(env.TRUST_PROXY).toLowerCase() === 'true') app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'sameorigin' },
    noSniff: true
  }));
  app.use((req, res, next) => {
    const snapText = req.path.startsWith('/snaptext-tools');
    const scriptSrc = snapText
      ? ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://unpkg.com']
      : ["'self'"];
    const styleSrc = snapText
      ? ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com']
      : ["'self'", "'unsafe-inline'"];
    const directives = [
      `default-src 'self'`, `base-uri 'self'`, `object-src 'none'`, `frame-ancestors 'self'`,
      `form-action 'self'`, `script-src ${scriptSrc.join(' ')}`, `style-src ${styleSrc.join(' ')}`,
      `font-src 'self' data: https://fonts.gstatic.com`, `img-src 'self' data: blob: https:`,
      `connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com`,
      `frame-src 'self'`, `worker-src 'self' blob: https://cdnjs.cloudflare.com`
    ];
    res.setHeader('Content-Security-Policy', directives.join('; '));
    next();
  });
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('Pragma', 'no-cache');
    next();
  });
  app.use(express.json({ limit: '13mb', strict: true }));
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));
  app.use(session({
    name: 'medbook.sid', secret: env.SESSION_SECRET,
    store: sessionStore || new PrismaSessionStore(prisma),
    resave: false, saveUninitialized: false, rolling: true,
    cookie: {
      httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, path: '/'
    }
  }));

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' }
  });
  const restoreLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { error: 'Too many backup restore attempts. Try again later.' }
  });
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false,
    skip: (req) => req.path === '/health'
  });
  app.use('/api', apiLimiter);

  function ensureCsrf(req) {
    if (!req.session.csrfToken) req.session.csrfToken = randomBytes(32).toString('hex');
    return req.session.csrfToken;
  }
  function sameOrigin(req, res, next) {
    const origin = req.get('origin');
    if (origin) {
      try {
        const parsed = new URL(origin);
        if (parsed.host !== req.get('host')) return res.status(403).json({ error: 'Cross-origin request rejected.' });
      } catch (_) { return res.status(403).json({ error: 'Invalid request origin.' }); }
    }
    next();
  }
  function csrfProtection(req, res, next) {
    if (!constantTimeEqual(req.session?.csrfToken, req.get('x-csrf-token'))) {
      return res.status(403).json({ error: 'CSRF validation failed. Refresh the page and retry.' });
    }
    next();
  }
  async function loadAuth(req, res, next) {
    try {
      if (!req.session?.userId || !req.session?.organizationId) return res.status(401).json({ error: 'Authentication required.' });
      const user = await prisma.user.findUnique({ where: { id: req.session.userId }, include: { organization: true } });
      if (!user || !user.isActive || user.organizationId !== req.session.organizationId || !user.organization) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: 'Session is no longer valid. Sign in again.' });
      }
      if (!ROLE_LABELS[user.role]) return res.status(403).json({ error: 'Account role is not recognized.' });
      req.auth = { user, organization: user.organization };
      next();
    } catch (error) { next(error); }
  }
  function requireRoles(...roles) {
    return (req, res, next) => roles.includes(req.auth?.user?.role)
      ? next() : res.status(403).json({ error: 'Your account does not have permission to perform this action.' });
  }
  function requireActiveTrial(req, res, next) {
    if (!isTrialOrSubscriptionActive(req.auth.organization)) {
      return res.status(402).json({
        error: 'The clinic trial has expired. Data remains available for export; activate a subscription to resume editing.',
        billing: billingSummary(req.auth.organization)
      });
    }
    next();
  }
  function clinicToday(req) {
    return todayInTimezone(req.auth?.organization?.timezone || 'UTC');
  }
  function clinicNow(req) {
    const timezone = validTimeZone(req.auth?.organization?.timezone) ? req.auth.organization.timezone : 'UTC';
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
  }

  async function establishSession(req, res, user, authMethod) {
    await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
    req.session.userId = user.id;
    req.session.organizationId = user.organizationId;
    const csrfToken = ensureCsrf(req);
    await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await prisma.auditEvent.create({ data: {
      organizationId: user.organizationId, actorUserId: user.id, actorRole: user.role,
      action: 'auth.login', resourceType: 'session', outcome: 'SUCCESS', metadata: { method: authMethod }
    }});
    return res.json({ authenticated: true, csrfToken, user: safeUser(user, user.organization) });
  }
  async function writeAudit(tx, req, action, resourceType, resourceId, metadata = {}, options = {}) {
    return tx.auditEvent.create({ data: {
      organizationId: req.auth.organization.id,
      actorUserId: req.auth.user.id,
      actorRole: req.auth.user.role,
      action,
      resourceType,
      resourceId: resourceId || null,
      outcome: options.outcome || 'SUCCESS',
      reason: options.reason || null,
      previousValues: options.previousValues || undefined,
      newValues: options.newValues || undefined,
      metadata
    }});
  }
  async function currentClinicState(organizationId, tx = prisma) {
    const row = await tx.clinicState.findUnique({ where: { organizationId } });
    return row ? decryptJson(row.payload, env.DATA_ENCRYPTION_KEY) : null;
  }
  function validateActiveUserAssignments(users, state) {
  const issues = [];
  for (const user of users || []) {
    if (!user.isActive) continue;
    const problem = validateAccountScope(state, user.role, user.providerName, user.branch);
    if (problem) issues.push({ userId: user.id, role: user.role, message: problem });
  }
  return issues;
}

function validateAccountScope(state, role, providerName, branch) {
    if (!['OWNER', 'ADMIN'].includes(role)) {
      if (!branch || !state?.practices?.some((practice) => practice.branch === branch)) {
        return 'Select a valid clinic branch for this account.';
      }
    }
    if (role === 'DOCTOR') {
      const doctor = state?.staff?.find((member) => member.role === 'Doctor' && member.name === providerName && member.branch === branch);
      const provider = state?.providers?.find((item) => item.name === providerName && item.branch === branch);
      if (!providerName || (!doctor && !provider)) return 'Select a doctor that exists in this clinic and branch.';
    }
    if (role === 'STAFF' && !state?.staff?.some((member) => member.name && member.name === providerName && member.branch === branch)) {
      return 'Staff accounts must be linked to an existing staff directory member.';
    }
    return null;
  }

  app.get('/api/health', async (req, res, next) => {
    try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok', database: 'connected', firebaseAuth: Boolean(firebaseAuth) }); }
    catch (error) { next(error); }
  });

  app.get('/api/config/firebase', (req, res) => {
    const config = {
      apiKey: env.FIREBASE_API_KEY || '',
      authDomain: env.FIREBASE_AUTH_DOMAIN || '',
      projectId: env.FIREBASE_PROJECT_ID || '',
      appId: env.FIREBASE_APP_ID || ''
    };
    const enabled = firebaseClientConfigured;
    res.setHeader('Cache-Control', 'no-store, private');
    res.json({ enabled, config: enabled ? config : null });
  });

  app.get('/api/auth/session', async (req, res, next) => {
    try {
      const csrfToken = ensureCsrf(req);
      if (!req.session.userId) return res.json({ authenticated: false, csrfToken });
      const user = await prisma.user.findUnique({ where: { id: req.session.userId }, include: { organization: true } });
      if (!user || !user.isActive || user.organizationId !== req.session.organizationId || !user.organization) {
        return req.session.regenerate((error) => {
          if (error) return next(error);
          const freshCsrfToken = ensureCsrf(req);
          req.session.save((saveError) => {
            if (saveError) return next(saveError);
            res.json({ authenticated: false, csrfToken: freshCsrfToken });
          });
        });
      }
      res.json({ authenticated: true, csrfToken, user: safeUser(user, user.organization) });
    } catch (error) { next(error); }
  });

  app.post('/api/auth/login', loginLimiter, sameOrigin, csrfProtection, async (req, res, next) => {
    try {
      const parsed = LOGIN_SCHEMA.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email address and password.' });
      const email = parsed.data.email.toLowerCase();
      const user = await prisma.user.findUnique({ where: { email }, include: { organization: true } });
      const firebaseRequiredForAdmin = String(env.REQUIRE_FIREBASE_AUTH).toLowerCase() === 'true' && ['OWNER', 'ADMIN'].includes(user?.role);
      const valid = user && !user.firebaseUid && !firebaseRequiredForAdmin && user.isActive && user.passwordHash
        && await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!valid || !user.organization || !ROLE_LABELS[user.role]) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        return res.status(401).json({ error: 'Email or password is incorrect. Use Firebase sign-in for linked accounts.' });
      }
      if (user.role === 'DOCTOR' && !user.providerName) return res.status(403).json({ error: 'This doctor account has not been assigned a provider profile. Contact the clinic administrator.' });
      if (['RECEPTIONIST', 'BILLING', 'AUDITOR', 'STAFF'].includes(user.role) && !user.branch) {
        return res.status(403).json({ error: 'This account has not been assigned a clinic branch. Contact the clinic administrator.' });
      }
      return await establishSession(req, res, user, 'password');
    } catch (error) { next(error); }
  });

  app.post('/api/auth/firebase-login', loginLimiter, sameOrigin, csrfProtection, async (req, res, next) => {
    try {
      const parsed = FIREBASE_LOGIN_SCHEMA.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'A valid Firebase ID token is required.' });
      if (!firebaseAuth) return res.status(503).json({ error: 'Firebase Authentication is not configured on this server.' });

      let decoded;
      try {
        decoded = await firebaseAuth.verifyIdToken(parsed.data.idToken, true);
      } catch (_) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return res.status(401).json({ error: 'Firebase sign-in could not be verified. Please sign in again.' });
      }

      const user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid }, include: { organization: true } });
      const tokenEmail = String(decoded.email || '').toLowerCase();
      if (!user || !user.isActive || !user.organization || !tokenEmail || tokenEmail !== user.email.toLowerCase() || !ROLE_LABELS[user.role]) {
        return res.status(401).json({ error: 'This Firebase account is not linked to an active MedBook clinic account.' });
      }
      if (String(env.FIREBASE_REQUIRE_EMAIL_VERIFIED).toLowerCase() === 'true' && decoded.email_verified !== true) {
        return res.status(403).json({ error: 'Verify your email address before signing in.' });
      }
      if (user.role === 'DOCTOR' && !user.providerName) return res.status(403).json({ error: 'This doctor account has not been assigned a provider profile. Contact the clinic administrator.' });
      if (['RECEPTIONIST', 'BILLING', 'AUDITOR', 'STAFF'].includes(user.role) && !user.branch) {
        return res.status(403).json({ error: 'This account has not been assigned a clinic branch. Contact the clinic administrator.' });
      }
      return await establishSession(req, res, user, 'firebase');
    } catch (error) { next(error); }
  });

  app.post('/api/auth/logout', sameOrigin, csrfProtection, async (req, res, next) => {
    try {
      const userId = req.session.userId;
      const organizationId = req.session.organizationId;
      if (userId && organizationId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        await prisma.auditEvent.create({ data: {
          organizationId, actorUserId: userId, actorRole: user?.role || null,
          action: 'auth.logout', resourceType: 'session', outcome: 'SUCCESS', metadata: {}
        }});
      }
      req.session.destroy((error) => {
        if (error) return next(error);
        res.clearCookie('medbook.sid', { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
        res.json({ ok: true });
      });
    } catch (error) { next(error); }
  });

  app.get('/api/state', loadAuth, async (req, res, next) => {
    try {
      const row = await prisma.clinicState.findUnique({ where: { organizationId: req.auth.organization.id } });
      const state = row ? decryptJson(row.payload, env.DATA_ENCRYPTION_KEY) : null;
      if (state && !['OWNER', 'ADMIN'].includes(req.auth.user.role)) {
        const scoped = scopeStateForUser(state, req.auth.user);
        const checked = validateState(scoped, { clinicToday: clinicToday(req), clinicNow: clinicNow(req), allowExternalPatientDoctor: req.auth.user.role === 'DOCTOR', allowExternalPatientBranch: req.auth.user.role === 'DOCTOR' });
        if (!checked.success) return res.status(500).json({ error: 'The clinic workspace could not be safely scoped for this account.' });
        return res.json({ state: checked.data, version: row.version, billing: billingSummary(req.auth.organization), user: safeUser(req.auth.user, req.auth.organization), clinicToday: clinicToday(req), clinicNow: clinicNow(req) });
      }
      res.json({ state, version: row?.version || 0, billing: billingSummary(req.auth.organization), user: safeUser(req.auth.user, req.auth.organization), clinicToday: clinicToday(req), clinicNow: clinicNow(req) });
    } catch (error) { next(error); }
  });

  app.put('/api/state', loadAuth, sameOrigin, csrfProtection, requireActiveTrial, async (req, res, next) => {
    try {
      if (!canWriteClinicState(req.auth.user.role)) return res.status(403).json({ error: 'This account has read-only access to clinic data.' });
      const expectedVersion = req.body?.expectedVersion;
      if (!Number.isInteger(expectedVersion) || expectedVersion < 0) return res.status(400).json({ error: 'A valid expectedVersion is required.' });
      const reasonResult = REASON_SCHEMA.safeParse(req.body?.reason);
      if (!reasonResult.success) return res.status(400).json({ error: 'Change reason must be 8–500 characters when supplied.' });
      const incomingValidation = validateState(req.body?.state, { clinicToday: clinicToday(req), clinicNow: clinicNow(req) });
      if (!incomingValidation.success) return res.status(400).json({ error: incomingValidation.error, issues: incomingValidation.issues });
      const orgId = req.auth.organization.id;
      const result = await prisma.$transaction(async (tx) => {
        const current = await tx.clinicState.findUnique({ where: { organizationId: orgId } });
        const currentVersion = current?.version || 0;
        if (currentVersion !== expectedVersion) throw Object.assign(new Error('Version conflict.'), { code: 'STATE_CONFLICT' });
        if (!current && !['OWNER', 'ADMIN'].includes(req.auth.user.role)) throw Object.assign(new Error('Clinic owner must initialize the workspace first.'), { code: 'STATE_NOT_INITIALIZED' });
        const previous = current ? decryptJson(current.payload, env.DATA_ENCRYPTION_KEY) : null;
        const merged = previous ? mergeStateForUser(previous, incomingValidation.data, req.auth.user) : incomingValidation.data;
        applyServerAppointmentMetadata(previous, merged, req.auth.user, new Date(), clinicToday(req));
        const validated = validateState(merged, { clinicToday: clinicToday(req), clinicNow: clinicNow(req) });
        if (!validated.success) throw Object.assign(new Error(validated.error), { code: 'STATE_VALIDATION', issues: validated.issues });
        const transitions = validateSnapshotTransitions(previous, validated.data, { clinicToday: clinicToday(req), reason: reasonResult.data || '' });
        if (!transitions.success) throw Object.assign(new Error('Clinic changes failed lifecycle validation.'), { code: 'STATE_TRANSITION', issues: transitions.issues });
        const normalizedPrevious = previous ? validateState(previous, { clinicToday: clinicToday(req), clinicNow: clinicNow(req) }) : null;
        const roleComparisonState = normalizedPrevious?.success ? normalizedPrevious.data : previous;
        const roleValidation = validateRoleChanges(roleComparisonState, validated.data, req.auth.user, { clinicToday: clinicToday(req) });
        if (!roleValidation.success) throw Object.assign(new Error('This account attempted changes outside its assigned permissions.'), { code: 'ROLE_VALIDATION', issues: roleValidation.issues });
        const activeUsers = await tx.user.findMany({ where: { organizationId: req.auth.organization.id, isActive: true }, select: { id: true, role: true, providerName: true, branch: true, isActive: true } });
        const assignmentIssues = validateActiveUserAssignments(activeUsers, validated.data);
        if (assignmentIssues.length) throw Object.assign(new Error('Clinic changes would invalidate one or more active staff account assignments.'), { code: 'USER_ASSIGNMENT', issues: assignmentIssues });
        const encrypted = encryptJson(validated.data, env.DATA_ENCRYPTION_KEY);
        let row;
        if (!current) {
          row = await tx.clinicState.create({ data: { organizationId: orgId, version: 1, payload: encrypted, updatedById: req.auth.user.id } });
        } else {
          const changed = await tx.clinicState.updateMany({
            where: { organizationId: orgId, version: expectedVersion },
            data: { version: expectedVersion + 1, payload: encrypted, updatedById: req.auth.user.id }
          });
          if (changed.count !== 1) throw Object.assign(new Error('Version conflict.'), { code: 'STATE_CONFLICT' });
          row = await tx.clinicState.findUnique({ where: { organizationId: orgId } });
        }
        await auditSnapshotChanges(tx, req, previous, validated.data, reasonResult.data || '');
        await writeAudit(tx, req, current ? 'state.updated' : 'state.initialized', 'clinic_state', row.id, { version: row.version });
        return { row, state: validated.data };
      });
      res.json({ ok: true, state: scopeStateForUser(result.state, req.auth.user), version: result.row.version, billing: billingSummary(req.auth.organization), savedAt: result.row.updatedAt, clinicToday: clinicToday(req), clinicNow: clinicNow(req) });
    } catch (error) {
      if (error.code === 'STATE_CONFLICT' || error.code === 'P2002') return res.status(409).json({ error: 'This clinic data changed in another session. Reload the workspace before continuing.' });
      if (error.code === 'STATE_NOT_INITIALIZED') return res.status(409).json({ error: error.message });
      if (error.code === 'STATE_VALIDATION' || error.code === 'STATE_TRANSITION' || error.code === 'ROLE_VALIDATION' || error.code === 'USER_ASSIGNMENT') return res.status(400).json({ error: error.message, issues: error.issues || [] });
      next(error);
    }
  });

  app.get('/api/users', loadAuth, requireRoles('OWNER', 'ADMIN'), async (req, res, next) => {
    try {
      const users = await prisma.user.findMany({
        where: { organizationId: req.auth.organization.id }, orderBy: [{ role: 'asc' }, { displayName: 'asc' }],
        select: { id: true, email: true, displayName: true, role: true, providerName: true, branch: true, isActive: true, lastLoginAt: true, createdAt: true }
      });
      res.json({ users });
    } catch (error) { next(error); }
  });

  app.post('/api/users', loadAuth, sameOrigin, csrfProtection, requireActiveTrial, requireRoles('OWNER', 'ADMIN'), async (req, res, next) => {
    let firebaseUser = null;
    try {
      const parsed = USER_CREATE_SCHEMA.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Account details are invalid.', issues: parsed.error.issues });
      if (req.auth.user.role === 'ADMIN' && ['ADMIN', 'AUDITOR'].includes(parsed.data.role)) return res.status(403).json({ error: 'Clinic Admin cannot create another Admin or Auditor account.' });
      const email = parsed.data.email.toLowerCase();
      const state = await currentClinicState(req.auth.organization.id);
      const scopeError = validateAccountScope(state, parsed.data.role, parsed.data.providerName, parsed.data.branch);
      if (scopeError) return res.status(400).json({ error: scopeError });

      if (firebaseAuth && firebaseClientConfigured) {
        try {
          firebaseUser = await firebaseAuth.createUser({
            email, password: parsed.data.password, displayName: parsed.data.displayName, disabled: false
          });
        } catch (error) {
          if (error.code === 'auth/email-already-exists') return res.status(409).json({ error: 'An account with this email address already exists in Firebase Authentication.' });
          throw error;
        }
      } else if (String(env.REQUIRE_FIREBASE_AUTH).toLowerCase() === 'true') {
        return res.status(503).json({ error: 'Firebase Authentication is required but is not configured on this server.' });
      }

      const passwordHash = firebaseUser ? null : await bcrypt.hash(parsed.data.password, 12);
      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: {
          organizationId: req.auth.organization.id,
          email, displayName: parsed.data.displayName, passwordHash,
          firebaseUid: firebaseUser?.uid || null,
          role: parsed.data.role, providerName: parsed.data.providerName || null,
          branch: parsed.data.branch || null, isActive: true
        }, select: { id: true, email: true, displayName: true, role: true, providerName: true, branch: true, isActive: true, createdAt: true } });
        await writeAudit(tx, req, 'user.created', 'user', user.id, { role: user.role, branch: user.branch, providerName: user.providerName, authProvider: firebaseUser ? 'firebase' : 'legacy-password' },
          { newValues: { role: user.role, branch: user.branch, providerName: user.providerName, isActive: true } });
        return user;
      });
      res.status(201).json({ user: created, authProvider: firebaseUser ? 'firebase' : 'legacy-password' });
    } catch (error) {
      if (firebaseUser?.uid && firebaseAuth) {
        try { await firebaseAuth.deleteUser(firebaseUser.uid); } catch (_) {}
      }
      if (error.code === 'P2002') return res.status(409).json({ error: 'An account with this email address already exists.' });
      next(error);
    }
  });

  app.patch('/api/users/:id', loadAuth, sameOrigin, csrfProtection, requireActiveTrial, requireRoles('OWNER', 'ADMIN'), async (req, res, next) => {
    try {
      const parsed = USER_UPDATE_SCHEMA.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Account update is invalid.', issues: parsed.error.issues });
      const target = await prisma.user.findFirst({ where: { id: req.params.id, organizationId: req.auth.organization.id } });
      if (!target) return res.status(404).json({ error: 'Account not found in this clinic.' });
      if (target.role === 'OWNER') return res.status(403).json({ error: 'The clinic owner account cannot be modified through this endpoint.' });
      if (target.id === req.auth.user.id && parsed.data.isActive === false) return res.status(400).json({ error: 'You cannot deactivate your own signed-in account.' });
      if (req.auth.user.role === 'ADMIN' && (target.role === 'ADMIN' || parsed.data.role === 'ADMIN' || parsed.data.role === 'AUDITOR')) {
        return res.status(403).json({ error: 'Clinic Admin cannot modify Admin or Auditor accounts.' });
      }
      const nextRole = parsed.data.role || target.role;
      const nextProvider = ['DOCTOR','STAFF'].includes(nextRole)
        ? (Object.prototype.hasOwnProperty.call(parsed.data, 'providerName') ? parsed.data.providerName : target.providerName)
        : null;
      const nextBranch = Object.prototype.hasOwnProperty.call(parsed.data, 'branch') ? parsed.data.branch : target.branch;
      const state = await currentClinicState(req.auth.organization.id);
      const scopeError = validateAccountScope(state, nextRole, nextProvider, nextBranch);
      if (scopeError) return res.status(400).json({ error: scopeError });
      const data = { ...parsed.data };
      delete data.password;
      if (target.firebaseUid) {
        if (!firebaseAuth) return res.status(503).json({ error: 'Firebase Authentication is unavailable; account security changes cannot be applied.' });
        const firebaseChanges = {};
        if (parsed.data.password) firebaseChanges.password = parsed.data.password;
        if (parsed.data.displayName) firebaseChanges.displayName = parsed.data.displayName;
        if (Object.prototype.hasOwnProperty.call(parsed.data, 'isActive')) firebaseChanges.disabled = !parsed.data.isActive;
        if (Object.keys(firebaseChanges).length) {
          await firebaseAuth.updateUser(target.firebaseUid, firebaseChanges);
          await firebaseAuth.revokeRefreshTokens(target.firebaseUid);
        } else if (parsed.data.role || parsed.data.providerName || parsed.data.branch) {
          await firebaseAuth.revokeRefreshTokens(target.firebaseUid);
        }
      } else if (parsed.data.password) {
        data.passwordHash = await bcrypt.hash(parsed.data.password, 12);
      }
      data.providerName = nextProvider || null;
      if (Object.prototype.hasOwnProperty.call(parsed.data, 'branch')) data.branch = parsed.data.branch || null;
      const updated = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({ where: { id: target.id }, data, select: { id: true, email: true, displayName: true, role: true, providerName: true, branch: true, isActive: true, lastLoginAt: true } });
        if (parsed.data.isActive === false || parsed.data.role || parsed.data.providerName || parsed.data.branch || parsed.data.password) {
          await revokeUserSessions(tx, target.id);
        }
        await writeAudit(tx, req, 'user.updated', 'user', target.id,
          { changedFields: Object.keys(parsed.data) },
          { previousValues: { role: target.role, isActive: target.isActive, providerName: target.providerName, branch: target.branch },
            newValues: { role: user.role, isActive: user.isActive, providerName: user.providerName, branch: user.branch } });
        return user;
      });
      res.json({ user: updated });
    } catch (error) { next(error); }
  });

  app.get('/api/backup/export', loadAuth, requireRoles('OWNER', 'ADMIN'), async (req, res, next) => {
    try {
      const row = await prisma.clinicState.findUnique({ where: { organizationId: req.auth.organization.id } });
      if (!row) return res.status(404).json({ error: 'There is no saved clinic data to back up yet.' });
      const state = decryptJson(row.payload, env.DATA_ENCRYPTION_KEY);
      const billing = billingSummary(req.auth.organization);
      const backupState = { ...state, billing };
      const backup = {
        _meta: { app: 'MedBook AI', version: '2.7.1', exportedAt: new Date().toISOString(), schema: 'medbook-state-v1', stateVersion: row.version, checksum: checksum(backupState) },
        state: backupState
      };
      await prisma.backup.create({ data: {
        organizationId: req.auth.organization.id, createdById: req.auth.user.id,
        kind: 'EXPORT', schemaVersion: 'medbook-state-v1', checksum: checksum(backup),
        payload: encryptJson(backup, env.DATA_ENCRYPTION_KEY)
      }});
      await writeAudit(prisma, req, 'backup.exported', 'backup', null, { stateVersion: row.version });
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="medbook-backup-${clinicToday(req)}.json"`);
      res.json(backup);
    } catch (error) { next(error); }
  });

  app.post('/api/backup/restore', loadAuth, requireRoles('OWNER', 'ADMIN'), sameOrigin, csrfProtection, restoreLimiter, requireActiveTrial, async (req, res, next) => {
    try {
      const parsed = RESTORE_SCHEMA.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Backup format is invalid.', issues: parsed.error.issues });
      const backup = parsed.data.backup;
      const backupVersion = String(backup._meta.version || '0').match(/^(\d+)\.(\d+)/);
      const requiresChecksum = backupVersion && (Number(backupVersion[1]) > 2 || (Number(backupVersion[1]) === 2 && Number(backupVersion[2]) >= 7));
      if (requiresChecksum && !backup._meta.checksum) return res.status(400).json({ error: 'MedBook v2.7.1 backups must include an integrity checksum.' });
      if (backup._meta.checksum && backup._meta.checksum !== checksum(backup.state)) {
        return res.status(400).json({ error: 'Backup checksum does not match its contents.' });
      }
      const validation = validateState(backup.state, { clinicToday: clinicToday(req), clinicNow: clinicNow(req) });
      if (!validation.success) return res.status(400).json({ error: validation.error, issues: validation.issues });
      const orgId = req.auth.organization.id;
      const expectedVersion = parsed.data.expectedVersion;
      const updated = await prisma.$transaction(async (tx) => {
        const current = await tx.clinicState.findUnique({ where: { organizationId: orgId } });
        if ((current?.version || 0) !== expectedVersion) throw Object.assign(new Error('Version conflict.'), { code: 'STATE_CONFLICT' });
        const currentSnapshot = current ? decryptJson(current.payload, env.DATA_ENCRYPTION_KEY) : null;
        if (currentSnapshot) {
          await tx.backup.create({ data: {
            organizationId: orgId, createdById: req.auth.user.id, kind: 'PRE_RESTORE',
            schemaVersion: 'medbook-state-v1', checksum: checksum(currentSnapshot),
            payload: encryptJson(currentSnapshot, env.DATA_ENCRYPTION_KEY)
          }});
        }
        let row;
        const encrypted = encryptJson(validation.data, env.DATA_ENCRYPTION_KEY);
        if (!current) {
          if (expectedVersion !== 0) throw Object.assign(new Error('Version conflict.'), { code: 'STATE_CONFLICT' });
          row = await tx.clinicState.create({ data: { organizationId: orgId, version: 1, payload: encrypted, updatedById: req.auth.user.id } });
        } else {
          const changed = await tx.clinicState.updateMany({
            where: { organizationId: orgId, version: expectedVersion },
            data: { version: expectedVersion + 1, payload: encrypted, updatedById: req.auth.user.id }
          });
          if (changed.count !== 1) throw Object.assign(new Error('Version conflict.'), { code: 'STATE_CONFLICT' });
          row = await tx.clinicState.findUnique({ where: { organizationId: orgId } });
        }
        await writeAudit(tx, req, 'backup.restored', 'clinic_state', row.id,
          { version: row.version, sourceVersion: backup._meta.stateVersion || null },
          { previousValues: { version: expectedVersion }, newValues: { version: row.version }, reason: 'Owner/admin initiated backup restore' });
        return row;
      });
      res.json({ ok: true, state: validation.data, version: updated.version, billing: billingSummary(req.auth.organization) });
    } catch (error) {
      if (error.code === 'STATE_CONFLICT' || error.code === 'P2002') return res.status(409).json({ error: 'Clinic data changed in another session. Reload before restoring.' });
      next(error);
    }
  });

  app.get('/api/audit', loadAuth, requireRoles('OWNER', 'ADMIN', 'AUDITOR'), async (req, res, next) => {
    try {
      let events = await prisma.auditEvent.findMany({
        where: { organizationId: req.auth.organization.id }, orderBy: { createdAt: 'desc' }, take: 500,
        select: {
          id: true, action: true, resourceType: true, resourceId: true, outcome: true,
          actorRole: true, reason: true, previousValues: true, newValues: true, metadata: true, createdAt: true,
          actor: { select: { email: true, displayName: true } }
        }
      });
      if (req.auth.user.role === 'AUDITOR') {
        const state = await currentClinicState(req.auth.organization.id);
        const appointmentIds = new Set((state?.appointments || []).filter((item) => item.branch === req.auth.user.branch).map((item) => String(item.id)));
        const patientIds = new Set((state?.patients || []).filter((item) => item.branch === req.auth.user.branch).map((item) => String(item.id)));
        const invoiceIds = new Set((state?.invoices || []).filter((item) => patientIds.has(String(item.patientId))).map((item) => String(item.id)));
        events = events.filter((event) =>
          (event.resourceType === 'appointment' && appointmentIds.has(String(event.resourceId))) ||
          (event.resourceType === 'invoice' && invoiceIds.has(String(event.resourceId))));
      } else events = events.slice(0, 200);
      res.json({ events: events.slice(0, 200) });
    } catch (error) { next(error); }
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
  const staticOptions = { dotfiles: 'deny', index: false, maxAge: env.NODE_ENV === 'production' ? '1h' : 0 };
  app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));
  app.get('/index.html', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));
  app.get('/app.js', (req, res) => res.sendFile(path.join(ROOT, 'app.js')));
  app.get('/appointment-domain.js', (req, res) => res.sendFile(path.join(ROOT, 'appointment-domain.js')));
  app.get('/api.js', (req, res) => res.sendFile(path.join(ROOT, 'api.js')));
  app.get('/styles.css', (req, res) => res.sendFile(path.join(ROOT, 'styles.css')));
  app.use('/assets', express.static(path.join(ROOT, 'assets'), staticOptions));
  app.use('/snaptext-tools', express.static(path.join(ROOT, 'snaptext-tools'), staticOptions));
  app.get('*', (req, res) => {
    if (path.extname(req.path)) return res.status(404).send('Not found');
    res.sendFile(path.join(ROOT, 'index.html'));
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
    if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'Malformed JSON request.' });
    if (env.NODE_ENV !== 'test') console.error('[MedBook API]', error?.message || error);
    res.status(500).json({ error: 'An unexpected server error occurred. Check the server log for details.' });
  });
  return app;
}

module.exports = { createApp, constantTimeEqual, safeUser };
