import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const randomToken = () => randomBytes(32).toString('base64url');
export const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export const challenge = (value: string) =>
  createHash('sha256').update(value).digest('base64url');
export const isToken = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
export function equalToken(a: string, b: string): boolean {
  return (
    isToken(a) && isToken(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
