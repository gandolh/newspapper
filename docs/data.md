# Data

Two storage layers: SQLite for state, filesystem for rendered output. Plus one static config file (`data/sources.json`).

## `data/sources.json`

Static config, hand-edited. Array of source objects.

```json
[
  {
    "id": "bbc-world",
    "name": "BBC World",
    "rss": "https://feeds.bbci.co.uk/news/world/rss.xml",
    "enabled": true
  }
]
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Stable slug, used as foreign key in `articles.source_id`. |
| `name` | string | yes | Human label for `newspapper sources` output. |
| `rss` | string | yes | RSS or Atom feed URL. Parsed by `rss-parser`. |
| `enabled` | boolean | yes | Skipped during scrape if false. |

There are no CSS selectors, no scraper-type discriminator, no per-source auth. RSS gives us the item list; the article body is fetched separately and regex-stripped.

## SQLite (`data/newspapper.db`)

Created on first run by `src/storage/db.ts`. Two tables.

### `articles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | autoincrement |
| `source_id` | TEXT | matches `sources.json.id` |
| `url` | TEXT UNIQUE | dedupe key |
| `title` | TEXT | from RSS `<title>` |
| `summary` | TEXT | from RSS `<description>` / `content:encoded` |
| `body` | TEXT | full article body, fetched from `url` and regex-stripped to plain text. Empty string on fetch failure. |
| `published_at` | TEXT (ISO 8601) | from RSS `<pubDate>` |
| `scraped_at` | TEXT (ISO 8601) | when this row was inserted |

### `posts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | autoincrement |
| `date` | TEXT (YYYY-MM-DD) | local date the run was kicked off |
| `run_number` | INTEGER | 1 for first run that day, 2 for the next, … |
| `payload` | TEXT (JSON) | the full post object — see below |
| `output_dir` | TEXT | absolute path to the rendered folder |
| `created_at` | TEXT (ISO 8601) | when compose finished |

`UNIQUE(date, run_number)`.

## Post payload (stored in `posts.payload`, also written to `output/<dir>/slides.json`)

```json
{
  "date": "2026-05-18",
  "title": "Markets, Migration, and a New Mars Plan",
  "theme": "warm-industrial",
  "slides": [
    { "type": "title", "variant": "title-main", "text": "…", "kicker": "…" },
    { "type": "body",  "variant": "body-text", "heading": "…", "body": "…" },
    { "type": "body",  "variant": "body-list", "heading": "…", "items": ["…", "…"] },
    { "type": "quote", "variant": "quote-pullout", "quote": "…", "attribution": "…" }
  ]
}
```

### Slide types and variants

Variants map 1:1 to JSX components under `src/render/slides/` and to the reference HTML in `templates/warm-industrial/`.

| `type` | `variant` | Required fields |
|--------|-----------|-----------------|
| `title` | `title-main` | `text`, optional `kicker` |
| `title` | `title-statement` | `text` |
| `title` | `title-question` | `text` |
| `body` | `body-text` | `heading`, `body` |
| `body` | `body-list` | `heading`, `items` (string[]) |
| `body` | `body-comparison` | `heading`, `left`, `right` (each `{label, body}`) |
| `quote` | `quote-classic` | `quote`, `attribution` |
| `quote` | `quote-pullout` | `quote`, `attribution` |
| `quote` | `quote-reaction` | `quote`, `attribution` |

Slide count: between 2 and 8 inclusive. The composer prompt enforces this; the renderer rejects payloads outside that range.

## Filesystem output

```
output/
└── 2026-05-18-1/
    ├── slides.json     # the post payload, identical to posts.payload
    ├── 1.png           # 1080×1080
    ├── 2.png
    └── …
```

Filenames are 1-indexed and match the order of `slides[]`.
