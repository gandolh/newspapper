# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # TypeScript compilation to dist/
npm run test           # Run all tests (vitest)
npm run test:watch     # Watch mode
npm run lint           # ESLint on src/
npm run format         # Prettier on src/

# Run a single test file
npx vitest run src/path/to/file.test.ts

# Run the CLI directly
npm start -- <command> [options]
# or use convenience scripts:
npm run scrape
npm run group
npm run summarize
npm run generate
npm run export
npm run clean
npm run list
```

## Architecture

Newspapper is a CLI tool (Node.js + TypeScript) for personal news aggregation → slide generation.

**Pipeline:**
```
sources.json → scrape → articles (JSON) → group (embeddings) → summarize (LLM/local/template) → generate (Playwright→PNG) → export
```

Each step is a separate CLI command. Manual control is a core design principle — no background jobs, no auto-publishing.

### Module responsibilities

- **`src/commands/`** — CLI handlers; each command orchestrates modules, uses ora spinners, inquirer prompts, and updates the manifest
- **`src/storage/`** — JSON file I/O; `manifest.ts` is the central index for all articles/groups/summaries and their relationships; update manifest after every write
- **`src/scrapers/`** — HTTP (axios+cheerio) is default; Playwright fallback for JS-heavy sites; RSS parser for feeds
- **`src/nlp/`** — `compromise` for fast entity extraction; `@xenova/transformers` for sentence embeddings used in clustering
- **`src/summarizers/`** — LLM (OpenAI), local (Ollama), template (rule-based, no AI); selected per command invocation
- **`src/renderer/`** — Handlebars compiles HTML templates; Playwright screenshots at 1080×1920; Sharp compresses output
- **`src/utils/config.ts`** — loads `.env` values; `src/utils/logger.ts` — shared logger

### Data storage

All state lives under `data/` as JSON files (no database):

| Path | Contents |
|------|----------|
| `data/manifest.json` | Central index: all article/group/summary IDs, statuses, and relationships |
| `data/sources.json` | Trusted source configs (URL, CSS selectors, scraper type) |
| `data/articles/{uuid}.json` | Full article content |
| `data/groups/{uuid}.json` | Clustered article IDs + centroid + commonEntities |
| `data/summaries/{uuid}.json` | Slides array + method/tone/design metadata |
| `data/entities/{uuid}.json` | Extracted people/places/orgs/events per article |

Workflow states: `scraped → grouped → reviewed → summarized → generated → published`

### Design systems

Two visual themes in `design-systems/*.yaml` (`digital-broadsheet`, `warm-industrial`). Four slide types per theme in `templates/{theme}/{title,body,quote,image-caption}.html`. Slide templates use Handlebars — CSS lint errors in templates are expected and harmless.

### LLM integration

- **Ollama** (local, default): must be running; uses Llama 3.2 1B by default
- **OpenAI**: requires `OPENAI_API_KEY` in `.env`
- **Template**: rule-based fallback, no AI needed

Playwright must have browsers installed (`npx playwright install`) for both scraping JS-heavy sites and rendering slides.

## Testing

Tests are co-located with source: `src/**/*.test.ts`. Run with `vitest`. Tests cover storage, NLP, scrapers, summarizers, and renderer modules. Commands are tested via integration against real module calls; avoid mocking storage when possible to catch schema drift.

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
| `docs/commands.md` | CLI command reference (all 9 commands) |
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
