# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # TypeScript compilation to dist/
npm run test           # Run all tests (vitest)
npm run test:watch     # Watch mode
npm run lint           # ESLint on src/
npm run fmt            # Prettier on src/

# Run a single test file
npx vitest run src/path/to/file.test.ts

# Run the CLI directly
npm start -- <command> [options]
# or use convenience scripts:
npm run scrape
npm run extract-entities
npm run post -- --entities "Entity1,Entity2"
npm run generate -- <post-dir>
npm run list
npm run clean
```

## Architecture

Newspapper is a CLI tool (Node.js + TypeScript) for personal news aggregation → slide generation.

**Pipeline:**
```
sources.json → scrape → extract-entities → format (REPL) → generate (Playwright→PNG)
```

Each step is a separate CLI command. Manual control is a core design principle — no background jobs, no auto-publishing.

### Module responsibilities

- **`src/commands/`** — CLI handlers; each command orchestrates modules, uses ora spinners, inquirer prompts
- **`src/storage/database.ts`** — SQLite via `better-sqlite3`; single source of truth for all state
- **`src/scrapers/`** — HTTP (axios+cheerio) default; RSS parser for feeds
- **`src/nlp/entity-extractor.ts`** — `compromise` for fast entity extraction
- **`src/renderer/`** — `@napi-rs/canvas` renders slides at 1080×1080; Sharp compresses output
- **`src/utils/config.ts`** — loads `.env` values; `src/utils/logger.ts` — shared logger

### Data storage

| Path | Contents |
|------|----------|
| `data/newspapper.db` | SQLite: articles, entities, article_entities, posts |
| `data/sources.json` | Source configs (URL, CSS selectors, scraper type) — static config, not in DB |
| `output/posts/{date}-{slug}/slides.json` | Generated slides JSON (design + tone + slides array) |
| `output/posts/{date}-{slug}/slides/` | Rendered PNG images |

Workflow states: `scraped → processed` (articles), `draft → generated` (posts)

### Design systems

Two visual themes in `design-systems/*.yaml` (`digital-broadsheet`, `warm-industrial`). Default: `warm-industrial`. Three slide types per theme: `title`, `body`, `quote`. Templates in `templates/{theme}/`.

### LLM integration

**Ollama only** — must be running (`ollama serve`); default model: `llama3.2:1b` (configurable via `OLLAMA_MODEL` in `.env`).

## Testing

Tests are co-located with source: `src/**/*.test.ts`. Run with `vitest`.

## Important constraints

- All operations are synchronous/sequential — no background jobs
- `data/` and `output/` are gitignored — don't commit generated data

## Wiki

Project documentation lives in `docs/` as a LLM-maintained wiki. `docs/index.md` is the entry point.

### Pages

| File | Contents |
|------|----------|
| `docs/index.md` | Page catalog — read this to find anything |
| `docs/log.md` | Append-only change log |
| `docs/commands.md` | CLI command reference (all 5 commands) |
| `docs/architecture.md` | System design and pipeline |
| `docs/data.md` | All JSON schemas |
| `docs/modules.md` | Module APIs and usage patterns |
| `docs/configuration.md` | Env vars, setup, and npm scripts |
| `docs/design-systems.md` | Visual theme specs |
| `docs/dependencies.md` | Package list and rationale |

### Maintenance rules

1. **When you change a command's behavior** — update the relevant section in `docs/commands.md`
2. **When you add or change a data schema** — update `docs/data.md`
3. **When you add, remove, or rename a module** — update `docs/modules.md` and `docs/architecture.md`
4. **When you add a dependency** — update `docs/dependencies.md`
5. **When you change env vars or config** — update `docs/configuration.md`
6. **After any wiki update** — append a line to `docs/log.md`:
   ```
   ## [YYYY-MM-DD] action | one-line summary of what changed
   ```
7. **If you add a new wiki page** — add it to the table in `docs/index.md`

### What NOT to put in wiki

- Generated data (`data/`, `output/`) — gitignored, ephemeral
- In-progress task state — use TodoWrite for that
- One-session debugging notes — put them in the PR description instead
