# DrivePool backend release plan

Draft v0.1 · October 18, 2026

DrivePool connects multiple Google Drive accounts to one application user, shows
their files and storage together, then adds search, uploads, and safe transfers
over successive releases. This is the backend implementation plan for the supplied
PRD. The working product name is DrivePool; the repository remains MergeBox.

## Stack and delivery rules

Keep Express 5 and TypeScript, Neon PostgreSQL, and Drizzle ORM. The existing
Next.js frontend consumes the backend. Use only `DATABASE_URL` for the application
and Drizzle tooling. Introduce Redis and workers with v0.2, when persistent sync
jobs become necessary. Hosting and domain remain undecided. Refresh tokens use
AES-256-GCM with a server-side environment key; no Google KMS integration.

Complete and test one feature, update its checklist, then create one focused
commit. Include schema migrations, API contracts, tests, and documentation with
the feature that needs them. Never commit credentials or mark live acceptance
passed based only on mocks. Keep work local until a version is complete; then
update package versions, tag the release, and push the commits and tag to origin.
Do not push unfinished versions or bundle later releases into v0.1.

The product release includes frontend integration and live acceptance. A completed
backend alone does not satisfy the PRD's tester or dashboard exit criteria.

## v0.1 Connect and see

Google sign-in is the initial login method; email/password login is deferred.
Signing in does not automatically grant Drive access. A signed-in user can link
their login account or another Google account explicitly.

| Order | Feature and PRD IDs | Completion evidence | State |
| --- | --- | --- | --- |
| 0 | Database foundation and remove notes example | Shared Drizzle client, single URL, read-only check, successful build | Implemented locally |
| 1 | Google sign-in and sessions, 0.1-1 | New and returning users, logout, expired session, rejected callback replay and invalid identity | Implemented; 20 local integration tests pass; real Google acceptance pending |
| 2 | Connect multiple Drive accounts, 0.1-2, 0.1-3, 0.1-7 | Two distinct accounts attached to one user, encrypted refresh tokens, ownership checks, denied consent | Implemented; local integration tests pass; live consent pending |
| 3 | Disconnect and reconnect, 0.1-3, 0.1-8 | Revocation, local metadata cleanup, missing/expired refresh token, repeat disconnect | Implemented; local integration tests pass |
| 4 | Per-account and combined storage, 0.1-4 | Byte-accurate quota parsing, unknown limits, shared quota exclusions, partial failures | Planned |
| 5 | Unified files and Drive links, 0.1-5, 0.1-6 | Global sorting across paginated accounts, filters, links, no cross-user exposure | Planned |
| 6 | Release integration and privacy, 0.1-7 | Privacy notice, redacted logs, real two-account flow, frontend integration, release checklist | Planned |

For each API feature, define the request/response contract before implementation.
Use bounded pagination, consistent error codes, and ownership checks at the data
access layer. Return large byte counts as decimal strings to avoid JavaScript
integer precision loss. Tests should cover failure paths as well as success.

The v0.1 file browser uses live Drive requests with bounded caching. A global sort
must merge sorted streams from each account and retain each upstream cursor and
unused page items; sorting only the currently fetched pages is incorrect. Bind
opaque cursors to the user, account selection, sort, and expiration. Return
per-account errors with partial results, never present an incomplete list as full.
Keep persistent file indexing for v0.2. Start with owned My Drive files; shared
drives and shared-with-me files need a separate product decision and labeling.

Quota handling: use `storageQuota.usage` for total usage and `usageInDrive` for
Drive-specific usage. Calculate free bytes only for known finite limits. Google
may report organization-wide limits and usage for pooled Workspace storage;
do not sum such quotas as independent capacity. Until those pools can be
identified reliably, exclude unverified work-account quotas from the combined
personal total and label the limitation. Do not assume every account has 15 GB.
[Google quota fields](https://developers.google.com/workspace/drive/api/reference/rest/v3/about)

Release gates: all v0.1 features and integration tests pass; 50 testers connect at
least two accounts; finite personal quotas are within 1% of Google's numbers at
comparable timestamps. Record unknown/shared quotas separately. Reconnect handling
is promoted from Should to Must because testing-mode Drive grants expire.

## Later releases

| Release | Backend scope | Exit evidence |
| --- | --- | --- |
| v0.2 | Metadata index, initial crawl and changes cursor, retryable per-account queues, search, largest files, sync state/manual refresh; optional folder view and previews | 50k-file initial sync under 15 minutes; search p95 under 500 ms; sync success above 99% |
| v0.3 | Resumable uploads, capacity-aware routing, progress/pause/resume/retry, destination folders, low-space warnings | Correct placement, interruption recovery, capacity races handled; re-consent for upload scope |
| v0.4 | Duplicate candidates, verified cross-account transfers, trash/undo, bulk confirmations, activity log, rebalance suggestions | No source trashing without verified destination; failures are recoverable; native-file and permission behavior tested |
| v1.0 | OAuth verification/security assessment as applicable, billing and limits, data export/deletion, production monitoring, onboarding and legal documents | Verified production OAuth, end-to-end paid/free limits, deletion/export, incident and restore procedures |
| v1.x | Other providers, automation, teams, mobile/extension, optional chunked storage research | Separate scoped PRDs |

Keep folders identified by account and Drive ID even if a future UI merges display
paths. Names are not unique identifiers. Checksums do not cover every Google file
type. For native Docs/Sheets/Slides, investigate permitted copy/export behavior
before implementation; the PRD's blanket impossibility statement is not a settled
API constraint. Export changes format and can lose features. Trash is recoverable
but may still consume quota, so do not promise immediate space reclamation.

The proposed free tier of two accounts is a v1.0 billing decision; avoid enforcing
it during multi-account MVP validation. The supplied solo/small-team timeline is
an estimate: v0.1 3–4 weeks, v0.2 4–5, v0.3 3–4, v0.4 5–6, v1.0 6–8. Treat OAuth
review timing and test-user acquisition as external dependencies.

## Immediate next feature

Implement Google sign-in and server sessions according to
[the Google authentication plan](google-auth-plan.md). Finish that feature's
contract, schema, tests, and live callback verification before marking it done.
Drive scopes, refresh-token persistence, and Drive API calls arrive in feature 2.
