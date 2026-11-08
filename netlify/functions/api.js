'use strict';

// Netlify runs this Express API as a serverless function. Keep the Prisma client
// outside the handler so warm function instances can reuse its connection pool.
process.env.NODE_ENV = 'production';
process.env.TRUST_PROXY = 'true';

const serverless = require('serverless-http');
const { PrismaClient } = require('@prisma/client');
const { createApp } = require('../../src/app');
const { initFirebaseAdmin } = require('../../src/lib/firebase-admin');

const prisma = new PrismaClient();
const firebaseAuth = initFirebaseAdmin(process.env);
const app = createApp({ prisma, firebaseAuth, env: process.env });
const proxy = serverless(app);

exports.handler = async (event, context) => {
  // The database client should not keep the Lambda event loop alive after a response.
  context.callbackWaitsForEmptyEventLoop = false;
  return proxy(event, context);
};
