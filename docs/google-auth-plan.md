# DrivePool Google authentication plan

Draft v0.1 · October 18, 2026

The backend owns OAuth code exchange, identity verification, sessions, and Drive
credentials. The browser receives an opaque session cookie and safe user/account
data. App login and adding a Drive account are separate operations. This plan is
the specification for the backend feature. Sign-in and local sessions are implemented
with integration tests; real Google consent acceptance is pending. Drive linking
remains a separate feature.

## Identity and permissions

Use Google's authorization code flow with PKCE S256, one-time state, and an OIDC
nonce. Validate ID-token signature, issuer, audience, expiration, nonce, and verified
email through a maintained Google/OIDC library. Use Google's stable `sub` as the
identity key; never automatically join accounts by email. Email is display/contact
data and may change. Validate an allowed return path rather than accepting arbitrary
redirect URLs. [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)

| Operation | Requested permissions | Persistence |
| --- | --- | --- |
| Sign in | `openid email profile` | Local user, Google identity, opaque app session; no stored Google refresh token |
| Connect Drive | `openid email profile` and `https://www.googleapis.com/auth/drive.metadata.readonly` with offline access | Google subject, granted scopes, encrypted refresh token, status |
| v0.3 uploads | Incremental `drive.file` consent | New granted scope set; retain an existing refresh token if exchange omits it |
| v0.4 broad transfers | Decide permissions when transfer behavior is specified | No advance request for full Drive access |

`drive.metadata.readonly` provides whole-library metadata without file-content
downloads. It remains restricted, so it does not remove verification/assessment
work. `drive.file` alone cannot provide the full-library browser. Metadata-only
access is sufficient for the planned v0.1 list and quota requests; previews and
downloads need separate checks. [Drive scope definitions](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
and [about.get authorization](https://developers.google.com/workspace/drive/api/reference/rest/v3/about/get).

Testing-mode grants involving Drive expire after seven days. Show reconnect for
`invalid_grant`; do not repeatedly retry a revoked grant. This is separate from the
application session lifetime. [Google OAuth token expiration](https://developers.google.com/identity/protocols/oauth2/)

## Sign-in sequence

1. `GET /api/auth/google` creates a random, expiring OAuth transaction. Store the
   state hash, nonce, PKCE verifier, intent, and browser-binding hash server-side.
   Set a short-lived HttpOnly transaction cookie and redirect to Google.
2. `GET /api/auth/google/callback` checks state, expiry, browser binding, and intent;
   atomically consumes the transaction before exchanging the code. Denial and
   malformed callbacks produce safe errors without tokens or provider payloads.
3. Verify the ID token and upsert the login identity by `(provider, subject)` in a
   transaction. Create the application user only when that identity is new.
4. Rotate any previous app session. Store only the SHA-256 hash of a cryptographically
   random session token, with user ID and expiration; send the raw token in a cookie.
5. Redirect to a fixed frontend route. The frontend calls `GET /api/auth/me`.

Proposed lifetimes: OAuth transaction 10 minutes, app session 7 days with an
absolute expiry and no implicit indefinite extension. Use `HttpOnly`, `SameSite=Lax`,
`Path=/`, and `Secure` in production; use a `__Host-` cookie name under HTTPS.
For localhost only, use a separate non-Secure development cookie. Use an exact
frontend CORS allowlist with credentials, never wildcard origins. Deploy frontend
and API on the same site; cross-site hosting requires an explicit cookie/CSRF
design change. Require an Origin check and session-bound CSRF token on mutations.

## Drive connection sequence

Start from an authenticated session with CSRF protection. Bind the OAuth transaction
to its user ID, session, and `connect_drive` intent. Use account selection and offline
access; request consent when a new refresh grant is required. On callback, require
the same app session and verify the Google identity and granted scopes. Connecting
Google account B must never log the user into a different DrivePool user B.

Preserve existing refresh tokens if Google omits a replacement. If there is no
usable refresh token, do not mark the account connected; request reconnect instead.
Prevent duplicate connections using Google subject. Proposed v0.1 policy: one Google
Drive subject belongs to one DrivePool user; return a conflict if already linked
elsewhere, without disclosing the other user. Confirm that policy before team plans.

Encrypt refresh tokens using authenticated envelope encryption: a per-record data
key, KMS-wrapped key, nonce, authentication tag, and key version. Bind ciphertext to
user/account IDs as associated data. Keep decryption behind one service, redact
provider responses, and never return tokens to the frontend. Choose the KMS provider
before implementing token storage. A local test key is not production KMS.

Disconnect immediately disables account use, clears cached metadata, and attempts
provider revocation. If revocation fails transiently, retain only the encrypted
credential in a short-lived revocation queue, retry with a deadline, and disclose
pending revocation; do not claim successful revocation prematurely. Delete the
credential on success or documented retention expiry. Test Google grant revocation
effects on other scopes of the same client; application login must remain governed
by the local session rather than a Drive token. Never delete the user's Google files.
[Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)

## Planned tables

| Table | Important fields and constraints | Feature |
| --- | --- | --- |
| `users` | UUID, email, name, avatar URL, plan, timestamps | Sign-in |
| `auth_identities` | user FK, provider, subject; unique provider/subject | Sign-in |
| `sessions` | hashed token PK, user FK, expiry, created timestamp; expiry index | Sign-in |
| `oauth_transactions` | state hash PK, browser binding, nonce, verifier, intent, optional user/session binding, expiry | Sign-in |
| `drive_accounts` | user FK, unique Google subject, display email, encrypted credential and key metadata, scopes, status, quota snapshot/timestamp | Drive linking |

Delete expired transactions and sessions on a scheduled cleanup, and enforce expiry
on every read. Add quota fields with the dashboard feature. Add files, changes
cursors, jobs, and activity records only when their release introduces them.

## Proposed API contract

These routes are planned, not yet available. Finalize an OpenAPI contract alongside
each implementation. Error JSON uses `{ "error": { "code": "...", "message": "..." } }`.
OAuth callbacks redirect to a fixed frontend path with a safe outcome code.

| Route | Access | Result |
| --- | --- | --- |
| `GET /api/auth/google` | Public, rate limited | 302 to Google; transaction cookie |
| `GET /api/auth/google/callback` | Valid OAuth transaction | Session cookie plus 303 frontend redirect |
| `GET /api/auth/me` | Session | 200 safe user profile and CSRF token; otherwise 401 |
| `POST /api/auth/logout` | Session plus CSRF | Invalidate server session, clear cookie, 204 |
| `GET /api/drive/accounts` | Session | Safe account summaries, never credentials |
| `POST /api/drive/accounts/connect` | Session plus CSRF | 200 authorization URL and transaction cookie |
| `GET /api/drive/oauth/callback` | Bound OAuth transaction and session | Link account and 303 frontend redirect |
| `POST /api/drive/accounts/:id/reconnect` | Owner session plus CSRF | Authorization URL bound to the expected subject |
| `DELETE /api/drive/accounts/:id` | Owner session plus CSRF | 204 after cleanup/revocation, or 202 if revocation pending |

Return 404 for another user's account ID, 409 for a conflicting connection, and 429
for application rate limits. Use 503 for a transient provider outage. Distinguish
reconnect-needed from transient errors. Never log callback query strings, cookies,
authorization codes, PKCE verifiers, or tokens.

## Google Cloud setup for the first feature

Create an OAuth web-application client, configure the external consent screen in
Testing, and add test users. Use separate development and production credentials.
Register the exact development login callback:
`http://localhost:8000/api/auth/google/callback`.
Register `http://localhost:8000/api/drive/oauth/callback` and enable Drive API when
implementing account linking. Document exact production URLs after hosting is chosen.

Planned backend variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_ORIGIN`
(development `http://localhost:3000`), `API_ORIGIN` (development
`http://localhost:8000`), and `NODE_ENV`, in addition to the existing `DATABASE_URL`
and `PORT`. Add KMS configuration with Drive linking. Secrets belong only in ignored
`backend/.env` or the deployment secret store, not chat, Git, or frontend variables.

## Sign-in acceptance checklist

- New Google identity creates one user; repeat and concurrent callbacks cannot
  create duplicates. A changed email with the same subject still finds that user.
- Reject expired/mismatched state, replayed callback, wrong browser binding,
  invalid nonce, issuer, audience, signature, expired token, and unverified email.
- Denied consent and provider timeouts leave no authenticated session.
- Sessions survive a backend restart, expire correctly, rotate on login, and are
  invalidated by logout. Missing/expired cookies return 401.
- Logout rejects cross-origin/CSRF attacks; redirects cannot target arbitrary sites.
- Logs and all JSON responses contain no credentials. Cookies have intended flags.
- Local provider simulation covers failures; a real test user completes the exact
  Google callback on the configured app before the feature is marked live-verified.

Drive linking adds tests for two accounts, ownership isolation, missing refresh
tokens, reconnecting the wrong Google subject, denied scopes, encryption tampering,
KMS failure, revocation failure, and disconnect cleanup.
