require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { createApp } = require('./src/app');
const { getEncryptionKey } = require('./src/lib/crypto');
const { initFirebaseAdmin } = require('./src/lib/firebase-admin');

const prisma = new PrismaClient();
const port = Number.parseInt(process.env.PORT || '3000', 10);

async function start() {
  const firebaseAuth = initFirebaseAdmin(process.env);
  getEncryptionKey();
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET is missing or too short. Run npm run generate:secrets and update .env.');
  }
  await prisma.$connect();
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  if (process.env.NODE_ENV === 'production' && String(process.env.REQUIRE_FIREBASE_AUTH).toLowerCase() === 'true') {
    const missing = ['FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID', 'FIREBASE_APP_ID']
      .filter((key) => !process.env[key]);
    if (missing.length || !firebaseAuth) {
      throw new Error(`Firebase Authentication is required but not configured. Missing: ${missing.join(', ') || 'Firebase Admin credentials'}.`);
    }
  }
  const app = createApp({ prisma, firebaseAuth });
  const server = app.listen(port, () => {
    console.log(`MedBook AI v2.7.2 is running at http://localhost:${port}`);
    console.log('Use HTTPS and a managed PostgreSQL service before handling real patient information.');
  });

  const shutdown = async () => {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch(async (error) => {
  console.error('[MedBook startup]', error.message);
  await prisma.$disconnect();
  process.exit(1);
});
