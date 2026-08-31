---
summary: How the three npm workspaces fit together and how a post flows scrape → compose → edit → render → ZIP.
updated: 2026-08-31
---

# Architecture

## Overview

Newspapper v3 is a **monorepo web app** with three npm workspaces:

```
newspapper/          ← repo root (concurrently, vitest, ts, eslint)
  core/              ← @newspapper/core: pipeline library (Node-only)
  api/               ← @newspapper/api: Fastify HTTP server (port 3001)
  ui/                ← @newspapper/ui: Vite + React SPA (port 4321)
  assets/            ← fonts/, design-systems/, templates/
  data/              ← sources.json, prompt.md, newspapper.db (gitignored)
  output/            ← rendered slide images per run (gitignored)
  uploads/           ← originals/ + normalized/ image store (gitignored, UPLOADS_DIR)
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
- **uploads** — image store paths, ref generation, Sharp normalization (`saveUpload`, `deleteUpload`, `resolveUploadSrc`)

### `api/` — Fastify server

Thin HTTP layer over `@newspapper/core`. Registers route plugins for every feature area. Uses SSE for long-running operations (scrape, compose, render). Serves:
- `/api/*` — all endpoints
- `/assets/fonts/*` — Inter TTF files (for `renderTemplate` font-face URLs)
- `/output/*` — rendered slide images
- `/uploads/<ref>` — uploaded images; public, so headless Chromium can fetch them mid-render
- `/` — `ui/dist/` (prod only, when built)

### `ui/` — Vite + React

A **single-page app**: one `index.html`, one bundle, one React root in `src/main.tsx`. Astro was removed in brief 70 — every island was `client:load`, so there was no partial hydration to lose, and the app is entirely behind auth with no SEO surface. `vite.config.ts` carries the `@/*` → `ui/src/*` alias and proxies `/api`, `/output`, `/uploads` and `/assets` to port 3001 in dev. The bundle is emitted to `ui/dist/_bundle/` rather than the Vite default `dist/assets/`, because the API already serves the repo's own `assets/fonts/` at that prefix.

Routing is hand-rolled in `src/router.tsx` — about 90 lines over `useSyncExternalStore` and `history.pushState`. Six routes with no params, no nested layouts and no data loaders did not justify React Router, and several islands navigate with `window.location.assign` while the editor writes `?post=` with its own `replaceState`; a router that owned history would fight both.

The page map is in `src/routes.tsx`:

| Route | Sheet |
|---|---|
| `/` | editor (fluid width) |
| `/posts` | post list |
| `/articles` | article search / library / sources |
| `/settings` | theme default + password |
| `/login` | sign-in — the only route outside the board |
| `/history` | redirect to `/posts` (kept from brief 62) |
| `/kitchen-sink` | the proof sheet — **dev only**, see below |

Every route but `/login` renders inside **one `<App>` element at one position** in `routes.tsx`. That is load-bearing: React keeps an element's instance while its type and position hold, so `layouts/App.tsx` and the `components/Sidebar.tsx` tray inside it survive a navigation that only swaps `children`, and the tray's health probe never restarts. This replaced Astro's `<ClientRouter />` plus `transition:persist="sidebar"` — the persistence is now structural rather than a directive. If a route component ever renders its own `<App>` again, the tray silently starts remounting on every click.

`/kitchen-sink` is gated by the `proofSheet` plugin in `vite.config.ts`, which serves `virtual:proof-sheet` as a re-export of the proof page under `vite dev` and as `export default null` under `vite build`. It has to be structural rather than an `import.meta.env.DEV` branch: `KitchenSinkIsland` imports a stylesheet, so dead-code elimination would drop the component but keep its CSS. Brief 69 has the reasoning for why the proof sheet must not ship — it is the one page that renders with no session at all.

Interactive UI is built from the `components/ui/` primitive library, which wraps `@base-ui/react`. See [design-systems.md](./design-systems.md) for the component conventions.

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
