const { createCipheriv, createDecipheriv, randomBytes, createHash } = require('node:crypto');

function getEncryptionKey(value = process.env.DATA_ENCRYPTION_KEY) {
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error('DATA_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes). Run npm run generate:secrets.');
  }
  return Buffer.from(value, 'hex');
}

function encryptJson(value, keyValue) {
  const key = getEncryptionKey(keyValue);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    v: 1,
    alg: 'A256GCM',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64')
  };
}

function decryptJson(envelope, keyValue) {
  if (!envelope || envelope.v !== 1 || envelope.alg !== 'A256GCM' ||
      typeof envelope.iv !== 'string' || typeof envelope.tag !== 'string' || typeof envelope.data !== 'string') {
    throw new Error('Encrypted database payload has an unsupported format.');
  }
  const key = getEncryptionKey(keyValue);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.data, 'base64')),
    decipher.final()
  ]);
  return JSON.parse(plaintext.toString('utf8'));
}

function checksum(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

module.exports = { getEncryptionKey, encryptJson, decryptJson, checksum };
