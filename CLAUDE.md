# CLAUDE.md

Guidance for Claude Code sessions working in this repo.

## What this is

A local web app for writing an Instagram-style slide post by hand and compiling it to 1080×1080 JPEGs:

```
.wzd document  →  compile  →  HTML  →  Chromium  →  1080² JPEGs  →  publish / ZIP
```

A post is authored in [Newspapper Wizard](corpus/wiki/markup.md) markup in a split-screen editor (source · live canvas · inspector · palette). **No model is involved anywhere.** RSS survives only as a searchable library of source material to write *from*.

UI at `http://localhost:4321`, API at `http://localhost:3001`. No CLI. Single account, loopback only.

## Commands

```bash
npm install                      # one-time (+ npx playwright install chromium)
npm run build                    # fmt:check → tsc core → tsc api → tsc ui → vite build
npm run dev                      # start API (3001) + UI dev server (4321)
npm run dev --workspace=api      # API only
npm test                         # vitest over core/**, api/** and ui/**
npm run lint                     # eslint core/src api/src ui/src ui/vite.config.ts
npm run fmt                      # prettier, same three workspaces + ui/index.html
bash corpus/lint.sh              # corpus health check (add --index to regenerate)

# Single test file
npx vitest run core/src/path/to/file.test.ts
```

Every one of those coverages was, at some point, silently doing nothing — see Tests below.

## Architecture

Three npm workspaces, dependency direction `ui → api → core`:

- **`core/`** (`@newspapper/core`) — the library: the `.wzd` parser/formatter/linter/compiler (browser-safe), the `TNode` interpreter, Playwright rendering, the publish-time JPEG pass, RSS search, Sharp image uploads, SQLite storage, theme loading. Four entry points: `.`, `./templates`, `./publish`, `./wizard`.
- **`api/`** (`@newspapper/api`) — Fastify on 3001: all `/api/*` routes behind a session guard, SSE for the two long ops (search, render), serves `/assets/fonts/`, `/output/`, `/uploads/<ref>` and `ui/dist/` in prod.
- **`ui/`** (`@newspapper/ui`) — a Vite + React SPA with a hand-rolled router: editor (`/`), `/posts`, `/articles`, `/settings`, `/login`. Astro was removed in brief 70.

One structural rule that is load-bearing: every route but `/login` renders inside **one `<App>` element at one position** in `ui/src/routes.tsx`. That is what keeps the sidebar tray mounted across navigation. A route that renders its own `<App>` silently breaks it.

See [corpus/wiki/architecture.md](corpus/wiki/architecture.md) for the full flow and SSE protocol.

## Data

| Path | Contents |
|------|----------|
| `data/newspapper.db` | SQLite (schema v4): `posts`, `keywords`, `post_keywords`, `renders`, `users`, `sources`, `articles`, `uploads`, `settings` |
| `data/sources.json` | v2 residue — a one-time seed for the `sources` table. Nothing reads it afterwards. |
| `assets/design-systems/` | The three slide themes as JSON tokens |
| `assets/fonts/` | Inter TTFs, read off disk by the render browser |
| `ui/public/fonts/` | Archivo + Spline Sans Mono (app chrome), plus Inter for the preview canvas |
| `uploads/` | `originals/` + `normalized/` image store (`UPLOADS_DIR`) |
| `output/YYYY-MM-DD-N/` | Rendered JPEGs + slides.json + caption.txt |

`data/`, `uploads/` and `output/` are gitignored. The DB is auto-created and migrated on boot.

`posts.markup` is the source of truth; title, description and keywords are derived from the document's `<head>` on every write. Full schemas: [corpus/wiki/data.md](corpus/wiki/data.md).

## Theme

**Two design systems, and they share nothing on purpose.**

The **slide themes** paint the 1080² artwork: `warm-industrial-1`, `-2`, `-3` — a family, not three designs, differing only in the primary colour. Tokens in `assets/design-systems/`. Inter lives in `assets/fonts/`, served to the render browser. See [design-systems.md](corpus/wiki/design-systems.md).

The **app chrome** is The Mechanical, a paste-up board. Tokens in `ui/src/styles/global.css`, faces in `ui/public/fonts/`. The canonical spec is [design.md](corpus/wiki/design.md) (§1–§4) + [design-components.md](corpus/wiki/design-components.md) (§5–§9) — a source comment citing "DESIGN.md §5" means the latter. What shipped: [chrome.md](corpus/wiki/chrome.md).

The `digital-broadsheet` theme was removed in v2; Satori/resvg rendering in v3; the JSON template system and `/builder` in brief 58.

## Constraints / non-goals

- **No LLM, from any provider.** The Wizard pivot removed composing entirely — a post is written by hand in [Newspapper Wizard](corpus/wiki/markup.md), not generated. This supersedes the old "Ollama only" rule; there is no Ollama client left.
- **Playwright is allowed.** It's in `@newspapper/core` for Chromium rendering.
- **Sharp is allowed, for images only** — normalizing uploads (resize, strip EXIF). This reversed a standing ban on 2026-08-27; see [decisions.md](corpus/wiki/decisions.md#sharp-is-allowed-for-images-only). Still banned: canvas, cheerio, Handlebars, inquirer, ora, axios, Satori.
- **Dependency versions are pinned exactly.** No `^`, no `~`, anywhere.
- **ESM throughout.** All workspaces are `"type": "module"`. Paths must be resolved from `import.meta.url`, not `process.cwd()`.
- **`npm run build` runs `fmt:check` first**, and `npm run lint` covers all three workspaces. Both were enforced in brief 68, after the linter was found to have enabled zero rules since the project began. Don't unwire either.

## Tests

Co-located `*.test.ts` under `core/src/`, `api/src/` and `ui/src/`, run with `vitest`. Prefer unit tests on parsing and filtering over snapshots of rendered images. Three files (`render`, `fonts`, `font-fallback`) do launch real Chromium and assert on real JPEG bytes; without `npx playwright install chromium` they skip with a loud banner locally and **fail under `CI`**.

**Read [`corpus/wiki/green-because-nothing-ran.md`](corpus/wiki/green-because-nothing-ran.md) before you trust a green command.** That pattern — a tool reporting success while reaching nothing — has been hit eight times in this repo: a DB path the tests set but nothing read, a `.gitignore` rule that would have hidden a module, a vitest `include` that omitted `ui/`, a workspace bundled but never typechecked, a formatter with no config, a test control that collapsed into its subject, an ESLint config with zero rules enabled, and a test whose import resolved only through a hoisted optional dependency. When a check passes, ask what it actually reached. (The page collects them; [`corpus/log.md`](corpus/log.md) has each in full.)

## Corpus (the project wiki)

Project knowledge and work live in [`corpus/`](corpus/) — an LLM-maintained
wiki. **[`corpus/index.md`](corpus/index.md) is the entry point; read it before
anything else.**
[`corpus/CLAUDE.md`](corpus/CLAUDE.md) carries the full rules.

The short version:

- **Retrieval budget** — `index.md`, then **at most 2–3 wiki pages**. Triage on
  each page's `summary:` frontmatter instead of opening it. Needing a fourth
  page means a page must split.
- **Layers** — `corpus/wiki/` is curated synthesis (the LLM owns it and rewrites
  it freely); `corpus/briefs/` holds immutable work specs; `corpus/todos/`
  captures pre-spec ideas; `corpus/log.md` is the append-only history.
- **Start cold at** [`corpus/wiki/overview.md`](corpus/wiki/overview.md), then
  [`status.md`](corpus/wiki/status.md).
- **Before changing an approach**, check
  [`corpus/wiki/decisions.md`](corpus/wiki/decisions.md) and its three siblings —
  the constraints above are the *what*; those pages are the *why*, and it is not to be relitigated
  without an explicit revisit plus a log entry.
- **Never read `briefs/` or `todos/` wholesale.**

### Maintenance rules

1. **When you change route behavior** → update `corpus/wiki/api.md`.
2. **When you change a schema** → update `corpus/wiki/data.md`.
3. **When you add, remove, or rename a module** → update `corpus/wiki/modules.md` and `corpus/wiki/architecture.md`.
4. **When you add or drop a dependency** → update `corpus/wiki/dependencies.md`.
5. **When you change env vars or setup** → update `corpus/wiki/configuration.md` and `.env.example`.
6. **When you lock a technical choice** → add an entry to the right decisions page, with what it rejected and why: `decisions.md` (product shape), `decisions-engineering.md` (runtime and library calls), `decisions-security.md` (auth and what is guarded), `decisions-tooling.md` (how the repo itself is built, formatted, linted, pinned).
7. **After any corpus change** → append one entry to `corpus/log.md`:
   ```
   ## [YYYY-MM-DD] kind | one-line summary
   ```
8. **If you add a wiki page** → give it `summary:` + `updated:` frontmatter and run `bash corpus/lint.sh --index`.
9. **Before committing corpus changes** → `bash corpus/lint.sh` must exit clean. Don't commit unless asked.

### What NOT to put in the corpus

- Contents of `data/` or `output/` — both gitignored, ephemeral.
- In-progress task state — use TodoWrite. `corpus/` is for what outlives the session.
- One-session debugging notes — put them in the PR description.
- A code graph's output as fact. The corpus is the *why*; structural questions go to `grep` (see [`corpus/routing.md`](corpus/routing.md)).
