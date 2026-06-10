# Wave 1E — UI shell: design system, layout, shared components, API client

## Project context

Newspapper turns daily RSS news into an Instagram-style slide post (1080×1080 PNGs), rebuilt as a local web app: npm workspaces monorepo — `core/`, `api/` (Fastify :3001), `ui/` (Astro + React islands, static output; the Astro dev server proxies `/api`, `/output`, `/assets` to :3001). You build the app shell that four later feature agents will fill: layout, navigation, a warm-editorial design system, reusable components, and the typed API client. No real pages yet — placeholders only.

## Rules

- Owned paths: `ui/src/**` and `ui/public/**` (Wave 0 left only a bare index page; you may restructure ui/src freely). Do not touch `core/`, `api/`, root configs, package.json files (missing dep → `plans/swarm/NEEDS.md`; prefer zero new deps — no Tailwind, no component libraries, plain CSS).
- Do NOT git commit. No edits to `docs/` or `CLAUDE.md`.
- React 19 function components, TypeScript strict. Astro pages are thin wrappers mounting React islands (`client:load`).

## Design direction — "warm editorial light"

The studio wears its product's brand (tokens from `assets/design-systems/warm-industrial.json` — copy values into CSS custom properties, don't import the JSON at runtime):

- Surfaces: warm off-whites — `--surface: #fbf9f8`, `--surface-low: #f5f3f3`, `--surface-container: #efeded`, cards `#ffffff`, text `--on-surface: #1b1c1c`, muted `--muted: #57423c`.
- Accent: terracotta `--primary: #a2391a`, hover `#c3512f`, `--on-primary: #fff`.
- Type: Inter (copy the 6 TTFs from `assets/fonts/` into `ui/public/fonts/` + @font-face). Tight, confident headings (weight 800, negative letter-spacing), 15–16px body.
- Feel: editorial, generous whitespace, 8px spacing grid, radius 8–12px, hairline borders (`1px solid #e4e2e2`) over shadows; one accent color used sparingly. No dark-dashboard tropes.
- Global stylesheet `ui/src/styles/global.css` with the custom props, reset, focus-visible rings (terracotta), selection color.

## Task 1 — Layout & nav

`ui/src/layouts/App.astro`: HTML shell, global CSS, slot. Left sidebar nav (or top bar — your call, justify in report): brand wordmark "newspapper", links: Create (`/`), History (`/history`), Sources (`/sources`), Templates (`/builder`), Prompt (`/prompt`), Settings (`/settings`); active state from `Astro.url.pathname`. Footer-of-nav shows API health (small React island polling `GET /api/health` every 30s — green dot / red dot "API offline").

## Task 2 — Placeholder pages

Create all six pages using the layout, each rendering an `EmptyState` ("Built in a later wave") — feature agents will replace page contents but keep your layout. Keep each page file trivially small so replacement is painless.

## Task 3 — Component kit (`ui/src/components/ui/`)

React + plain CSS (CSS modules or one `kit.css` — pick one, be consistent): `Button` (primary/secondary/ghost/danger, sizes, loading state), `Card`, `Input`, `Textarea` (auto-grow), `Select`, `Toggle`, `Badge`, `Spinner`, `EmptyState` (icon+title+hint), `Modal` (focus-trapped, Esc closes), `Toast` (context + `useToast()` hook, success/error variants, auto-dismiss), `Stepper` (horizontal wizard steps: done/current/upcoming states), `ProgressBar`, `ConfirmDialog` (wraps Modal). Export everything from `ui/src/components/ui/index.ts`. Add a hidden dev page `/kitchen-sink` rendering every component for visual QA.

## Task 4 — API client (`ui/src/lib/api.ts`)

- `api<T>(path, opts?)`: typed fetch wrapper over relative `/api/*` (the proxy handles the rest); JSON in/out; non-2xx → throws `ApiError {status, message}` extracted from `{error: string}` bodies.
- `sse(path: string, body: unknown, handlers: { onEvent: (event: string, data: any) => void; signal?: AbortSignal }): Promise<void>` — POST + read the streamed response with `response.body.getReader()`, parsing SSE frames (`event:`/`data:` lines, blank-line delimited). The API streams progress for scrape/compose/render as events `progress`, `done`, `error` (data = JSON). `done` resolves the promise; `error` rejects with the payload.
- `ui/src/lib/types.ts`: re-export shared types from `@newspapper/core/templates` if the import resolves cleanly in Astro; if it fights you, copy the needed types (`SlideBlock`, `PostPayload`, `TemplateDoc`, `FieldSpec`, `Article`, `SourceConfig`, `Settings`, `PostRow`) into this file verbatim from `core/src/types.ts` with a header comment `// MIRROR of core/src/types.ts — keep in sync` and note it in your report.

## Task 5 — Verify

`npm run dev` (or `astro dev` in ui/ alone): all six pages render with nav + active states; `/kitchen-sink` shows the kit; no console errors; `astro build` succeeds. The API may not have real routes yet — the health dot showing red is fine.

## Final report

Screenshot-level description of the shell, list of components with their props, which approach you took for shared types, and any deps requested in NEEDS.md (ideally none).
