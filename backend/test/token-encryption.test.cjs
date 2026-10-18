const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const {
  createTokenEncryption,
  configuredTokenEncryption,
} = require('../dist/services/token-encryption.service');

test('refresh tokens round-trip with randomized ciphertext', async () => {
  const encryption = createTokenEncryption(randomBytes(32).toString('base64'));
  const first = await encryption.encrypt(
    'private-refresh-token',
    'user:account',
  );
  const second = await encryption.encrypt(
    'private-refresh-token',
    'user:account',
  );
  assert.notEqual(first, second);
  assert.equal(first.includes('private-refresh-token'), false);
  assert.equal(
    await encryption.decrypt(first, 'user:account'),
    'private-refresh-token',
  );
});

test('tampering, wrong account, and wrong encryption key are rejected', async () => {
  const encryption = createTokenEncryption(randomBytes(32).toString('base64'));
  const value = await encryption.encrypt(
    'private-refresh-token',
    'user:account',
  );
  await assert.rejects(encryption.decrypt(value, 'other-user:account'));
  await assert.rejects(
    createTokenEncryption(randomBytes(32).toString('base64')).decrypt(
      value,
      'user:account',
    ),
  );
  const changed = JSON.parse(value);
  const bytes = Buffer.from(changed.ciphertext, 'base64');
  bytes[0] ^= 1;
  changed.ciphertext = bytes.toString('base64');
  await assert.rejects(
    encryption.decrypt(JSON.stringify(changed), 'user:account'),
  );
});

test('encryption requires a valid configured key in every environment', () => {
  assert.throws(
    () => configuredTokenEncryption({ NODE_ENV: 'production' }),
    /TOKEN_ENCRYPTION_KEY/,
  );
  assert.throws(() => createTokenEncryption('invalid-key'), /32-byte/);
  assert.throws(
    () => createTokenEncryption(randomBytes(16).toString('base64')),
    /32-byte/,
  );
});
