# Dependencies

Per-workspace. Versions are locked in `package-lock.json`.

## `core/` — `@newspapper/core`

| Package | Why |
|---------|-----|
| `better-sqlite3` | Synchronous SQLite for articles, posts, settings. |
| `dotenv` | Loads `.env` at startup. |
| `fflate` | Pure-JS zip for `zipRun()` (no native binary needed). |
| `playwright` | Headless Chromium for 1080×1080 slide screenshots. |
| `rss-parser` | RSS/Atom feed parsing (normalized items, zero-config). |

## `api/` — `@newspapper/api`

| Package | Why |
|---------|-----|
| `fastify` | HTTP server with schema-based request handling and plugin system. |
| `@fastify/cors` | CORS for dev-mode Astro proxy requests from port 4321. |
| `@fastify/static` | Serves `/assets/fonts/`, `/output/`, and `ui/dist/` in prod. |
| `@newspapper/core` | All pipeline logic. |

## `ui/` — `@newspapper/ui`

| Package | Why |
|---------|-----|
| `astro` | Static site builder; React islands via `@astrojs/react`; `<ClientRouter />` for view transitions between pages. |
| `@astrojs/react` | Astro integration for React client components (wizard, builder, etc.). |
| `react`, `react-dom` | UI islands (wizard, editor, builder, settings, history, prompt). |
| `@base-ui/react` | Headless, accessible primitives behind the shared `components/ui/` library (Button, Input, Select, Toggle/Switch, Modal/Dialog, Toast). Styling-agnostic — styled with warm-industrial CSS-variable tokens. |
| `@newspapper/core` | Type imports only (TemplateDoc, SlideBlock, etc.) — no Node APIs used. |

## Root dev deps

| Package | Why |
|---------|-----|
| `typescript` | Source language for all three workspaces. |
| `tsx` | Dev runner — `tsx watch` for the API; used in test runner. |
| `vitest` | Test framework (co-located `*.test.ts`). |
| `concurrently` | Runs API + UI dev servers in parallel (`npm run dev`). |
| `eslint`, `prettier` | Lint and format. |
| `@types/node`, `@types/react`, `@types/better-sqlite3`, `@types/react-dom` | Type declarations. |

## What changed from v2

| Removed | Added | Reason |
|---------|-------|--------|
| `satori` | `playwright` | Chromium rendering replaces SVG-based Satori |
| `@resvg/resvg-js` | `fflate` | PNG-from-SVG gone; pure-JS zip instead of native binding |
| `cac` | `fastify` | CLI gone; HTTP server instead |
| `react` (render) | `@fastify/cors`, `@fastify/static` | No JSX rendering needed |
| `handlebars` | — | Compose prompt is a plain string |
| `openai`, `axios` | — | Ollama-only; native `fetch` |

## Native build requirements

- **`better-sqlite3`** — C++ toolchain needed on source build; prebuilt binaries ship for common platforms.
- **`playwright`** — downloads Chromium on `npx playwright install chromium`; no toolchain needed at install time.

No Python. No system libraries beyond `libc`.
