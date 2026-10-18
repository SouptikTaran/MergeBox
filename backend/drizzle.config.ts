import { defineConfig } from 'drizzle-kit';
import { databaseUrl } from './src/config/env';

// Generating SQL is offline; database commands share the app's DATABASE_URL.
const offline = process.argv.includes('generate') || process.argv.includes('check');

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  ...(offline ? {} : { dbCredentials: { url: databaseUrl() } }),
});
