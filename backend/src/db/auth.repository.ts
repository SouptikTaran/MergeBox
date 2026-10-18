import { and, eq, gt, lte } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export interface GoogleIdentity {
  subject: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export function createAuthStore(
  db: PgDatabase<PgQueryResultHKT, typeof schema>,
) {
  const { users, authIdentities, sessions, oauthTransactions } = schema;
  return {
    async startOAuth(transaction: typeof oauthTransactions.$inferInsert) {
      await db.insert(oauthTransactions).values(transaction);
    },
    async consumeOAuth(
      stateHash: string,
      browserHash: string,
      now = new Date(),
    ) {
      const [transaction] = await db
        .delete(oauthTransactions)
        .where(
          and(
            eq(oauthTransactions.stateHash, stateHash),
            eq(oauthTransactions.browserHash, browserHash),
            eq(oauthTransactions.intent, 'login'),
            gt(oauthTransactions.expiresAt, now),
          ),
        )
        .returning();
      return transaction ?? null;
    },
    async signIn(
      identity: GoogleIdentity,
      session: { tokenHash: string; csrfToken: string; expiresAt: Date },
      oldHash?: string,
    ) {
      return db.transaction(async (tx) => {
        const identityWhere = and(
          eq(authIdentities.provider, 'google'),
          eq(authIdentities.subject, identity.subject),
        );
        let [linked] = await tx
          .select()
          .from(authIdentities)
          .where(identityWhere);
        if (!linked) {
          const [candidate] = await tx
            .insert(users)
            .values({ email: identity.email })
            .returning();
          const [inserted] = await tx
            .insert(authIdentities)
            .values({
              provider: 'google',
              subject: identity.subject,
              userId: candidate!.id,
            })
            .onConflictDoNothing()
            .returning();
          if (inserted) linked = inserted;
          else {
            // Concurrent first login won the unique identity. Remove our unused user.
            await tx.delete(users).where(eq(users.id, candidate!.id));
            [linked] = await tx
              .select()
              .from(authIdentities)
              .where(identityWhere);
          }
        }
        if (!linked) throw new Error('Identity creation failed');
        const [user] = await tx
          .update(users)
          .set({
            email: identity.email,
            name: identity.name,
            avatarUrl: identity.avatarUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, linked.userId))
          .returning();
        if (oldHash)
          await tx.delete(sessions).where(eq(sessions.tokenHash, oldHash));
        await tx.insert(sessions).values({ ...session, userId: linked.userId });
        return user!;
      });
    },
    async findSession(tokenHash: string, now = new Date()) {
      const [row] = await db
        .select({
          user: users,
          csrfToken: sessions.csrfToken,
          expiresAt: sessions.expiresAt,
        })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(
          and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)),
        );
      return row ?? null;
    },
    async logout(tokenHash: string) {
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    },
    async cleanup(now = new Date()) {
      await db
        .delete(oauthTransactions)
        .where(lte(oauthTransactions.expiresAt, now));
      await db.delete(sessions).where(lte(sessions.expiresAt, now));
    },
  };
}

export type AuthStore = ReturnType<typeof createAuthStore>;
