---
summary: How the three npm workspaces fit together, the SPA's routing and its load-bearing single-App rule, and how a post flows write → compile → render → publish/ZIP.
updated: 2026-08-31
---

# Architecture

## Overview

A **monorepo web app** with three npm workspaces and no CLI:

```
newspapper/          ← repo root (concurrently, vitest, tsc, eslint, prettier)
  core/              ← @newspapper/core: the library (Node-only, except the compiler)
  api/               ← @newspapper/api: Fastify HTTP server (port 3001)
  ui/                ← @newspapper/ui: Vite + React SPA (port 4321)
  assets/            ← design-systems/ (slide themes), fonts/ (Inter, for the renderer)
  data/              ← newspapper.db (gitignored); sources.json is a one-time seed
  output/            ← rendered slide images per run (gitignored)
  uploads/           ← originals/ + normalized/ image store (gitignored, UPLOADS_DIR)
  plans/swarm/       ← v2 reference material only
```

Dependency direction is one way: `ui → api → core`. `core` imports neither.

## Workspaces

### `core/` — the library

No HTTP, no side effects at import time. Four entry points — `.`, `./templates`,
`./publish`, `./wizard` — and these modules:

- **wizard** — the `.wzd` language: `parse`, `format`, `lint`, `compileDocument`,
  and `WZD_COMPONENTS`, the catalogue the compiler, linter and editor all read
  instead of restating. **Browser-safe**, which is why the editor previews off
  the same code the renderer uses. See [markup.md](./markup.md).
- **templates** — the `TNode` interpreter (`renderTemplate`, `resolveStyle`).
  This is the compile *target*, not an authoring surface: `TemplateDoc`, the
  template JSON files, the registry and `/builder` were removed in brief 58.
- **render** — Playwright Chromium screenshot pipeline (`renderSlides`,
  `zipRun`, `installFontRoute`, `resolveImageUrls`).
- **publish** — the JPEG re-encode pass run once, on publish.
- **scrape** — RSS fetch + body fetch + keyword match (`searchArticles`,
  `pingSource`). Persists nothing.
- **storage** — SQLite CRUD for `posts`, `keywords`, `renders`, `users`,
  `sources`, `articles`, `uploads`, `settings`.
- **themes** — JSON design-system loader (`loadTheme`, `listThemes`).
- **uploads** — image store paths, refs, Sharp normalization.

Exact signatures: [modules.md](./modules.md).

### `api/` — Fastify server

A thin HTTP layer over `@newspapper/core`, with one route plugin per feature
area. Every route is behind the single-account session guard except
`/api/health`, `/api/login`, `/api/logout` and the two `/uploads/*` reads. SSE is
used for the two long operations, **search and render**. It serves:

- `/api/*` — all endpoints ([api.md](./api.md))
- `/assets/fonts/*` — Inter TTFs
- `/output/*` — rendered slide images (guarded)
- `/uploads/<ref>` — uploaded images; public, so headless Chromium can fetch
  them mid-render
- `/` — `ui/dist/` in production, when built

### `ui/` — Vite + React SPA

One `index.html`, one bundle, one React root in `src/main.tsx`. Astro was removed
in brief 70 — every island was `client:load`, so there was no partial hydration
to lose, and the app is entirely behind auth with no SEO surface.
`vite.config.ts` carries the `@/*` → `ui/src/*` alias and proxies `/api`,
`/output`, `/uploads` and `/assets` to port 3001 in dev. The bundle is emitted to
`ui/dist/_bundle/` rather than Vite's default `dist/assets/`, because the API
already serves the repo's own `assets/fonts/` at that prefix.

Routing is hand-rolled in `src/router.tsx` — about 90 lines over
`useSyncExternalStore` and `history.pushState`. Six routes with no params, no
nested layouts and no data loaders did not justify React Router, and several
islands navigate with `window.location.assign` while the editor writes `?post=`
with its own `replaceState`; a router that owned history would fight both.

The page map is in `src/routes.tsx`:

| Route | Sheet |
|---|---|
| `/` | the editor (fluid width) |
| `/posts` | post list — render, publish, export, delete |
| `/articles` | article search / saved library / sources |
| `/settings` | default theme + password change |
| `/login` | sign-in — the only route outside the board |
| `/history` | redirect to `/posts` (kept from brief 62) |
| `/kitchen-sink` | the proof sheet — **dev only**, see below |

Every route but `/login` renders inside **one `<App>` element at one position**
in `routes.tsx`. That is load-bearing: React keeps an element's instance while
its type and position hold, so `layouts/App.tsx` and the `components/Sidebar.tsx`
tray inside it survive a navigation that only swaps `children`, and the tray's
health probe never restarts. This replaced Astro's `<ClientRouter />` plus
`transition:persist="sidebar"` — the persistence is now structural rather than a
directive. If a route component ever renders its own `<App>` again, the tray
silently starts remounting on every click.

`/kitchen-sink` is gated by the `proofSheet` plugin in `vite.config.ts`, which
serves `virtual:proof-sheet` as a re-export of `src/proof/KitchenSink.tsx` under
`vite dev` and as `export default null` under `vite build`. It has to be
structural rather than an `import.meta.env.DEV` branch: the proof island imports
a stylesheet, so dead-code elimination would drop the component but keep its CSS.
Brief 69 has the reasoning — it is the one page that renders with no session at
all.

Interactive UI is built from the `components/ui/` primitive library, which wraps
`@base-ui/react`. Conventions and the mark set: [chrome.md](./chrome.md).

## How a post flows

```
write .wzd in the editor  (source pane · live preview · inspector · palette)
  → parse + lint + compile, in the browser, on every keystroke (forgiving path)
  → POST/PUT /api/posts { markup, theme }   — debounced autosave
        server derives title / description / keywords from <head>

POST /api/posts/:id/render (SSE)
  → parseOrThrow + compileDocument(doc, theme)      — the strict path
  → resolveImageUrls(root, uploadsBaseUrl)          — <Image src> refs → URLs
  → renderTemplate(root, {}, theme, {index,total,fontBaseUrl})  → HTML per slide
  → renderSlides(htmlList) via Playwright Chromium  → slide-NN.jpg (1080×1080)
                                                    + slides.json + caption.txt
  → recordRender() → a row in `renders`, dir output/YYYY-MM-DD-N/

POST /api/posts/:id/publish
  → status = published, and the JPEG optimize pass runs once (guarded by
    the render's `optimized` flag)

GET /api/posts/:id/export.zip
  → zipRun(outputDir) → fflate ZIP of the latest render
```

The source material path is separate and does not feed the render:

```
POST /api/scrape (SSE)   → searchArticles() over the enabled feeds, keyword-matched
                         → returns matches; persists nothing
POST /api/articles       → saves the one you picked into the library
```

## SSE protocol

The two long-running POST endpoints stream Server-Sent Events:

```
event: progress
data: {…}

event: done
data: {…}

event: error
data: {"message": "…"}
```

The UI reads these with `fetch()` (not `EventSource`) and parses lines manually —
`EventSource` cannot POST. Once the stream has begun, failures arrive as an
`error` event rather than a status code.

## Key constraints

- **No LLM, from any provider.** There is no compose step and no Ollama client.
- **Rendering is Chromium.** Satori/resvg were removed in v3; the interpreter
  produces HTML and Playwright screenshots it.
- **The renderer serves its own fonts from disk**, not over HTTP — `setContent`
  leaves the page on an opaque origin, so the API's CORS allowlist drops the
  font request. [Why](./decisions-engineering.md#the-renderer-serves-its-own-fonts-from-disk-not-over-http).
- **ESM throughout.** All workspaces are `"type": "module"`. Paths resolve from
  `import.meta.url`, never `process.cwd()`.
- **No cloud services at all.** Everything is loopback.
