---
summary: Every env var and the code that reads it, how .env reaches process.env at all, the auth variables and their strict-mode behaviour, settings precedence, and one-time setup including Playwright Chromium.
updated: 2026-09-01
---

# Configuration

## `.env`

Copy `.env.example` to `.env`. Everything has a default except the three auth
variables, which are required outside development.

| Variable | Default | Meaning |
|----------|---------|---------|
| `PORT` | `3001` | API server port. Also the origin the render browser uses for `/uploads/*` and `/assets/fonts/*`. |
| `WARD_PUBLIC_ORIGIN` | — | Ward's public origin, and the exact `iss` on every access token. Bare origin, no trailing slash. **Required.** |
| `WARD_API_BASE_PATH` | — | Ward's prefix behind Caddy: `/ward-api`. **Required, and deliberately undefaulted** — an empty value resolves the JWKS to a path nothing serves, so every token would be rejected. |
| `WARD_APP_KEY` | — | Newspapper's own Ward service key. **A secret.** Issued from Ward's console, shown once, not readable back. **Required.** |
| `NEWSPAPPER_DB_PATH` | `<repo>/data/newspapper.db` | Override the SQLite path. Tests must set it — see below. |
| `UPLOADS_DIR` | `<repo>/uploads` | Where uploaded images live. An absolute path puts the store outside the repo; a relative value resolves against the repo root, never the cwd. |
| `UPLOADS_BASE_URL` | `http://127.0.0.1:$PORT` | Origin compiled slides resolve `/uploads/<ref>` against. Since the Ward cutover the render browser does not fetch it — `core/src/render/uploads-route.ts` intercepts and serves from disk — but the URL still has to be well-formed. |
| `THEME` | `warm-industrial-1` | Default slide theme, as an env-level fallback under the DB setting. |

**`NEWSPAPPER_DB_PATH` is not optional for tests.** It exists because
`defaultDbPath()` once ignored it and every `npm test` run migrated the
developer's real database — the first entry in
[green-because-nothing-ran.md](./green-because-nothing-ran.md), and now
[a locked decision](./decisions-engineering.md#the-default-database-path-is-overridable-and-tests-must-override-it).

**The table above is the whole list.** Every row names code that reads it:

| Variable | Read by |
|----------|---------|
| `PORT` | `api/src/server.ts`, `api/src/routes/render.ts`, `core/src/uploads/index.ts` |
| `WARD_PUBLIC_ORIGIN` / `WARD_API_BASE_PATH` / `WARD_APP_KEY` | `api/src/ward/config.ts` |
| `NEWSPAPPER_DB_PATH` | `core/src/storage/db.ts`, `api/src/lib/db.ts` |
| `UPLOADS_DIR` | `core/src/uploads/store.ts` |
| `UPLOADS_BASE_URL` | `core/src/uploads/index.ts` |
| `THEME` | `core/src/storage/settings.ts` |

### How `.env` reaches `process.env`

`core/src/util/config.ts` is the only `dotenv` call site in the repo. It exports
nothing — it just runs `import 'dotenv/config'` — and `core/src/index.ts` pulls
it in as a side effect, which is how `api` gets it: every `api` module imports
that barrel. Delete either half and `.env` stops being read, silently, on
defaults, with no error. `core/src/util/config.test.ts` fails if either half
goes.

Until brief 73 that file also exported `loadConfig()`, a CLI-era survivor called
nowhere, over seven variables — `MAX_ARTICLES_PER_SOURCE`, `USER_AGENT`,
`REQUEST_TIMEOUT`, `MAX_RETRIES`, `OUTPUT_DIR`, `DB_PATH`,
`DEFAULT_RETENTION_DAYS` — that nothing consulted. **They were settable and
inert**, the shape catalogued in
[green-because-nothing-ran.md](./green-because-nothing-ran.md). The function and
the variables are gone; the `.env` side effect was the only live part and
stayed. There is no `Config` object: each consumer reads the one variable it
needs, where it needs it.

## Authentication

**Newspapper authenticates nobody.** Identity is
[Ward's](../../../wzd_auth/corpus/wiki/overview.md), the estate's identity
service: the browser holds a `ward_session` cookie for the whole origin, and
newspapper verifies it locally then asks Ward whether the session is still
live. There is no account, no password hash, no session secret and no login
page in this repo.

Three variables drive it, all required, all read while the guard is being
registered — so a missing one stops the boot before the server listens:

- **`WARD_PUBLIC_ORIGIN`** is Ward's origin *and* the exact `iss` compared on
  every token.
- **`WARD_API_BASE_PATH`** is `/ward-api`. It has **no default on purpose**: an
  empty value resolves the JWKS to `<origin>/.well-known/jwks.json`, a path
  nothing serves, and newspapper would reject every token with a clean log.
- **`WARD_APP_KEY`** is newspapper's own service key, sent as `x-ward-app-key`
  on every introspection. It is a **secret**, issued from Ward's console, shown
  once and not readable back; Ward refuses unkeyed calls, so a missing or
  revoked key is a total outage rather than a degraded mode. `@ward` surfaces
  that as a distinct error naming this variable, so it cannot be mistaken for
  Ward being down.

Authority is a **grant**, not an account: a live Ward session holding no
`newspapper` grant gets a **403**, not a 401, because signing in again cannot
fix it. Ward being unreachable is a **503** and fails closed — never a 401,
which would send somebody to a login page served by the service that is down.

`SESSION_SECRET`, `ADMIN_USERNAME` and `ADMIN_PASSWORD` are gone, along with
the scrypt hashing, the `users` table and the IP-keyed lockout. The lockout was
not retuned but removed: there is no credential here to brute-force, and login
is Ward's, which has its own budget — the right place for it, since a per-app
counter would have guarded one of six front doors to the same accounts. The
rest of the posture is in
[decisions-security.md](./decisions-security.md).

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
# fill in SESSION_SECRET / ADMIN_USERNAME / ADMIN_PASSWORD, or leave them
# blank and use the development defaults
npm run dev
```

Open `http://localhost:4321`, sign in, and you are on the editor with a starter
document already loaded.

## No external services

Newspapper talks to nothing but the RSS feeds you configure. There is no LLM
provider, no cloud storage, no telemetry, and no API key of any kind.
An Ollama-only `docker-compose.yml` survived here until 2026-08-31; it was dead weight <!-- lint-ok -->
from v3 and nothing starts or contacts it — see
[status.md](./status.md#known-strays).
