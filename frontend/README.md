# DrivePool frontend

Next.js App Router, React, TypeScript, Tailwind CSS, and official ReUI `base-nova`
components. Authentication, Drive accounts, storage, and files use the Express
backend. Workspace routes require a verified session; no sample data is displayed.

## Pages

| Route       | Purpose                                       |
| ----------- | --------------------------------------------- |
| `/`         | Live storage overview and connected drives    |
| `/files`    | Sort, filter by account, paginate, open files |
| `/drives`   | Per-drive storage and connection availability |
| `/settings` | Session status, logout and appearance         |
| `/help`     | Getting started and feature availability      |
| `/login`    | Google login                                  |
| `/signup`   | Google account creation                       |

## Structure

```text
src/app/(auth)/        Login/signup layout and thin routes
src/app/(workspace)/  Workspace layout, thin routes, loading/error states
src/components/layout/ Shared shell and page header
src/components/ui/    Registry-owned Base UI/shadcn components
src/components/reui/  Registry-owned ReUI components
src/components/examples/ Original composition references (not routed)
src/features/auth/    Typed session provider, OAuth pages, callback outcomes
src/features/drives/  Drive summaries, consent, reconnect and disconnect
src/features/files/   File grid and details
src/features/overview/ Dashboard composition
src/features/settings/ Account and theme preferences
src/features/workspace/ Live account/storage state and API types
src/lib/api/          Credentialed API client and typed errors
tests/                Browser interaction and responsive checks
```

Routes own routing/metadata; features own domain behavior; shared primitives
contain no business logic. Failed live requests show errors and retry controls.
There is no fallback to fabricated accounts, quotas or files.

## Authentication setup

Start the backend on port 8000 and configure its Google OAuth credentials.
Optionally set `NEXT_PUBLIC_API_ORIGIN` in an ignored `.env.local` (default localhost:8000).
The backend `APP_ORIGIN` must match the frontend origin.

- `GET /api/auth/google`: full browser navigation for new and returning users.
- `GET /api/auth/me`: credentialed, uncached session request.
- `POST /api/auth/logout`: credentialed request with the session's CSRF token.
- A 401 means signed out; connection failures show a retry action.
- CSRF tokens stay in memory. Secrets and database credentials stay server-side.
- OAuth outcome codes are shown once, then removed from the browser URL.

Email/password registration and password resets are not supported. Signing in
does not grant Drive access. After signing in, use **Connect drive** to open Google's
consent screen for read-only Drive metadata and offline access. Enable the Google
Drive API and register `http://localhost:8000/api/drive/oauth/callback` in addition
to the sign-in callback. Add each account to the OAuth test-user list while testing.

The workspace stays hidden until `/api/auth/me` succeeds. Anonymous users and
expired sessions return to `/login`; connection failures show Retry. Every backend
Drive endpoint independently validates the session and account ownership. Mutations
require the session's CSRF token and the allowed browser origin.

Files are owned, non-trashed My Drive items; shared-with-me and shared-drive files
are outside this version. Sorting runs across the bounded collected library,
with 50 rows rendered per page. Large first loads may take longer; snapshots
expire after five minutes and must be refreshed. Search, uploads and transfers
remain later-version work. Combined quotas exclude unknown/shared capacities.

Contracts: `../backend/openapi.yaml`; roadmap: `../docs/backend-plan.md`.

## Formatting and checks

```sh
npm run format
npm run format:check
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Prettier uses two spaces, semicolons, and a 90-character print width. Generated
registry files retain their original formatting. The registry's compiler-rule
lint exceptions are scoped to its own files; upstream warnings remain visible.
Two documented local effect exceptions cover asynchronous session fetching and
the one-time OAuth redirect URL.

Browser tests use installed Microsoft Edge and start a local dev server. They
test session guards and connected workflows against intercepted API responses.
Backend tests separately exercise real HTTP against a Google simulator and an
isolated Postgres database. Live Google consent and quota accuracy remain separate
acceptance checks. Screenshots go to `test-results/`.

## ReUI references

- [Sidebar](https://reui.io/preview/base/components/c-sidebar-1)
- [Frame](https://reui.io/preview/base/components/c-frame-1)
- [Data Grid](https://reui.io/preview/base/components/c-data-grid-1)
- [Badge](https://reui.io/components/badge)

Installed components keep their native keyboard, focus, and motion behavior.
No extra page-entry motion is added.

## Getting Started

From `frontend`, run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
