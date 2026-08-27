---
summary: Every env var, where settings come from and which source wins, and the Playwright Chromium install step.
updated: 2026-08-28
---

# Configuration

## `.env`

Copy `.env.example` to `.env`. All variables have defaults; override only what you need.

| Variable | Default | Meaning |
|----------|---------|---------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API base URL. Use `https://ollama.com` for Ollama Cloud. |
| `OLLAMA_API_KEY` | `""` | Bearer token for Ollama Cloud only. Leave empty for local. |
| `OLLAMA_MODEL` | `llama3.2:1b` | Model name. Larger models produce better results. |
| `PORT` | `3001` | API server port. |
| `NEWSPAPPER_DB_PATH` | auto (repo root) | Override the SQLite path (mainly for tests). |
| `UPLOADS_DIR` | `<repo>/uploads` | Where uploaded images live. Absolute paths put the store outside the repo; a relative value resolves against the repo root, never the cwd. |
| `UPLOADS_BASE_URL` | `http://127.0.0.1:$PORT` | Origin the render browser fetches `/uploads/<ref>` from. Only needs setting when the renderer cannot reach the API on loopback. |
| `SESSION_SECRET` | — | HMAC key for the session cookie. Min 16 chars. **Required outside development.** |
| `ADMIN_USERNAME` | — | The one account's username. Read on first boot only. **Required outside development.** |
| `ADMIN_PASSWORD` | — | That account's password, min 8 chars. Read on first boot only. **Required outside development.** |

## Authentication

The app is behind [a single account](./decisions.md). Three variables drive it,
all read at startup:

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
ever logged.

## Settings precedence

`DB > env vars > hard-coded defaults`

Settings stored via `PUT /api/settings` (or the UI Settings page) take precedence over `.env`. This lets you configure Ollama through the browser without editing files.

## Ollama setup

### Local (default)

```bash
# Run Ollama natively
ollama serve

# or via Docker Compose
docker compose -f infra/docker-compose.yml up -d

# Pull the default model
ollama pull llama3.2:1b
```

### Ollama Cloud

Set in `.env` or via the Settings UI:
```
OLLAMA_HOST=https://ollama.com
OLLAMA_API_KEY=<your-key>
OLLAMA_MODEL=<pick from GET /api/models>
```

## Playwright Chromium

The render pipeline requires Playwright's bundled Chromium. Install once:

```bash
npx playwright install chromium
```

This is not included in `npm install` — it must be run separately. The `playwright` package itself is listed as a dependency in `@newspapper/core`.

## One-time setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
# edit .env if needed
ollama pull llama3.2:1b
npm run dev
```

Open `http://localhost:4321` in a browser.
