---
summary: What each workspace depends on and why that package was chosen over the alternatives.
updated: 2026-08-31
---

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
| `sharp` | Image normalization for uploads (auto-orient, downscale to 2160px, strip EXIF) and the optimization pass on publish. Pinned to `0.35.4`. Added 2026-08-27, when [the v2-era ban was lifted](./decisions.md#sharp-is-allowed-for-images-only) — that rule existed because the project had no images to process, and images are now a first-class component. The rest of the forbidden list (canvas, cheerio, Handlebars, inquirer, ora, axios, Satori) still stands. |

## `api/` — `@newspapper/api`

| Package | Why |
|---------|-----|
| `fastify` | HTTP server with schema-based request handling and plugin system. |
| `@fastify/cors` | CORS for dev-mode Astro proxy requests from port 4321. |
| `@fastify/static` | Serves `/assets/fonts/`, `/output/`, and `ui/dist/` in prod. Not used for `/uploads/` — that route resolves refs through the DB and streams the file itself. |
| `@fastify/multipart` | Parses the single-file `POST /api/uploads` body, with a streaming 10 MB `fileSize` limit so an oversized upload is cut off rather than buffered. |
| `@newspapper/core` | All pipeline logic. |

## `ui/` — `@newspapper/ui`

| Package | Why |
|---------|-----|
| `astro` | Static site builder; React islands via `@astrojs/react`; `<ClientRouter />` for view transitions between pages. |
| `@astrojs/react` | Astro integration for React client components. |
| `react`, `react-dom` | UI islands — the editor, the post and article libraries, settings. |
| `@base-ui/react` | Headless, accessible primitives behind the shared `components/ui/` library (Button, Input, Select, Toggle/Switch, Modal/Dialog, Toast). Styling-agnostic — styled with warm-industrial CSS-variable tokens. |
| `@newspapper/core` | Types, plus the browser-safe `./wizard` subpath — the editor parses, lints and compiles with the same code the renderer uses. No Node APIs. |
| `@use-gesture/react` | Pointer gestures in the editor: the split-screen divider drag and slide reordering. Replaced a half-built HTML5 drag-and-drop; pointer events give one code path for mouse, touch and pen, and drag-and-drop cannot express a resize handle at all. |
| `animejs` | **4.5.0, installed by brief 64.** Drives the two authored motion moments — the compile and the tissue hinge — and nothing else; the canvas never animates. MIT, no dependencies, framework-agnostic. Chosen over motion-primitives and smoothui, which require Tailwind CSS; [why](./decisions-engineering.md#animejs-is-the-motion-engine-tailwind-bound-kits-are-references-only). |

## Root dev deps

| Package | Why |
|---------|-----|
| `typescript` | Source language for all three workspaces. |
| `tsx` | Dev runner — `tsx watch` for the API; used in test runner. |
| `vitest` | Test framework (co-located `*.test.ts`). |
| `concurrently` | Runs API + UI dev servers in parallel (`npm run dev`). |
| `eslint`, `prettier` | Lint and format — both **enforced**: `npm run build` runs `fmt:check` first, and `npm run lint` covers all three workspaces. Until brief 68 there was no Prettier config at all and `eslint.config.js` enabled **zero rules**; [why the current shape](./decisions-tooling.md#the-formatter-and-the-linter-are-enforced-and-configured-to-do-something). |
| `@eslint/js` | The recommended JS ruleset. Was a transitive dependency; declared explicitly by brief 68 when the config started importing it. |
| `eslint-plugin-react-hooks` | Hook correctness in `ui/`. `rules-of-hooks` and `exhaustive-deps` are on and clean; ten React Compiler findings are suppressed pending brief 72. |
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
- **`sharp`** — prebuilt libvips binaries ship per platform (`@img/sharp-*`); no toolchain needed on the supported ones.

No Python. No system libraries beyond `libc`.
