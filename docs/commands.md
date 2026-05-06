# CLI Commands

All commands run via npm scripts. Entry point: `tsx src/index.ts`.

```bash
npm start -- <command> [options]
# or convenience aliases:
npm run scrape
npm run group
npm run extract-entities
npm run query-entities
npm run summarize
npm run generate
npm run export
npm run clean
npm run list
```

---

## scrape

**File:** `src/commands/scrape.ts`

Fetch articles from configured sources in `data/sources.json`.

```bash
npm run scrape [options]

Options:
  --sources <ids>    Comma-separated source IDs or names
  --method <method>  Force method: http | playwright | rss
  --limit <n>        Max articles per source
```

**Behavior:**
- Loads enabled sources from `data/sources.json`
- Tries RSS first (if `source.rss` exists and `--method` is not `http`/`playwright`)
- Falls back to HTTP (axios+cheerio) or Playwright scraping
- Saves each article to `data/articles/{uuid}.json`
- Updates `data/manifest.json` with new article entries (status: `scraped`)

**Output:** Article count per source, total saved.

**Next step:** `npm run group`

---

## group

**File:** `src/commands/group.ts`

Cluster articles by similarity using embeddings or shared entities.

```bash
npm run group [options]

Options:
  --threshold <n>       Similarity threshold 0.0–1.0 (default: 0.75)
  --method <method>     embeddings | entities (default: embeddings)
  --min-group-size <n>  Minimum articles per group (default: 2)
```

**Behavior:**
- Loads ungrouped articles from manifest
- Generates embeddings (`@xenova/transformers`) or extracts entities (`compromise`)
- Clusters by cosine similarity
- Shows proposed groups in an interactive TUI (inquirer):
  - Accept group
  - Merge with another group
  - Split group
  - Remove articles
  - Delete group
- Saves approved groups to `data/groups/{uuid}.json`
- Updates manifest (`status: grouped` for articles, new group entries)

**Key exported functions:**
- `extractKeywords(articles, commonEntities)` — keyword extraction for group naming

**Next step:** `npm run summarize <group-id>`

---

## extract-entities

**File:** `src/commands/extract-entities.ts`

Extract named entities (people, places, organizations, events) from articles.

```bash
npm run extract-entities [article-id] [options]

Options:
  --method <method>  compromise | transformers (default: compromise)
  --all              Extract from all ungrouped articles
```

**Behavior:**
- Single article: loads by ID, extracts entities, saves to `data/entities/{article-id}.json`
- `--all`: prompts for confirmation, processes all articles without entity data
- Updates manifest `hasEntities` flag per article

**Key exported functions:**
- `formatSingleArticleSummary(title, entities)` — formatted entity display
- `formatAggregateSummary(entitySets)` — summary across multiple articles

**Next step:** `npm run query-entities` or `npm run group --method=entities`

---

## query-entities

**File:** `src/commands/query-entities.ts`

Search articles and groups by entity name.

```bash
npm run query-entities [options]

Required:
  --type <type>   person | place | organization | event
  --name <name>   Entity name to search for

Options:
  --days <n>      Look back N days (default: 30)
  --related       Show frequently co-mentioned entities
  --timeline      Show ASCII article timeline
```

**Behavior:**
- Searches `data/entities/` for articles matching `--type`/`--name`
- Displays matching articles in a table (title, source, date)
- Lists groups containing those articles
- `--related`: shows other entities co-mentioned with the searched entity
- `--timeline`: ASCII chart of article counts over time

**Key exported functions:**
- `formatRelated(results, searchedName)` — related entity display
- `buildTimeline(results, days)` — ASCII timeline

**Type mapping:** `person→people`, `place→places`, `organization→organizations`, `event→events`

---

## summarize

**File:** `src/commands/summarize.ts`

Generate slide content from a group of articles.

```bash
npm run summarize <group-id> [options]

Options:
  --method <method>    llm | local | nlp (default: local)
  --tone <tone>        optimistic | analytical (default: analytical)
  --design <design>    broadsheet | industrial (default: broadsheet)
  --max-slides <n>     Maximum slides (default: 8)
  --emphasis <text>    Key points to emphasize
  --exclude <ids>      Comma-separated article IDs to exclude
```

**Methods:**
- `llm` — OpenAI API (requires `OPENAI_API_KEY` in `.env`)
- `local` — Ollama (requires `ollama serve`; default model: `llama3.2:1b`)
- `nlp` — Template/rule-based fallback, no LLM required

**Behavior:**
- Shows articles in group as a table
- User confirms which articles to include (inquirer)
- Generates slides via chosen method
- Previews all slides in terminal
- User can regenerate with different parameters
- Saves to `data/summaries/{uuid}.json`
- Updates manifest (`status: summarized` for group)

**Key exported functions:**
- `formatSlidePreview(slides)` — terminal preview of all slides
- `formatArticleTable(articles)` — table of articles in group

**Next step:** `npm run generate <group-id>`

---

## generate

**File:** `src/commands/generate.ts`

Render summary slides to PNG images via Playwright.

```bash
npm run generate <group-id> [options]

Options:
  --summary-id <id>   Use specific summary (if multiple exist for group)
  --format <fmt>      png | jpg (default: png)
  --quality <n>       Compression quality 0–100 (default: 90)
  --size <WxH>        Image dimensions (default: 1080x1080)
```

**Behavior:**
- Loads group, summary, articles, and sources
- Builds HTML per slide using Handlebars templates in `templates/{design}/`
- Screenshots each slide with Playwright at specified dimensions
- Compresses output with Sharp
- Saves to `output/{group-id}/slides/01-title.png`, etc.
- Writes `output/{group-id}/metadata.json`
- Updates manifest (`status: generated` for group)

**Requires:** `npx playwright install chromium` (one-time setup)

**Key exported functions:**
- `buildMetadata(input)` — constructs metadata.json content

**Next step:** `npm run export <group-id>`

---

## export

**File:** `src/commands/export.ts`

Copy slides and metadata to a destination directory, mark as published.

```bash
npm run export <group-id> [options]

Options:
  --destination <path>  Export location (default: prompted interactively)
```

**Behavior:**
- Checks `output/{group-id}/slides/` for PNG/JPG files
- Prompts for destination if not provided
- Copies slides + `metadata.json` + `summary.json` to destination
- Updates manifest (`status: published` for group)

**Key exported functions:**
- `resolveDestination(destination)` — resolves relative paths to absolute
- `formatExportSummary(destination, imageFiles)` — terminal summary of export

---

## clean

**File:** `src/commands/clean.ts`

Delete old articles, groups, and summaries.

```bash
npm run clean [options]

Options:
  --older-than <Nd>  Delete items older than N days (default: 30d)
  --status <status>  Only delete items with this status
  --dry-run          Show what would be deleted without deleting
  --force            Skip confirmation prompt
```

**Behavior:**
- Parses `--older-than` as `Nd` format (e.g. `30d`, `7d`)
- Shows table of items to be deleted
- Asks for confirmation unless `--force`
- Deletes JSON files from `data/articles/`, `data/groups/`, `data/summaries/`
- Updates manifest to remove deleted entries

**Key exported functions:**
- `parseOlderThan(value, now?)` — parses `"30d"` → `Date` cutoff
- `filterDeletable(entries, cutoff, statusFilter?)` — filters entries for deletion

---

## list

**File:** `src/commands/list.ts`

List articles, groups, or summaries from the manifest.

```bash
npm run list [options]

Options:
  --type <type>      articles | groups | summaries (default: groups)
  --status <status>  Filter by status
  --source <name>    Filter articles by source name
  --days <n>         Only show items from last N days
  --format <fmt>     table | json (default: table)
```

**Behavior:**
- Reads manifest and formats as table or JSON
- Articles table: ID, title, source, status, date, group assignment
- Groups table: ID, article count, status, date
- Summaries table: ID, group ID, method, tone, design, status, date

**Key exported functions:**
- `filterByDays(entries, days, now?)` — filters entries by age
- `filterArticlesBySource(articles, sourceName, sources)` — filters by source name
- `formatStats(count, type)` — formats count line

---

## Workflow: Scrape to Publish

```bash
npm run scrape
npm run group --threshold=0.75
npm run summarize <group-id> --method=local --tone=analytical
npm run generate <group-id>
npm run export <group-id>
npm run clean --status=published --older-than=7d
```

## Workflow: No LLM (template only)

```bash
npm run scrape
npm run group --method=entities
npm run summarize <group-id> --method=nlp
npm run generate <group-id>
npm run export <group-id>
```
