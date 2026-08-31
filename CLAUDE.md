# CLAUDE.md

Guidance for Claude Code sessions working in this repo.

## What this is

A local web app that turns today's news into an Instagram-style slide post (1080×1080 PNGs):

```
RSS feeds  →  scrape  →  compose (Ollama)  →  edit  →  render (Chromium)  →  ZIP export
```

UI wizard at `http://localhost:4321`, API at `http://localhost:3001`. No CLI, no human-in-the-loop per step.

## Commands

```bash
npm install                      # one-time (+ npx playwright install chromium)
npm run build                    # typecheck all workspaces + astro build
npm run dev                      # start API (3001) + UI dev server (4321)
npm run dev --workspace=api      # API only
npm test                         # vitest (all workspaces)
npm run lint                     # eslint core/src api/src
npm run fmt                      # prettier core/src api/src ui/src

# Single test file
npx vitest run core/src/path/to/file.test.ts
```

## Architecture

Three npm workspaces:

- **`core/`** (`@newspapper/core`) — pipeline library: scrape, compose (Ollama), render (Playwright), storage (SQLite), template interpreter
- **`api/`** (`@newspapper/api`) — Fastify server on port 3001: all `/api/*` routes, SSE for long ops, serves `/assets/fonts/`, `/output/`, and `ui/dist/` in prod
- **`ui/`** (`@newspapper/ui`) — Astro + React islands: wizard (`/`), `/history`, `/sources`, `/settings`, `/prompt`, `/builder`

Pipeline: scrape → compose → (edit slides) → render (Playwright Chromium) → ZIP.

See [corpus/wiki/architecture.md](corpus/wiki/architecture.md) for the full module map and SSE protocol.

## Data

| Path | Contents |
|------|----------|
| `data/sources.json` | RSS feed configs — `{id, name, rss, enabled}` |
| `data/prompt.md` | Ollama system prompt (editable via UI) |
| `data/newspapper.db` | SQLite: `articles`, `posts`, `settings` |
| `assets/templates/warm-industrial/` | Template JSON docs (one per slide variant) |
| `assets/design-systems/` | Theme JSON (warm-industrial tokens) |
| `assets/fonts/` | Inter TTF files served at `/assets/fonts/` |
| `output/YYYY-MM-DD-N/` | Rendered PNGs + slides.json + caption.txt |

Both `data/` and `output/` are gitignored. The DB is auto-created.

Full schemas: [corpus/wiki/data.md](corpus/wiki/data.md).

## LLM

**Ollama** (local or Cloud). Local default: `http://localhost:11434`, model `llama3.2:1b`.

Ollama Cloud is the one sanctioned remote service: set `OLLAMA_HOST=https://ollama.com` + `OLLAMA_API_KEY` in `.env` or via the Settings UI.

## Theme

**Two design systems, and they share nothing on purpose.**

The **slide themes** paint the 1080² artwork: `warm-industrial-1`, `-2`, `-3` — a family, not three designs, differing only in the primary colour. Tokens in `assets/design-systems/`. Inter lives in `assets/fonts/`, served to the render browser. See [design-systems.md](corpus/wiki/design-systems.md).

The **app chrome** is The Mechanical, a paste-up board. Tokens in `ui/src/styles/global.css`, faces in `ui/public/fonts/`. `DESIGN.md` is canonical. See [chrome.md](corpus/wiki/chrome.md).

The `digital-broadsheet` theme was removed in v2; Satori/resvg rendering in v3; the JSON template system and `/builder` in brief 58.

## Constraints / non-goals

- **No LLM, from any provider.** The v3 pivot removed composing entirely — a post is written by hand in [Newspapper Wizard](corpus/wiki/markup.md), not generated. This supersedes the old "Ollama only" rule; there is no Ollama client left.
- **Playwright is allowed.** It's in `@newspapper/core` for Chromium rendering.
- **Sharp is allowed, for images only** — normalizing uploads (resize, strip EXIF). This reversed a standing ban on 2026-08-27; see [decisions.md](corpus/wiki/decisions.md#sharp-is-allowed-for-images-only). Still banned: canvas, cheerio, Handlebars, inquirer, ora, axios, Satori.
- **Dependency versions are pinned exactly.** No `^`, no `~`, anywhere.
- **ESM throughout.** All workspaces are `"type": "module"`. Paths must be resolved from `import.meta.url`, not `process.cwd()`.
- **`npm run build` runs `fmt:check` first**, and `npm run lint` covers all three workspaces. Both were enforced in brief 68, after the linter was found to have enabled zero rules since the project began. Don't unwire either.

## Tests

Co-located `*.test.ts` under `core/src/`, `api/src/` and `ui/src/`, run with `vitest`. Prefer unit tests on parsing and filtering over snapshots of rendered images.

**Read [`corpus/log.md`](corpus/log.md) for the entries titled "green because nothing ran" before you trust a green command.** That pattern — a tool reporting success while reaching nothing — has been hit eight times in this repo: a DB path the tests set but nothing read, a `.gitignore` rule that would have hidden a module, a vitest `include` that omitted `ui/`, a workspace bundled but never typechecked, a formatter with no config, a test control that collapsed into its subject, an ESLint config with zero rules enabled, and a test file whose import vanished from the lockfile. When a check passes, ask what it actually reached.
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
  [`corpus/wiki/decisions.md`](corpus/wiki/decisions.md) — the constraints below
  are the *what*; that page is the *why*, and it is not to be relitigated
  without an explicit revisit plus a log entry.
- **Never read `briefs/` or `todos/` wholesale.**

### Maintenance rules

1. **When you change route behavior** → update `corpus/wiki/api.md`.
2. **When you change a schema** → update `corpus/wiki/data.md`.
3. **When you add, remove, or rename a module** → update `corpus/wiki/modules.md` and `corpus/wiki/architecture.md`.
4. **When you add or drop a dependency** → update `corpus/wiki/dependencies.md`.
5. **When you change env vars or setup** → update `corpus/wiki/configuration.md` and `.env.example`.
6. **When you lock a technical choice** → add an entry to `corpus/wiki/decisions.md` with what it rejected and why.
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
