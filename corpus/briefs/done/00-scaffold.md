# Wave 0 — Scaffold the v3 monorepo

## Project context

Newspapper turns daily RSS news into an Instagram-style slide post (1080×1080 PNGs). It is being rebuilt from a CLI into a local, single-user web app ("v3"):

- **npm workspaces monorepo**: `core/` (pipeline library), `api/` (Fastify HTTP API on :3001), `ui/` (Astro + React frontend, static output, dev server proxies `/api` → :3001).
- The old **Satori/resvg renderer is removed**. Templates become JSON documents interpreted into HTML and screenshotted by **Playwright Chromium** at 1080×1080 (built in a later wave).
- LLM: **Ollama** — local or Ollama Cloud (`https://ollama.com` with `Authorization: Bearer $OLLAMA_API_KEY`).
- Data: SQLite at `data/newspapper.db` (better-sqlite3), RSS sources in `data/sources.json`, rendered runs in `output/YYYY-MM-DD-N/`.
- The **CLI is removed entirely** (no `cac`, no `src/cli.ts`).

You are the scaffold agent. Later agents build features in parallel against the structure and contracts you create. Precision matters more than features here.

## Rules

- Do NOT edit `docs/`, `CLAUDE.md`, or `README.md` (a later wave rewrites them).
- Do NOT `git commit` — the orchestrator commits.
- TypeScript strict, ESM everywhere (`"type": "module"`).
- You ARE allowed to edit all package.json files — you are the only agent that may. Install every dependency listed below so later agents never touch package.json.

## Tasks

### 1. Restructure into workspaces

- Create root `package.json`: private, `"workspaces": ["core", "api", "ui"]`, scripts:
  - `dev`: run api (tsx watch) and ui (astro dev) concurrently (use `concurrently` devDep)
  - `build`: typecheck core+api (`tsc --noEmit` per workspace) then `astro build` in ui
  - `test`: `vitest run` at root (covers core and api)
  - keep `lint` (eslint) and `fmt` (prettier) working against `core api ui`
- `git mv` the existing `src/` content into `core/src/`:
  - KEEP: `scrape/`, `compose/`, `storage/`, `util/`
  - DELETE: `cli.ts`, `run.ts`, `commands/`, and all of `render/` (Satori-based — replaced later)
  - Copy the deleted `src/render/slides/*.tsx` and `src/render/theme.ts` into `plans/swarm/reference/old-render/` first (plain copy, for a later agent's reference), then delete from core.
- Delete `dist/`. Update `.gitignore` for new build outputs (`ui/dist`, `**/dist`, `.astro`).

### 2. Dependencies (install ALL of these now)

- `core/package.json` (`@newspapper/core`): deps `better-sqlite3`, `rss-parser`, `dotenv`, `playwright`, `fflate`. Remove `satori`, `@resvg/resvg-js`, `react`, `cac`.
  - exports: `"."` → `./src/index.ts`, `"./templates"` → `./src/templates/index.ts` (browser-safe subpath used by the UI later; create a stub `core/src/templates/index.ts` that just re-exports template types from types.ts for now).
- `api/package.json` (`@newspapper/api`): deps `fastify`, `@fastify/static`, `@fastify/cors`, `@newspapper/core` (workspace), devDep `tsx`.
- `ui/package.json` (`@newspapper/ui`): `astro`, `@astrojs/react`, `react`, `react-dom`, and `@newspapper/core` (workspace, for the `/templates` subpath types only).
- Root devDeps: `typescript`, `tsx`, `vitest`, `concurrently`, `@types/node`, `@types/better-sqlite3`, `@types/react`, `@types/react-dom`, existing eslint/prettier setup.
- Run `npx playwright install chromium` and verify `chromium.launch({headless: true})` + `newPage()` works with a tiny throwaway script (delete it after). If system libraries are missing on WSL2, record the exact error and the `playwright install-deps` hint in `plans/swarm/NEEDS.md` — do not sudo.

### 3. Contracts — create `core/src/types.ts` EXACTLY as specified

```ts
export type SlideBlock =
  | { type: 'title'; variant: 'title-main'; text: string; kicker?: string }
  | { type: 'title'; variant: 'title-statement' | 'title-question'; text: string }
  | { type: 'body'; variant: 'body-text'; heading: string; body: string }
  | { type: 'body'; variant: 'body-list'; heading: string; items: string[] }
  | { type: 'body'; variant: 'body-comparison'; heading: string;
      left: { label: string; body: string }; right: { label: string; body: string } }
  | { type: 'quote'; variant: 'quote-classic' | 'quote-pullout' | 'quote-reaction';
      quote: string; attribution: string };

export interface PostPayload {
  date: string;            // YYYY-MM-DD
  title: string;
  theme: string;           // e.g. "warm-industrial"
  slides: SlideBlock[];    // 2–8
  caption?: string;
  hashtags?: string[];
}

export interface Article {
  id: number; sourceId: string; sourceName: string; title: string;
  url: string | null; publishedAt: string; body: string; createdAt: string;
}

export interface PostRow {
  id: number; date: string; title: string; theme: string;
  payload: PostPayload; status: 'draft' | 'rendered';
  outputDir: string | null; createdAt: string; updatedAt: string;
}

export interface Theme {
  name: string;
  colors: Record<string, string>;
  typography: Record<string, { fontFamily: string; fontSize: string; fontWeight: string;
    lineHeight: string; letterSpacing?: string }>;
  rounded: Record<string, string>;
  spacing: Record<string, string>;
  shapes: { borderRadius: string; borderWidth: string };
}

// ---- Template documents (the new source of truth for slide layouts) ----
// Style values may reference theme tokens:
//   "$color.primary"  "$spacing.lg"  "$rounded.md"
// Special style key `typography: "display"` expands to the theme typography token
// (fontFamily, fontSize, fontWeight, lineHeight, letterSpacing).
export type TStyle = Record<string, string | number>;

export type TNode =
  | { kind: 'box'; style?: TStyle; children?: TNode[] }
  | { kind: 'text'; style?: TStyle; text: string }                      // supports {{binding}}
  | { kind: 'repeat'; source: string; style?: TStyle; children: TNode[] }; // {{item}}, {{i}} inside

export interface FieldSpec {
  key: string; label: string;
  kind: 'text' | 'textarea' | 'list' | 'pair';
  required: boolean;
}

export interface TemplateDoc {
  id: string;                          // === slide variant, e.g. "title-main"
  theme: string;                       // "warm-industrial"
  family: 'title' | 'body' | 'quote';
  name: string;                        // display name
  fields: FieldSpec[];                 // drives the editor form
  sample: Record<string, unknown>;     // sample data for previews
  root: TNode;
}

export interface RenderTemplateOptions { index: number; total: number; fontBaseUrl: string }

export interface SourceConfig { id: string; name: string; rss: string; enabled: boolean }

export interface Settings {
  ollamaHost: string;       // default http://localhost:11434, cloud: https://ollama.com
  ollamaApiKey: string;     // empty = no auth header
  ollamaModel: string;      // default llama3.2:1b
  defaultTheme: string;     // default warm-industrial
}
```

`core/src/index.ts` re-exports everything from `types.ts` plus whatever modules currently exist (scrape/compose/storage) — fix their imports so typecheck passes. Built-in template bindings (document in a comment in types.ts): `{{_index}}`, `{{_total}}`, `{{_date}}`.

### 4. API and UI skeletons

- `api/src/server.ts`: Fastify listening on `PORT` (default 3001), `GET /api/health` → `{ok: true}`, CORS allowing localhost, `@fastify/static` serving `assets/fonts` at `/assets/fonts/` and `output/` at `/output/`. Route files will be added under `api/src/routes/` by a later agent — create the directory with a `health.ts` as the pattern example (one exported `FastifyPluginAsync` per file, registered in server.ts).
- `ui/`: minimal Astro project — `astro.config.mjs` with `@astrojs/react` integration, `output: 'static'`, vite `server.proxy` `{'/api': 'http://localhost:3001', '/output': 'http://localhost:3001', '/assets': 'http://localhost:3001'}`. One page `src/pages/index.astro` rendering "newspapper v3" so `astro dev` works.
- `.env.example`: `OLLAMA_HOST=https://ollama.com`, `OLLAMA_API_KEY=`, `OLLAMA_MODEL=`, `PORT=3001`.

### 5. Tests & tooling keep working

- Root `vitest.config.ts` covering `core/**/*.test.ts` and `api/**/*.test.ts`.
- The moved tests (`core/src/compose/parse.test.ts`, `core/src/scrape/body.test.ts`) must pass.
- Each workspace gets a `tsconfig.json` (strict, ESM, bundler resolution); root tsconfig references them or a simple per-workspace `tsc --noEmit` in the build script.

## Acceptance criteria

1. `npm install` from root succeeds.
2. `npm run build` (typechecks) passes; `npm test` passes.
3. `npm run dev` starts both servers; `curl localhost:3001/api/health` returns `{"ok":true}`; Astro page loads and proxies (verify `curl localhost:4321/api/health` through the proxy).
4. `git status` shows the CLI files deleted, no stray `src/` left at root.
5. `plans/swarm/reference/old-render/` contains the old slide TSX + theme.ts copies.

## Final report

Reply with: what was created/moved/deleted, dependency versions installed, any items written to `plans/swarm/NEEDS.md`, and the exact commands you ran to verify.
