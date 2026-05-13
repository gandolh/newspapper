# Interactive Menu Options

All actions are performed through the main interactive menu. Launch it with:

```bash
npm start
```

---

## Scrape Articles

**Action:** `scrape`
**File:** `src/commands/scrape.ts`

Fetch today's articles from all enabled sources (max 10 per source).

**Behavior:**

- Loads enabled sources from `data/sources.json`
- Filters to today's articles only
- Tries RSS first; falls back to HTTP
- Saves each new article directly to SQLite (`data/newspapper.db`)
- Skips articles already in DB (deduplication by URL)

---

## Extract Entities

**Action:** `extract`
**File:** `src/commands/extract-entities.ts`

Extract named entities from all articles with status `scraped`.

**Behavior:**

- Queries SQLite for articles with status `scraped`
- Extracts people, places, organizations, events using `compromise`
- Saves entities to SQLite, links them to articles
- Updates article status to `processed`
- Prints a summary table: title, source, top entities

---

## Format Post

**Action:** `format`
**File:** `src/commands/format.ts`

Interactive REPL to generate a post JSON from articles matching given entities.

**Behavior:**

1. Prompts for entity names (comma-separated)
2. Queries SQLite for articles linked to given entities
3. Connects to Ollama, generates a short **preview** (title + description)
4. Enters REPL loop — type feedback to refine, `ok` to approve, `quit` to cancel
5. On approval: generates full slides JSON via Ollama
6. Saves to `output/posts/{date}-{entities}/slides.json`
7. Records the post in SQLite (status: `draft`)

**Requires:** Ollama running (`ollama serve`) with model configured in `.env`

---

## Generate Slides

**Action:** `generate`
**File:** `src/commands/generate.ts`

Render slides.json to PNG images using canvas rendering.

**Behavior:**

- Select from a list of formatted posts
- Reads `slides.json` from the post directory
- Renders each slide to PNG using `@napi-rs/canvas`
- Compresses images with Sharp
- Saves images to `<post-dir>/slides/`
- Updates post status in SQLite to `generated`

---

## List Items

**Action:** `list`
**File:** `src/commands/list.ts`

List articles, entities, or posts from SQLite.

---

## Clean Data

**Action:** `clean`
**File:** `src/commands/clean.ts`

Delete old articles from SQLite and old post directories.
