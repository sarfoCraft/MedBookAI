const { encryptJson, decryptJson } = require('../src/lib/crypto');

describe('database payload encryption', () => {
  const key = 'ab'.repeat(32);
  test('encrypts and decrypts JSON without changing its content', () => {
    const input = { patientCount: 3, notes: ['example'], nested: { ok: true } };
    const encrypted = encryptJson(input, key);
    expect(encrypted.alg).toBe('A256GCM');
    expect(encrypted.data).not.toContain('patientCount');
    expect(decryptJson(encrypted, key)).toEqual(input);
  });

  test('rejects a modified authentication tag', () => {
    const encrypted = encryptJson({ private: 'data' }, key);
    encrypted.tag = Buffer.alloc(16).toString('base64');
    expect(() => decryptJson(encrypted, key)).toThrow();
  });

  test('rejects an invalid encryption key', () => {
    expect(() => encryptJson({ ok: true }, 'not-a-key')).toThrow(/64 hexadecimal/);
  });
});
