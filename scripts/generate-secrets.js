const { randomBytes } = require('node:crypto');
console.log('Paste these values into your .env file:');
console.log(`SESSION_SECRET=${randomBytes(48).toString('base64url')}`);
console.log(`DATA_ENCRYPTION_KEY=${randomBytes(32).toString('hex')}`);
