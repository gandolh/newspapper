---
summary: Every env var and the code that reads it, how .env reaches process.env at all, the accounts and Ward sign-in variables (and what an unset issuer means), the session cookie's Path, settings precedence, and one-time setup including Playwright Chromium.
updated: 2026-10-13
---

# Configuration

## `.env`

Copy `.env.example` to `.env`. Everything has a default. "Sign in with Ward" is
optional: with `WARD_OIDC_ISSUER` unset the app runs on local accounts alone.

| Variable | Default | Meaning |
|----------|---------|---------|
| `PORT` | `3001` | API server port. Also the origin the render browser uses for `/uploads/*` and `/assets/fonts/*`. |
| `NEWSPAPPER_BASE` | `/` | Where the app is served from (`/newspapper/`). Baked into the UI bundle at build time **and read by the API at runtime** for the session cookie's `Path` ([below](#the-session-cookie-and-the-callback-path)). Unset, it is read back from `WARD_OIDC_REDIRECT_URI`. |
| `PUBLIC_ORIGIN` | origin of `WARD_OIDC_REDIRECT_URI`, else `http://localhost:4321` | The app's own origin, no path. Decides the cookie's `Secure` flag and what a browser's `Origin` must be on sign-in POSTs. |
| `WARD_OIDC_ISSUER` | — | Ward's issuer, ending in `/oidc`. Unset means no Ward button. Set, the next three are **required** and the boot throws naming the missing one. |
| `WARD_OIDC_CLIENT_ID` | — | This app's slug at Ward (`newspapper`). |
| `WARD_OIDC_CLIENT_KEY` | — | This app's Ed25519 private key, base64url of a JWK. **A secret.** A bad key fails at boot; Ward is **not** contacted at boot. |
| `WARD_OIDC_REDIRECT_URI` | — | The callback as the browser reaches it: `<origin><base>/api/auth/ward/callback`. Must match Ward's registration exactly. |
| `WARD_OIDC_POST_LOGOUT_REDIRECT_URI` | — | Optional. Where Ward returns after "sign out of Ward too"; registered at Ward. |
| `SEED_USERNAME`, `SEED_PASSWORD`, `SEED_ROLE` | role `editor` | Read **only** by `npm run seed --workspace=api`. Set in the shell, never in a file in the repo. |
| `NEWSPAPPER_DB_PATH` | `<repo>/data/newspapper.db` | Override the SQLite path. Tests must set it — see below. |

## Authentication

**Newspapper has its own accounts, and Ward is a second way in.** Users, scrypt
password hashes and opaque server-side sessions live in the app's SQLite file
(`auth_users`, `auth_sessions`, `auth_ward_links`, `auth_migrations`), created
by the shared library's own migrations when the API boots. The library is
vendored at `api/vendor/ward/` (server bundle) and `ui/vendor/ward/` (React
hooks), version 0.2.0; neither copy is ever edited. The wiring is
`api/src/ward/`: `auth.ts` registers the plugin, `config.ts` holds the paths,
`ward.guard.ts` decides which routes need a session.

- **There is no register page.** An account comes from the seed script
  (`npm run seed --workspace=api`, which never resets an existing account) or
  from a first Ward sign-in, which creates a local user linked to that Ward
  account.
- **Local sign-in never calls Ward**, so it works while Ward is down. A session
  that began with Ward is re-checked against Ward at most every 30 seconds; a
  Ward that cannot answer refuses it with `ward_unavailable` and the person signs
  in with their password.
- **Lockout** is the library's: five failures from one address, keyed on the
  address and never the username, so a stranger cannot lock the owner out.
- **Authority is the role in the app's own row.** Ward's grant decides only
  whether a Ward account may get in, and gives a **new** user their first role.
  Any role opens this single-editor app; a Ward account with no grant sees
  `access_denied` on the login page.
- Settings can link Ward, unlink it (refused until the user has a local
  password), set a first local password for a Ward-only user, change it, and
  sign out of Ward too.

### The session cookie and the callback path

The proxy (the dev server, and Caddy's `handle_path`) strips only the base, so
the browser's `/newspapper/api/auth/login` reaches Fastify as `/api/auth/login`.
That fixes two values, in development and in the deploy alike:

- `routePrefix` is **`/api/auth`**, not the library's default `/auth`.
- `cookiePath` is the **base** (`/newspapper`), not the API prefix. The editor and
  the posts list load `/output/*` and `/uploads/*` as `<img>` sources, beside
  `/api` and guarded; a cookie scoped to `/newspapper/api` would never reach them
  and every thumbnail would 401. `fastify.inject` ignores cookie paths, so no
  test can show this: it is a rule in `api/src/ward/config.ts` and a test of the
  value there. The library's boot check keeps the callback under the cookie path.

`NEWSPAPPER_BASE` therefore has to be in the **container's** environment in a
sub-path deploy, not only exported for the build.

## Settings precedence

`DB > env vars > hard-coded defaults`

There is exactly **one** setting: `defaultTheme`, which the editor uses for a new
post. Its env fallback is `THEME` and its default is `warm-industrial-1`. Write
it through `PUT /api/settings` or the Settings page, and the DB value wins from
then on.

## Playwright Chromium

The render pipeline requires Playwright's bundled Chromium, and it is **not**
part of `npm install`:

```bash
npx playwright install chromium
```

Without it, rendering fails and three test files skip their pixel assertions
with a loud banner (and fail outright under `CI`).

## One-time setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
npm run dev
```

Open `http://localhost:4321/newspapper/`, sign in, and you are on the editor with
a starter document already loaded. Signing in needs a Ward: see below.

### Local sign-in

Local dev is laid out like the deploy ([decision](./decisions-accounts.md)). The
UI dev server serves the app under `/newspapper/` and proxies the API's paths
(`/newspapper/api`, `/output`, `/uploads`, `/assets`) to `:3001` with the prefix
stripped, the way Caddy's `handle_path` does. The sign-in routes are the API's
own, so they ride that proxy, callback included. There is **no `/ward` proxy**:
"Sign in with Ward" sends the browser to Ward's own origin.

1. Create a local account: `SEED_USERNAME=... SEED_PASSWORD=... npm run seed
   --workspace=api`. The login page signs it in with Ward stopped.
2. For the Ward button, run Ward's container
   (`../wzd_auth/infrastructure/local`); its `seed.mjs` registers newspapper as a
   client, grants your account, and writes the five `WARD_OIDC_*` values into
   `.env`. Without them the API boots and the login page simply has no button.

## External services

Two, and only two: the RSS feeds you configure, and, optionally, **Ward**, the
estate's identity service, which newspapper calls for "Sign in with Ward" and the
30-second check on Ward-originated sessions, authenticating with its own
`WARD_OIDC_CLIENT_KEY`. There is no LLM provider, no cloud storage and no telemetry.
An Ollama-only `docker-compose.yml` survived here until 2026-08-31; it was dead weight <!-- lint-ok -->
from v3 and nothing starts or contacts it — see
[status.md](./status.md#known-strays).
