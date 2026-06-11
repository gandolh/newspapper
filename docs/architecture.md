# Architecture

## Overview

Newspapper v3 is a **monorepo web app** with three npm workspaces:

```
newspapper/          ← repo root (concurrently, vitest, ts, eslint)
  core/              ← @newspapper/core: pipeline library (Node-only)
  api/               ← @newspapper/api: Fastify HTTP server (port 3001)
  ui/                ← @newspapper/ui: Astro + React islands (port 4321)
  assets/            ← fonts/, design-systems/, templates/
  data/              ← sources.json, prompt.md, newspapper.db (gitignored)
  output/            ← rendered PNGs per run (gitignored)
  plans/swarm/       ← agent build plans (reference only)
```

## Workspaces

### `core/` — pipeline library

Pure library: no HTTP, no side effects at import time. Exports:
- **templates** — JSON TemplateDoc registry + HTML interpreter (`renderTemplate`, `resolveStyle`)
- **render** — Playwright screenshot pipeline (`renderSlides`, `zipRun`)
- **compose** — Ollama client + JSON parser + `composePost`, `slideAi`, `generateCaption`
- **scrape** — RSS + body fetch, article deduplication into SQLite
- **storage** — SQLite CRUD for `articles`, `posts`, `settings`; sources.json + prompt.md helpers
- **themes** — JSON design-system loader (`loadTheme`, `listThemes`)

### `api/` — Fastify server

Thin HTTP layer over `@newspapper/core`. Registers route plugins for every feature area. Uses SSE for long-running operations (scrape, compose, render). Serves:
- `/api/*` — all endpoints
- `/assets/fonts/*` — Inter TTF files (for `renderTemplate` font-face URLs)
- `/output/*` — rendered PNGs
- `/` — `ui/dist/` (prod only, when built)

### `ui/` — Astro + React

Static Astro site with React islands for interactive pages. Dev proxy sends `/api/*` to port 3001.

Pages: `/` (wizard), `/history`, `/sources`, `/settings`, `/prompt`, `/builder`.

Every page mounts Astro's `<ClientRouter />` for crossfade navigation and renders the shared `components/Sidebar.astro` nav rail (`transition:persist`). Interactive UI is built from the `components/ui/` primitive library, which wraps `@base-ui/react`. See `docs/design-systems.md` for the component conventions.

## Pipeline

```
POST /api/scrape (SSE)
  → fetchFeed() per source
  → fetchBody() per article
  → upsertArticles() → SQLite articles

POST /api/compose (SSE)
  → getArticlesByIds()
  → composePost(articles, ollama) → PostPayload JSON
  → createDraft() → SQLite posts

PUT /api/posts/:id  (edit slides)
POST /api/slide-ai  (AI edit single slide)
POST /api/posts/:id/caption

POST /api/posts/:id/render (SSE)
  → loadTemplate(theme, variant) per slide
  → renderTemplate(doc, data, theme, {fontBaseUrl})  → HTML string
  → renderSlides(htmlList) via Playwright Chromium → PNG files
  → markRendered() → output/YYYY-MM-DD-N/

GET /api/posts/:id/export.zip
  → zipRun(outputDir) → fflate ZIP
```

## SSE protocol

Long-running POST endpoints stream Server-Sent Events:

```
event: progress
data: {…}

event: done
data: {…}

event: error
data: {"message": "…"}
```

The UI reads these with `fetch()` (not `EventSource`) and parses lines manually.

## Key constraints

- **Satori/resvg removed.** Rendering is Playwright Chromium screenshot of HTML produced by the template interpreter.
- **ESM throughout.** All workspaces use `"type": "module"`. Paths are resolved from `import.meta.url` not `process.cwd()`.
- **CWD-independent paths.** `assets/`, `data/`, `output/` are resolved relative to `__filename` (4 levels up from any core/src/*/*.ts file).
- **No cloud services** except Ollama Cloud (optional Bearer token).
