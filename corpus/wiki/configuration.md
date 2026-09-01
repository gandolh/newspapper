---
summary: Every env var and whether anything actually reads it, the auth variables and their strict-mode behaviour, settings precedence, and one-time setup including Playwright Chromium.
updated: 2026-08-31
---

# Configuration

## `.env`

Copy `.env.example` to `.env`. Everything has a default except the three auth
variables, which are required outside development.

| Variable | Default | Meaning |
|----------|---------|---------|
| `PORT` | `3001` | API server port. Also the origin the render browser uses for `/uploads/*` and `/assets/fonts/*`. |
| `SESSION_SECRET` | — | HMAC key for the session cookie. Min 16 chars. **Required outside development.** |
| `ADMIN_USERNAME` | — | The one account's username. Read on first boot only. **Required outside development.** |
| `ADMIN_PASSWORD` | — | That account's password, min 8 chars. Read on first boot only. **Required outside development.** |
| `NEWSPAPPER_DB_PATH` | `<repo>/data/newspapper.db` | Override the SQLite path. Tests must set it — see below. |
| `UPLOADS_DIR` | `<repo>/uploads` | Where uploaded images live. An absolute path puts the store outside the repo; a relative value resolves against the repo root, never the cwd. |
| `UPLOADS_BASE_URL` | `http://127.0.0.1:$PORT` | Origin the render browser fetches `/uploads/<ref>` from. Only needed when the renderer cannot reach the API on loopback. |
| `THEME` | `warm-industrial-1` | Default slide theme, as an env-level fallback under the DB setting. |

**`NEWSPAPPER_DB_PATH` is not optional for tests.** It exists because
`defaultDbPath()` once ignored it and every `npm test` run migrated the
developer's real database — the first entry in
[green-because-nothing-ran.md](./green-because-nothing-ran.md), and now
[a locked decision](./decisions-engineering.md#the-default-database-path-is-overridable-and-tests-must-override-it).

### Variables that read as configuration but are not

`core/src/util/config.ts` defines `loadConfig()` over
`MAX_ARTICLES_PER_SOURCE`, `USER_AGENT`, `REQUEST_TIMEOUT`, `MAX_RETRIES`,
`THEME`, `OUTPUT_DIR`, `DB_PATH` and `DEFAULT_RETENTION_DAYS`. **Nothing in the
repo calls `loadConfig()`** — it is exported from the core barrel and never
invoked, a survivor of the CLI era. Setting any of those except `THEME` (which
is separately read by `storage/settings.ts`) has no effect on the running app.
Left in place rather than described as live.

## Authentication

The app is behind [a single account](./decisions.md#access-is-behind-a-single-account).
Three variables drive it, all read at startup:

- **`SESSION_SECRET`** signs the session cookie (HMAC-SHA256). Generate one with
  `openssl rand -hex 32`. Unset in development, the server mints a random secret
  per boot and logs a warning — every session ends on restart. Unset outside
  development, **the server exits non-zero** rather than booting with a guessable
  key. Changing it signs everyone out.
- **`ADMIN_USERNAME` / `ADMIN_PASSWORD`** create the account, but **only on the
  first boot against an empty `users` table**. Editing them later does nothing;
  change the password through `POST /api/password` instead. Unset outside
  development, the server exits non-zero. Unset *in* development, it seeds
  `admin` / `newspapper-dev` and logs a warning.

"Development" means `NODE_ENV` is unset, `development`, or `test`. Anything else
— `production` above all — is strict.

Passwords are hashed with `node:crypto` scrypt (N=16384, r=8, p=1, 16-byte
random salt) and stored as `scrypt$N$r$p$salt$hash`, so the cost can be raised
later without invalidating existing accounts. No plaintext, salt, or hash is
ever logged. The rest of the posture is in
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
