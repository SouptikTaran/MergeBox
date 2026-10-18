import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

interface EncryptedToken {
  version: 1;
  iv: string;
  tag: string;
  ciphertext: string;
}

export function createTokenEncryption(encodedKey: string) {
  const key = Buffer.from(encodedKey, 'base64');
  if (key.length !== 32 || key.toString('base64') !== encodedKey) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.',
    );
  }

  return {
    async encrypt(token: string, accountContext: string): Promise<string> {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(accountContext));
      const ciphertext = Buffer.concat([
        cipher.update(token, 'utf8'),
        cipher.final(),
      ]);
      const encrypted: EncryptedToken = {
        version: 1,
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64'),
        ciphertext: ciphertext.toString('base64'),
      };
      return JSON.stringify(encrypted);
    },

    async decrypt(value: string, accountContext: string): Promise<string> {
      const encrypted = JSON.parse(value) as EncryptedToken;
      if (encrypted.version !== 1)
        throw new Error('Unsupported encrypted-token version.');
      const iv = Buffer.from(encrypted.iv, 'base64');
      const tag = Buffer.from(encrypted.tag, 'base64');
      if (iv.length !== 12 || tag.length !== 16)
        throw new Error('Invalid encrypted-token format.');
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAAD(Buffer.from(accountContext));
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    },
  };
}

export function configuredTokenEncryption(
  env: NodeJS.ProcessEnv = process.env,
) {
  if (!env.TOKEN_ENCRYPTION_KEY)
    throw new Error(
      'Set TOKEN_ENCRYPTION_KEY before connecting Drive accounts.',
    );
  return createTokenEncryption(env.TOKEN_ENCRYPTION_KEY);
}

export type TokenEncryption = ReturnType<typeof createTokenEncryption>;
