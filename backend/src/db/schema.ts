import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  plan: text('plan').default('free').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const authIdentities = pgTable(
  'auth_identities',
  {
    provider: text('provider').notNull(),
    subject: text('subject').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.subject] }),
    index('auth_identities_user_idx').on(table.userId),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    csrfToken: text('csrf_token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('sessions_expiry_idx').on(table.expiresAt),
    index('sessions_user_idx').on(table.userId),
  ],
);

export const oauthTransactions = pgTable(
  'oauth_transactions',
  {
    stateHash: text('state_hash').primaryKey(),
    browserHash: text('browser_hash').notNull(),
    nonce: text('nonce').notNull(),
    verifier: text('verifier').notNull(),
    intent: text('intent').default('login').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    sessionHash: text('session_hash').references(() => sessions.tokenHash, {
      onDelete: 'cascade',
    }),
    expectedSubject: text('expected_subject'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('oauth_transactions_expiry_idx').on(table.expiresAt)],
);

export const driveAccounts = pgTable(
  'drive_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    googleSubject: text('google_subject').notNull().unique(),
    email: text('email').notNull(),
    encryptedRefreshToken: text('encrypted_refresh_token').notNull(),
    scopes: text('scopes').notNull(),
    status: text('status')
      .$type<'active' | 'reconnect' | 'disconnecting'>()
      .default('active')
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('drive_accounts_user_idx').on(table.userId)],
);
