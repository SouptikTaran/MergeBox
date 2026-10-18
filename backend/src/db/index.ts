import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { databaseUrl } from '../config/env';
import * as schema from './schema';

const pool = new Pool({
  connectionString: databaseUrl(),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 15_000,
});

pool.on('error', () => {
  console.error('An idle database connection failed.');
});

export const db = drizzle(pool, { schema });
export const closeDatabase = () => pool.end();
