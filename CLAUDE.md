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

See [docs/architecture.md](docs/architecture.md) for the full module map and SSE protocol.

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

Full schemas: [docs/data.md](docs/data.md).

## LLM

**Ollama** (local or Cloud). Local default: `http://localhost:11434`, model `llama3.2:1b`.

Ollama Cloud is the one sanctioned remote service: set `OLLAMA_HOST=https://ollama.com` + `OLLAMA_API_KEY` in `.env` or via the Settings UI.

## Theme

One theme ships: `warm-industrial`. Tokens in `assets/design-systems/warm-industrial.json`. Template JSON docs in `assets/templates/warm-industrial/`. Fonts in `assets/fonts/` (Inter, 400–900).

The `digital-broadsheet` theme was removed in v2. Satori/resvg rendering was removed in v3.

## Constraints / non-goals

- **Playwright is allowed.** It's in `@newspapper/core` for Chromium rendering. Do NOT add Sharp, canvas, cheerio, Handlebars, inquirer, ora, axios, or Satori.
- **No entity extraction.** The composer prompt sees raw articles.
- **No clustering / no per-topic posts.** One post per day.
- **No human-in-the-loop.** The wizard steps are UI-only; the pipeline runs without approval.
- **Ollama only** for LLM (cloud or local). No OpenAI, Anthropic, or other providers.
- **ESM throughout.** All workspaces are `"type": "module"`. Paths must be resolved from `import.meta.url`, not `process.cwd()`.

## Tests

Co-located: `core/src/**/*.test.ts` and `api/src/**/*.test.ts`, run with `vitest`. Prefer unit tests on JSON parsing and date filtering over snapshot tests on rendered PNGs.

## Wiki

Project documentation lives in `docs/` and is maintained by Claude Code sessions. `docs/index.md` is the entry point.

### Pages

| File | Contents |
|------|----------|
| `docs/index.md` | Catalog — read this to find anything |
| `docs/log.md` | Append-only change log |
| `docs/commands.md` | Running the app (npm scripts, ports) |
| `docs/architecture.md` | Monorepo layout, pipeline, SSE protocol |
| `docs/data.md` | SQLite schema, TemplateDoc format, PostPayload |
| `docs/modules.md` | core module APIs |
| `docs/configuration.md` | Env vars, settings precedence, Playwright setup |
| `docs/design-systems.md` | warm-industrial tokens, template JSON system |
| `docs/dependencies.md` | Package list per workspace + rationale |
| `docs/api.md` | Full HTTP route table |

### Maintenance rules

1. **When you change route behavior** → update `docs/api.md`.
2. **When you change a schema** → update `docs/data.md`.
3. **When you add, remove, or rename a module** → update `docs/modules.md` and `docs/architecture.md`.
4. **When you add or drop a dependency** → update `docs/dependencies.md`.
5. **When you change env vars or setup** → update `docs/configuration.md` and `.env.example`.
6. **After any wiki update** → append one line to `docs/log.md`:
   ```
   ## [YYYY-MM-DD] action | one-line summary
   ```
7. **If you add a wiki page** → register it in the `docs/index.md` table.

### What NOT to put in the wiki

- Contents of `data/` or `output/` — both gitignored, ephemeral.
- In-progress task state — use TodoWrite.
- One-session debugging notes — put them in the PR description.
