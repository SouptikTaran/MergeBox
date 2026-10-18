# Mergebox

Version `0.0.0` baseline with an Express backend and a Next.js frontend.

## Backend

```sh
cd backend
yarn install
yarn dev
```

Runs at http://localhost:8000. `GET /hello` logs the request and returns
`{"message":"Hello World!"}`.

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
