import { and, eq, gt, inArray } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';
import { HttpError } from '../utils/http-error.util';

export function createDriveRepository(
  db: PgDatabase<PgQueryResultHKT, typeof schema>,
) {
  const { driveAccounts, oauthTransactions } = schema;
  return {
    async list(userId: string) {
      return db
        .select()
        .from(driveAccounts)
        .where(eq(driveAccounts.userId, userId))
        .orderBy(driveAccounts.createdAt, driveAccounts.id);
    },
    async get(userId: string, id: string) {
      const [account] = await db
        .select()
        .from(driveAccounts)
        .where(and(eq(driveAccounts.id, id), eq(driveAccounts.userId, userId)));
      return account ?? null;
    },
    async bySubject(subject: string) {
      const [account] = await db
        .select()
        .from(driveAccounts)
        .where(eq(driveAccounts.googleSubject, subject));
      return account ?? null;
    },
    async begin(transaction: typeof oauthTransactions.$inferInsert) {
      await db.insert(oauthTransactions).values(transaction);
    },
    async consume(
      stateHash: string,
      browserHash: string,
      userId: string,
      sessionHash: string,
    ) {
      const [transaction] = await db
        .delete(oauthTransactions)
        .where(
          and(
            eq(oauthTransactions.stateHash, stateHash),
            eq(oauthTransactions.browserHash, browserHash),
            eq(oauthTransactions.userId, userId),
            eq(oauthTransactions.sessionHash, sessionHash),
            eq(oauthTransactions.intent, 'connect_drive'),
            gt(oauthTransactions.expiresAt, new Date()),
          ),
        )
        .returning();
      return transaction ?? null;
    },
    async connect(input: {
      userId: string;
      googleSubject: string;
      email: string;
      encryptedRefreshToken: string;
      scopes: string;
    }) {
      const [account] = await db
        .insert(driveAccounts)
        .values(input)
        .onConflictDoUpdate({
          target: driveAccounts.googleSubject,
          set: {
            email: input.email,
            encryptedRefreshToken: input.encryptedRefreshToken,
            scopes: input.scopes,
            status: 'active',
            updatedAt: new Date(),
          },
          setWhere: and(
            eq(driveAccounts.userId, input.userId),
            inArray(driveAccounts.status, ['active', 'reconnect']),
          ),
        })
        .returning();
      if (!account)
        throw new HttpError(
          409,
          'account_conflict',
          'This Google account cannot be connected.',
        );
      return account;
    },
    async setStatus(
      userId: string,
      id: string,
      status: 'active' | 'reconnect' | 'disconnecting',
    ) {
      await db
        .update(driveAccounts)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(driveAccounts.id, id), eq(driveAccounts.userId, userId)));
    },
    async remove(userId: string, id: string) {
      await db
        .delete(driveAccounts)
        .where(and(eq(driveAccounts.id, id), eq(driveAccounts.userId, userId)));
    },
  };
}
export type DriveRepository = ReturnType<typeof createDriveRepository>;
export type DriveAccount = typeof schema.driveAccounts.$inferSelect;
