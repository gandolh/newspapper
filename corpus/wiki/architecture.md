---
summary: How the three npm workspaces fit together, the SPA's routing and its load-bearing single-App rule, how a post flows write → compile → render → publish/ZIP, and how the Reader's background refresh runs (single-flight, one API process).
updated: 2026-10-09
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
  `pingSource`, and `fetchFeed`, which the Reader shares). Persists nothing.
- **reader** — the Reader's refresh (`refreshSources`) and its background loop
  (`startReaderSchedule`); see [The Reader](#the-reader).
- **storage** — SQLite CRUD for `posts`, `keywords`, `renders`, `sources`,
  `articles`, `feed_items`, `uploads`, `settings`.
- **themes** — JSON design-system loader (`loadTheme`, `listThemes`).
- **uploads** — image store paths, refs, Sharp normalization.

Exact signatures: [modules.md](./modules.md).

### `api/` — Fastify server

A thin HTTP layer over `@newspapper/core`, with one route plugin per feature
area. Every route is behind the Ward session guard except `/api/health`. SSE is
used for the three long operations, **search, render and the Reader's
refresh**. It serves:

- `/api/*` — all endpoints ([api.md](./api.md), [api-reader.md](./api-reader.md))
- `/assets/fonts/*` — Inter TTFs (public)
- `/output/*` — rendered slide images (guarded)
- `/uploads/<ref>` — uploaded images (guarded). The render browser carries no
  session, so it does not fetch them: `core/src/render/uploads-route.ts`
  intercepts the request inside the browser and serves the bytes from disk.
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
| `/reader` | the Reader: rail · list · reading pane, plus the Search, Library and Sources views |
| `/settings` | default theme, and a pointer to Ward's account page for the password |
| `/login` | no page any more: redirects to Ward's login, so an old bookmark still signs you in |
| `/history` | redirect to `/posts` (kept from brief 62) |
| `/articles` | redirect to `/reader` (brief 105) |
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

POST /api/reader/refresh (SSE), or the background loop
                         → fetch each enabled feed (conditional GET), store new
                           items in feed_items, purge past the retention window
POST /api/reader/items/:id/save → the item becomes an article, guid = its URL
```

## SSE protocol

The three long-running POST endpoints stream Server-Sent Events:

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

## The Reader

`core/src/reader/`. `refreshSources` fetches the enabled feeds four at a time
with the stored ETag and Last-Modified, stores the new items, then purges
([data-reader.md](./data-reader.md#feed_items)). It is **single-flight per
connection**: a call during a running refresh joins it and gets its remaining
progress, so a manual refresh during a background one starts nothing new. A
failing source is recorded on its row and never stops the others.

`startReaderSchedule` runs it 15 s after boot, then every
`READER_REFRESH_MINUTES` measured from the end of the last run, so runs never
overlap; `0` turns it off. Its timers are `unref`'d and the server's `onClose`
stops it. **It assumes one API process**, which is true today: the container
runs a single `npm run start`. Two would each run a loop against the same file. Settings:
[configuration.md](./configuration.md).

## Key constraints

- **No LLM, from any provider.** There is no compose step and no Ollama client.
- **Rendering is Chromium.** Satori/resvg were removed in v3; the interpreter
  produces HTML and Playwright screenshots it.
- **The renderer serves its own fonts from disk**, not over HTTP — `setContent`
  leaves the page on an opaque origin, so the API's CORS allowlist drops the
  font request. [Why](./decisions-engineering.md#the-renderer-serves-its-own-fonts-from-disk-not-over-http).
- **ESM throughout.** All workspaces are `"type": "module"`. Paths resolve from
  `import.meta.url`, never `process.cwd()`.
- **Deployed on the shared VPS** at `https://gandolh.ro/newspapper/`, behind
  Caddy's `handle_path`, which strips the prefix before Fastify. Identity is
  Ward's; the only other outside services are the RSS feeds. The browser-side
  URLs carry the base (`ui/src/lib/base.ts`); the server never sees it.
