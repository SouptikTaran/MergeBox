import { config } from 'dotenv';
import { resolve } from 'node:path';

// Works from both src/ (ts-node) and dist/ (compiled Node).
config({ path: resolve(__dirname, '../../.env'), quiet: true });

export function databaseUrl(): string {
  const key = 'DATABASE_URL';
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Set ${key} in backend/.env before using the database.`);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid PostgreSQL connection URL.`);
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error(`${key} must use postgres:// or postgresql://.`);
  }
  return value;
}
