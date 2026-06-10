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
