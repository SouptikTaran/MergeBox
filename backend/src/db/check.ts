import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { closeDatabase, db } from './index';

async function main() {
  try {
    const result = await db.execute(sql`select 1 as connected`);
    assert.equal(result.rows[0]?.connected, 1);
  } finally {
    await closeDatabase();
  }
  console.log('Database connection passed.');
}

main().catch(() => {
  console.error('Database check failed. Check DATABASE_URL and network access.');
  process.exitCode = 1;
});
