# Architecture

Newspapper is a CLI tool (Node.js + TypeScript) for personal news aggregation and slide generation. Every phase requires an explicit user command — no background jobs, no auto-publishing.

## Pipeline

```
data/sources.json
      ↓
  scrape → data/raw-articles/YYYY-MM-DD/source-id/{uuid}.json
      ↓
  entity extraction (automatic) → SQLite database
      ↓
  group  → data/groups/{uuid}.json
      ↓
 summarize → data/summaries/{uuid}.json
      ↓
 generate → output/{group-id}/slides/*.png
      ↓
  export → destination/
```

## Workflow States

Articles move through these states tracked in SQLite:

```
scraped → grouped → reviewed → summarized → generated → published
```

Groups and summaries still use `data/manifest.json` for backward compatibility (will migrate to SQLite in future).

## Module Responsibilities

| Module      | Path               | Responsibility                                                                |
| ----------- | ------------------ | ----------------------------------------------------------------------------- |
| Commands    | `src/commands/`    | CLI handlers; orchestrate all other modules                                   |
| Storage     | `src/storage/`     | SQLite database (`database.ts`), JSON files, manifest for groups/summaries    |
| Scrapers    | `src/scrapers/`    | HTTP (axios+cheerio), Playwright, RSS                                         |
| NLP         | `src/nlp/`         | Entity extraction (compromise), embeddings (@xenova/transformers), clustering |
| Summarizers | `src/summarizers/` | LLM (OpenAI), local (Ollama), template (rule-based)                           |
| Renderer    | `src/renderer/`    | Handlebars → HTML → Playwright screenshot → Sharp compression                 |
| Utils       | `src/utils/`       | `config.ts` (loads .env), `logger.ts` (shared logger)                         |

## Storage Strategy

**Dual storage system**:

1. **SQLite Database** (`data/newspapper.db`) - Primary storage for:
   - Article metadata and relationships
   - Extracted entities with search capabilities
   - Article status and grouping information

2. **Raw JSON Files** (`data/raw-articles/YYYY-MM-DD/source-id/`) - Complete article content:
   - Full article text and metadata
   - Organized by date and source for easy backup
   - Human-readable and portable

3. **Legacy Manifest** (`data/manifest.json`) - Groups and summaries (temporary):
   - Will be migrated to SQLite in future updates

**Why this hybrid approach?**

- SQLite provides fast entity queries and relationships
- JSON files preserve complete article content transparently
- Daily organization enables easy backup and analysis
- Database ensures data integrity and performance

## Scraping Strategy

1. Try RSS if `source.rss` is set and `--method` is not `http`/`playwright`
2. Fall back to HTTP (axios + cheerio) for simple sites
3. Fall back to Playwright (headless Chromium) for JS-heavy sites
4. **Automatic entity extraction** after each successful scrape:
   - Extract people, places, organizations, events using compromise
   - Store in SQLite with article relationships
   - Enable historical entity tracking

Playwright must be installed separately: `npx playwright install chromium`

## Summarization Methods

| Method  | Quality | Cost     | Requires                        |
| ------- | ------- | -------- | ------------------------------- |
| `llm`   | Best    | API fees | `OPENAI_API_KEY` in `.env`      |
| `local` | Good    | Free     | Ollama running (`ollama serve`) |
| `nlp`   | Basic   | Free     | Nothing                         |

## Rendering

Slides are rendered at 1080×1080px (Instagram post format) by default. Each slide type has an HTML template in `templates/{design}/`. Handlebars fills in variables, Playwright screenshots the result, Sharp compresses the PNG.

CSS lint errors in templates are expected — Handlebars variables like `{{colors.surface}}` confuse the linter but work fine at runtime.

## Design Systems

Two themes: `digital-broadsheet` (editorial, serif, high-contrast borders) and `warm-industrial` (soft brutalism, terracotta, rounded corners). Each has four slide templates: `title`, `body`, `quote`, `image-caption`. Configured via `design-systems/*.yaml`.

See [design-systems.md](design-systems.md) for full visual specs.

## Tech Stack

**Runtime:** Node.js v18+ with TypeScript 5.5.4, executed via `tsx` (no separate build step needed for development)

**Dev tooling:** `vitest` (tests), `eslint` + `@typescript-eslint` (linting), `prettier` (formatting)

**Core:** `commander` (CLI), `inquirer` (prompts), `ora` (spinners), `chalk` (colors), `cli-table3` (tables)

**Database:** `better-sqlite3` (SQLite database), `@types/better-sqlite3`

**Scraping:** `axios`, `cheerio`, `playwright`, `rss-parser`

**NLP/AI:** `compromise`, `@xenova/transformers`, `ollama`, `openai`

**Rendering:** `handlebars`, `js-yaml`, `sharp`

## Key Design Decisions

**Manual control everywhere** — no automatic publishing. User reviews groups, summaries, and images at each step.

**Dual strategies** for scraping, NLP, and summarization — flexibility to trade quality for cost or offline capability.

**Hybrid storage** — SQLite for performance and relationships, JSON for transparency and portability.

**Automatic entity extraction** — entities are extracted during scraping to enable historical tracking without manual commands.

**Daily organization** — articles organized by date/source for easy backup and temporal analysis.

**30-day default retention** — `npm run clean --older-than=30d` keeps storage bounded; user controls timing.

## Scalability

Current design with SQLite database handles 100+ sources, ~1000+ articles/day easily. The database provides:

- Fast entity queries across millions of articles
- Efficient filtering by date, source, and status
- Scalable relationship tracking

**Performance considerations:**

- SQLite handles current scale well; consider PostgreSQL for enterprise scale
- Daily JSON organization keeps individual files manageable
- Entity extraction adds processing time but enables powerful queries

**Future scaling options:**

- Migrate groups/summaries to SQLite (already planned)
- Add database indexes for specific query patterns
- Implement pagination for large result sets
