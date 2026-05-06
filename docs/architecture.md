# Architecture

Newspapper is a CLI tool (Node.js + TypeScript) for personal news aggregation and slide generation. Every phase requires an explicit user command — no background jobs, no auto-publishing.

## Pipeline

```
data/sources.json
      ↓
  scrape → data/articles/{uuid}.json
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

Articles and groups move through these states in `data/manifest.json`:

```
scraped → grouped → reviewed → summarized → generated → published
```

## Module Responsibilities

| Module | Path | Responsibility |
|--------|------|----------------|
| Commands | `src/commands/` | CLI handlers; orchestrate all other modules |
| Storage | `src/storage/` | JSON file I/O; `manifest.ts` is the central index |
| Scrapers | `src/scrapers/` | HTTP (axios+cheerio), Playwright, RSS |
| NLP | `src/nlp/` | Entity extraction (compromise), embeddings (@xenova/transformers), clustering |
| Summarizers | `src/summarizers/` | LLM (OpenAI), local (Ollama), template (rule-based) |
| Renderer | `src/renderer/` | Handlebars → HTML → Playwright screenshot → Sharp compression |
| Utils | `src/utils/` | `config.ts` (loads .env), `logger.ts` (shared logger) |

## Storage Strategy

File-based JSON — no database. The manifest (`data/manifest.json`) is the central index tracking every article, group, and summary and their relationships. All other `data/` files are content-only JSON.

**Why file-based?**
- Transparent and inspectable
- No setup or migrations
- Git-friendly
- Portable — copy `data/` anywhere

## Scraping Strategy

1. Try RSS if `source.rss` is set and `--method` is not `http`/`playwright`
2. Fall back to HTTP (axios + cheerio) for simple sites
3. Fall back to Playwright (headless Chromium) for JS-heavy sites

Playwright must be installed separately: `npx playwright install chromium`

## Summarization Methods

| Method | Quality | Cost | Requires |
|--------|---------|------|----------|
| `llm` | Best | API fees | `OPENAI_API_KEY` in `.env` |
| `local` | Good | Free | Ollama running (`ollama serve`) |
| `nlp` | Basic | Free | Nothing |

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

**Scraping:** `axios`, `cheerio`, `playwright`, `rss-parser`

**NLP/AI:** `compromise`, `@xenova/transformers`, `ollama`, `openai`

**Rendering:** `handlebars`, `js-yaml`, `sharp`

## Key Design Decisions

**Manual control everywhere** — no automatic publishing. User reviews groups, summaries, and images at each step.

**Dual strategies** for scraping, NLP, and summarization — flexibility to trade quality for cost or offline capability.

**Manifest as index** — avoids scanning thousands of JSON files for status queries; all relationships tracked centrally.

**30-day default retention** — `npm run clean --older-than=30d` keeps storage bounded; user controls timing.

## Scalability

Current design handles 10–20 sources, ~100–500 articles/day easily. If scaling beyond 100 sources, consider SQLite for the manifest (keep JSON for article content) and pagination in list commands.
