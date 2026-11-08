const admin = require('firebase-admin');

function initFirebaseAdmin(env = process.env) {
  if (admin.apps.length) return admin.auth(admin.app());

  const rawServiceAccount = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const hasApplicationDefaultCredentials = Boolean(env.GOOGLE_APPLICATION_CREDENTIALS);

  if (!rawServiceAccount && !hasApplicationDefaultCredentials) return null;

  const options = {};
  if (rawServiceAccount) {
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(rawServiceAccount);
    } catch (_) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must contain valid service-account JSON.');
    }
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing required service-account fields.');
    }
    if (env.FIREBASE_PROJECT_ID && env.FIREBASE_PROJECT_ID !== serviceAccount.project_id) {
      throw new Error('FIREBASE_PROJECT_ID does not match the service-account project_id.');
    }
    options.credential = admin.credential.cert(serviceAccount);
    options.projectId = env.FIREBASE_PROJECT_ID || serviceAccount.project_id;
  } else {
    options.credential = admin.credential.applicationDefault();
    if (env.FIREBASE_PROJECT_ID) options.projectId = env.FIREBASE_PROJECT_ID;
  }

  const app = admin.initializeApp(options);
  return admin.auth(app);
}

module.exports = { initFirebaseAdmin };
