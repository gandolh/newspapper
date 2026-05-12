# CLI Commands

All commands run via npm scripts. Entry point: `tsx src/index.ts`.

```bash
npm run scrape
npm run extract-entities
npm run post -- --entities "Entity1,Entity2"
npm run generate -- <post-dir>
npm run list
npm run clean
```

---

## scrape

**File:** `src/commands/scrape.ts`

Fetch today's articles from all enabled sources (max 10 per source).

```bash
npm run scrape [options]

Options:
  --sources <ids>    Comma-separated source IDs or names
  --method <method>  Force method: http | rss
  --limit <n>        Max articles per source (default: 10)
```

**Behavior:**
- Loads enabled sources from `data/sources.json`
- Filters to today's articles only
- Tries RSS first; falls back to HTTP (axios+cheerio)
- Saves each new article directly to SQLite (`data/newspapper.db`)
- Extracts entities inline and saves to SQLite (status: `scraped`)
- Skips articles already in DB (deduplication by URL)

**Next step:** `npm run extract-entities`

---

## extract-entities

**File:** `src/commands/extract-entities.ts`

Extract named entities from all articles with status `scraped`.

```bash
npm run extract-entities
```

**Behavior:**
- Queries SQLite for articles with status `scraped`
- Extracts people, places, organizations, events using `compromise`
- Saves entities to SQLite, links them to articles
- Updates article status to `processed`
- Prints a summary table: title, source, top entities

**Next step:** `npm run post -- --entities "Entity1,Entity2"`

---

## format (post)

**File:** `src/commands/format.ts`

Interactive REPL to generate a post JSON from articles matching given entities.

```bash
npm run post -- --entities "Entity1,Entity2" [options]

Options:
  --entities <list>    Required. Comma-separated entity names
  --tone <tone>        Tone of the post (default: friendly)
  --design <design>    warm-industrial | digital-broadsheet (default: warm-industrial)
  --max-slides <n>     Max number of slides (default: 8)
```

**Behavior:**
1. Queries SQLite for articles linked to given entities
2. Connects to Ollama, generates a short **preview** (title + 2-3 sentence description)
3. Enters REPL loop — type feedback to refine, `ok` to approve, `quit` to cancel
4. On approval: generates full slides JSON via Ollama
5. Saves to `output/posts/{date}-{entity1}-{entity2}-{entity3}/slides.json`
6. Records the post in SQLite (status: `draft`)

**Requires:** Ollama running (`ollama serve`) with model configured in `.env`

**Output path:** `output/posts/YYYY-MM-DD-entity1-entity2-entity3/`

**Next step:** `npm run generate -- <post-dir>`

---

## generate

**File:** `src/commands/generate.ts`

Render slides.json to PNG images using canvas rendering.

```bash
npm run generate -- <post-dir>

Example:
  npm run generate -- output/posts/2026-05-12-romania-nato-ue
```

**Behavior:**
- Reads `slides.json` from the given post directory
- Renders each slide to PNG using `@napi-rs/canvas`
- Compresses images with Sharp
- Saves images to `<post-dir>/slides/`
- Updates post status in SQLite to `generated`

---

## list

**File:** `src/commands/list.ts`

List articles, entities, or posts from SQLite.

```bash
npm run list [options]

Options:
  --type <type>      articles | entities | posts (default: articles)
  --status <status>  Filter by status (or entity type when --type=entities)
  --source <name>    Filter articles by source name
  --days <n>         Only show items from last N days
  --format <fmt>     table | json (default: table)
```

---

## clean

**File:** `src/commands/clean.ts`

Delete old articles from SQLite and old post directories.

```bash
npm run clean [options]

Options:
  --older-than <Nd>  Delete items older than N days (default: 30d)
  --dry-run          Show what would be deleted without deleting
  --force            Skip confirmation prompt
```

---

## Standard Workflow

```bash
npm run scrape
npm run extract-entities
npm run post -- --entities "Romania,NATO"
# review preview, iterate, approve
npm run generate -- output/posts/2026-05-12-romania-nato
npm run clean --older-than=30d
```
