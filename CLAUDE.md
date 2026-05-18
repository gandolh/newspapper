# CLAUDE.md

Guidance for Claude Code sessions working in this repo.

## What this is

A minimal CLI that turns today's news into an Instagram-style slide post:

```
sources.json (RSS)  →  scrape  →  compose (Ollama)  →  render (Satori → PNG)
```

One user-facing command — `newspapper run` — runs the whole pipeline. No interactive menus, no human-in-the-loop, no background jobs.

## Commands

```bash
npm install            # one-time
npm run build          # tsc → dist/
npm run dev -- run     # run the pipeline against today's feeds (uses tsx)
npm start -- run       # same, but from built output
npm test               # vitest
npm run lint           # eslint src/
npm run fmt            # prettier src/

# Single test file
npx vitest run src/path/to/file.test.ts
```

The CLI surface is intentionally small:

```bash
newspapper run         # scrape → compose → render
newspapper sources     # list & ping configured RSS feeds
newspapper list        # show recent posts from DB
newspapper clean       # delete old output dirs + DB rows
```

Flags on `run`: `--max-per-source`, `--theme`, `--model`, `--dry-run`, `--no-scrape`. See [docs/commands.md](docs/commands.md).

## Architecture

Three sequential stages in a single process:

1. **Scrape** (`src/scrape/`) — fetch each enabled source in `data/sources.json` as RSS, keep today's items (cap `--max-per-source`, default 5), dedupe by URL into the `articles` SQLite table.
2. **Compose** (`src/compose/`) — send all of today's articles to Ollama in one prompt, get back a post (title + 2–8 slide blocks), persist to the `posts` table.
3. **Render** (`src/render/`) — for each slide block, Satori (HTML/JSX → SVG) then resvg (SVG → PNG) at 1080×1080. Output to `output/YYYY-MM-DD-N/`. Same-day re-runs increment `N`; nothing is overwritten.

See [docs/architecture.md](docs/architecture.md) for the module map and key constraints (Satori = flexbox only, no Grid, no positional CSS).

## Data

| Path | Contents |
|------|----------|
| `data/sources.json` | RSS feed configs — `{id, name, rss, enabled}` |
| `data/newspapper.db` | SQLite: `articles` (dedupe + history), `posts` (one row per run) |
| `output/YYYY-MM-DD-N/` | `slides.json` + numbered PNGs for that run |

Both `data/` and `output/` are gitignored. The DB is auto-created; nothing in `output/` should be committed.

Full schemas: [docs/data.md](docs/data.md).

## LLM

**Ollama only.** Must be running (`ollama serve` or the shipped `newspaper-infra/docker-compose.yml`). Default model `llama3.2:1b`, configurable via `OLLAMA_MODEL`. There is no cloud/API fallback.

## Theme

One theme ships: `warm-industrial`. Tokens in `design-systems/warm-industrial.json`. Reference HTML in `templates/warm-industrial/` (visual specs only — actual rendering is JSX components under `src/render/slides/`). Satori loads fonts from `fonts/` at startup.

The `digital-broadsheet` theme was removed in v2.

## Constraints / non-goals

- **Minimal dep footprint.** Don't add Playwright, Sharp, canvas, cheerio, Handlebars, inquirer, ora, axios. The v2 dep list is documented in [docs/dependencies.md](docs/dependencies.md).
- **No entity extraction.** The composer prompt sees raw articles and decides what's interesting.
- **No clustering / no per-topic posts.** One post per day, covering all today's news.
- **No human-in-the-loop.** No `format` REPL, no preview command, no approval step.
- **No cloud services.** Ollama + SQLite + filesystem — that's it.

## Tests

Co-located: `src/**/*.test.ts`, run with `vitest`. Prefer unit tests on the composer's JSON parsing and the scraper's date filtering over snapshot tests on rendered PNGs.

## Wiki

Project documentation lives in `docs/` and is maintained by Claude Code sessions. `docs/index.md` is the entry point.

### Pages

| File | Contents |
|------|----------|
| `docs/index.md` | Catalog — read this to find anything |
| `docs/log.md` | Append-only change log |
| `docs/commands.md` | CLI reference |
| `docs/architecture.md` | Pipeline + module map |
| `docs/data.md` | All JSON / SQLite schemas |
| `docs/modules.md` | Module APIs |
| `docs/configuration.md` | Env vars + setup |
| `docs/design-systems.md` | warm-industrial spec + Satori constraints |
| `docs/dependencies.md` | Package list + rationale |

### Maintenance rules

1. **When you change command behavior** → update `docs/commands.md`.
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
