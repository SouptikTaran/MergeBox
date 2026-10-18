# DrivePool frontend

Next.js App Router, React, TypeScript, Tailwind CSS, and official ReUI `base-nova`
components. Authentication uses the existing Express backend. Drive accounts,
storage, and files are explicitly labeled sample data until their APIs exist.

## Pages

| Route       | Purpose                                          |
| ----------- | ------------------------------------------------ |
| `/`         | Storage overview, drives, recent files           |
| `/files`    | Search, sort, paginate, inspect sample files     |
| `/drives`   | Per-drive storage and connection availability    |
| `/settings` | Session status, logout, appearance, preview mode |
| `/help`     | Getting started and feature availability         |
| `/login`    | Google login                                     |
| `/signup`   | Google account creation                          |

## Structure

```text
src/app/(auth)/        Login/signup layout and thin routes
src/app/(workspace)/  Workspace layout, thin routes, loading/error states
src/components/layout/ Shared shell and page header
src/components/ui/    Registry-owned Base UI/shadcn components
src/components/reui/  Registry-owned ReUI components
src/components/examples/ Original composition references (not routed)
src/features/auth/    Typed session provider, OAuth pages, callback outcomes
src/features/drives/  Drive summaries and connection dialog
src/features/files/   File grid and details
src/features/overview/ Dashboard composition
src/features/settings/ Account and theme preferences
src/features/workspace/ Preview state, types, and isolated fixtures
src/lib/api/          Credentialed API client and typed errors
tests/                Browser interaction and responsive checks
```

Routes own routing/metadata; features own domain behavior; shared primitives
contain no business logic. Replace the isolated preview fixtures with typed
adapters when Drive contracts exist. Never silently substitute fixtures for
failed live requests.

## Authentication setup

Start the backend on port 8000 and configure its Google OAuth credentials.
Optionally copy `.env.example` to `.env.local` to set `NEXT_PUBLIC_API_ORIGIN`.
The backend `APP_ORIGIN` must match the frontend origin.

- `GET /api/auth/google`: full browser navigation for new and returning users.
- `GET /api/auth/me`: credentialed, uncached session request.
- `POST /api/auth/logout`: credentialed request with the session's CSRF token.
- A 401 means signed out; connection failures show a retry action.
- CSRF tokens stay in memory. Secrets and database credentials stay server-side.
- OAuth outcome codes are shown once, then removed from the browser URL.

Email/password registration and password resets are not supported. Signing in
does not grant Drive access. The public workspace is an explicit preview, not
private data behind a missing auth guard. Add route/session guards and backend
ownership checks before exposing live Drive records.

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
test the preview UI without simulating a successful Google login; real Google
OAuth acceptance remains a separate check. Screenshots go to `test-results/`.

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
