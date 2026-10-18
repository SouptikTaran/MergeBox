# Backend integration tests

Run `yarn test` from `backend/` using Node 22.12 or later. Tests apply the real
Drizzle migrations to an isolated PGlite PostgreSQL instance and exercise the
Express routes over HTTP. They never connect to the configured Neon database.

The Google simulator uses ephemeral RSA keys and one-use authorization codes. It
checks client credentials, redirect URI and PKCE, then serves signed ID tokens and
JWKS over HTTP. It follows Google's published OIDC token shapes; it is not an
official Google mock. No authenticated provider-owned Postman mock was available.

To run the same tests through Postman, start at the repository root:

```sh
postman simulation run postman/simulations/auth.sim.yaml --port 4900 --output ndjson
```

Then set `OAUTH_SIM_URL=http://127.0.0.1:4900/google` for `yarn test`. On PowerShell:

```powershell
$env:OAUTH_SIM_URL = 'http://127.0.0.1:4900/google'
yarn test
Remove-Item Env:OAUTH_SIM_URL
```

The simulator is local-only and intentionally issues fake identities without a
human login. Never deploy it. Real Google consent and the configured production
callback still need manual acceptance; a passing simulation is not that check.
