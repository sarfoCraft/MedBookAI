require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
const { validTimeZone } = require('../src/lib/time');
const { initFirebaseAdmin } = require('../src/lib/firebase-admin');

const prisma = new PrismaClient();
let firebaseAuth = null;

function slugify(value) {
  return String(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'clinic';
}

async function getOrCreateFirebaseUser(email, password, displayName) {
  try {
    return await firebaseAuth.getUserByEmail(email);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    return firebaseAuth.createUser({ email, password, displayName, disabled: false });
  }
}

async function main() {
  firebaseAuth = initFirebaseAdmin(process.env);
  const name = process.env.SEED_ORG_NAME?.trim();
  const displayName = process.env.SEED_OWNER_NAME?.trim() || 'Clinic Owner';
  const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD || '';
  const trialDays = Number.parseInt(process.env.TRIAL_DAYS || '30', 10);
  const timezoneSetting = process.env.SEED_ORG_TIMEZONE?.trim();
  const timezone = timezoneSetting || 'UTC';

  if (!name || !email || !password || password.length < 14 || password === 'ChangeThisToAUniquePassword123!') {
    throw new Error('Set SEED_ORG_NAME, SEED_OWNER_EMAIL and a unique SEED_OWNER_PASSWORD of at least 14 characters in .env before running npm run db:seed.');
  }
  if (!validTimeZone(timezone)) throw new Error('SEED_ORG_TIMEZONE must be a valid IANA timezone, e.g. America/New_York.');
  if (!Number.isInteger(trialDays) || trialDays < 1 || trialDays > 90) {
    throw new Error('TRIAL_DAYS must be an integer between 1 and 90.');
  }

  if (firebaseAuth && (!process.env.FIREBASE_API_KEY || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_APP_ID)) {
    throw new Error('Firebase Admin is configured, but FIREBASE_API_KEY, FIREBASE_PROJECT_ID and FIREBASE_APP_ID are also required for browser sign-in.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (firebaseAuth && !existing.firebaseUid) {
      const firebaseUser = await getOrCreateFirebaseUser(email, password, displayName);
      await prisma.user.update({ where: { id: existing.id }, data: { firebaseUid: firebaseUser.uid, passwordHash: null } });
      console.log(`Linked existing Owner ${email} to Firebase Authentication.`);
    } else {
      console.log(`Owner account ${email} already exists. No changes made.`);
    }
    return;
  }

  const trialStartedAt = new Date();
  const trialEndsAt = new Date(trialStartedAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
  const slug = `${slugify(name)}-${randomBytes(3).toString('hex')}`;
  const firebaseUser = firebaseAuth ? await getOrCreateFirebaseUser(email, password, displayName) : null;
  const passwordHash = firebaseUser ? null : await bcrypt.hash(password, 12);

  const organization = await prisma.organization.create({
    data: { name, slug, trialStartedAt, trialEndsAt, trialDurationDays: trialDays, subscriptionStatus: 'TRIAL', timezone }
  });
  await prisma.user.create({
    data: { organizationId: organization.id, email, displayName, passwordHash, firebaseUid: firebaseUser?.uid || null, role: 'OWNER' }
  });

  console.log(`Created clinic: ${name}`);
  console.log(`Created owner: ${email}`);
  console.log(`Authentication: ${firebaseUser ? 'Firebase Authentication' : 'legacy bcrypt (configure Firebase to enable Firebase sign-in)'}`);
  console.log(`Trial ends: ${trialEndsAt.toISOString()}`);
  console.log(`Clinic timezone: ${timezone}`);
  console.log('No default/demo password was created. Keep your .env file private.');
}

main()
  .catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
