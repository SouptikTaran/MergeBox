# Mergebox

Version `0.0.0` baseline with an Express backend and a Next.js frontend.

DrivePool v0.1 planning: [backend release plan](docs/backend-plan.md) and
[Google authentication plan](docs/google-auth-plan.md). Complete and commit one
feature at a time; push when the full version passes its release gates.

## Backend

```sh
cd backend
yarn install
yarn dev
```

Runs at http://localhost:8000. `GET /hello` logs the request and returns
`{"message":"Hello World!"}`.

### Google sign-in

Use Node 22.12 or later. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`APP_ORIGIN`, and `API_ORIGIN` in `backend/.env` using `.env.example`. Register
`http://localhost:8000/api/auth/google/callback` as an authorized redirect URI on
a Google OAuth **Web application** client. Keep frontend and backend on the same
site in production; origins must use HTTPS there.

For Drive linking, enable the Google Drive API and register the additional callback
`http://localhost:8000/api/drive/oauth/callback`. Add the restricted
`drive.metadata.readonly` permission to the consent configuration and add test users.
Configure `TOKEN_ENCRYPTION_KEY` with a base64-encoded 32-byte random key. Preserve
it across deployments; it is needed to decrypt existing connected-account tokens.
No Google KMS is used. Call `POST /api/drive/accounts/connect` with the session,
Origin, and CSRF header, then navigate to the returned `authorizationUrl`.
`GET /api/drive/accounts` returns safe account summaries.
`DELETE /api/drive/accounts/:id` disables access immediately and revokes the grant.
A 202 response means revocation is pending: the backend retries every minute and
retains encrypted credentials for at most 24 hours, then removes them even if Google
is unavailable. Users can also revoke access directly in Google Account settings.
An expired/revoked refresh token changes the account status to `reconnect`.

Run `yarn db:migrate` from `backend/`, then `yarn dev`. Open
`http://localhost:8000/api/auth/google` to sign in. The callback returns to the
frontend root with an `auth` outcome. Browser API calls must use
`credentials: 'include'`. `GET /api/auth/me` returns the profile and CSRF token;
send that token as `X-CSRF-Token` on `POST /api/auth/logout` from `APP_ORIGIN`.

See [the API contract](backend/openapi.yaml) and [integration test instructions](backend/test/README.md).
Sessions expire after seven days. Expired sessions and OAuth transactions are
cleaned every 15 minutes while the backend runs. Rate limiting currently uses
process memory and assumes the API is directly reachable; configure a trusted
proxy and shared rate-limit store before a multi-instance production deployment.

## Database (Neon + Drizzle)

The backend uses Drizzle ORM with a shared PostgreSQL connection pool.
Fill in `backend/.env` using `backend/.env.example` as a reference.
The root `.env` is not loaded by the backend.

- `DATABASE_URL`: Neon connection URL, including `sslmode=require`, used by the
  application, migrations, and Drizzle Studio.
- `PORT`: backend port, default 8000.

Use a development Neon branch for setup. Keep credentials in the ignored `.env`.
From `backend/`, run:

```sh
yarn install
yarn db:check
yarn dev
```

`db:check` executes a read-only connectivity query and requires a valid
`DATABASE_URL`. Product tables and migrations will be added feature by feature.
The uncommitted notes example and its draft migration have been removed. This
cleanup does not alter an existing remote database.

Define tables in `src/db/schema.ts`, run `yarn db:generate`, review the SQL in
`drizzle/`, then run `yarn db:migrate`. Commit SQL and metadata together.
`yarn db:studio` opens the database browser. Standalone scripts should call
`closeDatabase()` from `src/db/index.ts` when finished. The helpers are server-side;
no public database routes are exposed.

References: [Neon + Drizzle](https://neon.com/docs/guides/drizzle) and
[Drizzle PostgreSQL setup](https://orm.drizzle.team/docs/get-started/postgresql-new).

## Frontend

```sh
cd frontend
npm install
npm run dev
```

Runs at http://localhost:3000. Uses TypeScript, App Router, Tailwind CSS, and ESLint.

## Checks

Run `yarn build` in `backend`. Run `npm run lint` and `npm run build` in `frontend`.
