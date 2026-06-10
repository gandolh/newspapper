# Data

## SQLite — `data/newspapper.db`

Schema version: 2. Auto-created on first run. Path resolved from `core/src/storage/db.ts` (not CWD).

### `articles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | autoincrement |
| `source_id` | TEXT | matches `sources.json.id` |
| `source_name` | TEXT | matches `sources.json.name` |
| `title` | TEXT | from RSS |
| `url` | TEXT UNIQUE | dedupe key |
| `published_at` | TEXT ISO-8601 | from RSS pubDate |
| `body` | TEXT | full article body, fetched and regex-stripped |
| `created_at` | TEXT ISO-8601 | when scraped |

### `posts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | autoincrement |
| `date` | TEXT YYYY-MM-DD | run date |
| `title` | TEXT | top-level post title |
| `theme` | TEXT | e.g. `warm-industrial` |
| `payload` | TEXT JSON | PostPayload (see below) |
| `status` | TEXT | `draft` or `rendered` |
| `output_dir` | TEXT | absolute path, null until rendered |
| `created_at` | TEXT ISO-8601 | |
| `updated_at` | TEXT ISO-8601 | updated on every payload write |

### `settings`

Key-value store for user-configurable settings.

| Key | Notes |
|-----|-------|
| `ollamaHost` | Ollama API base URL |
| `ollamaApiKey` | Bearer token (Ollama Cloud only) |
| `ollamaModel` | model name |
| `defaultTheme` | template theme name |

## PostPayload JSON

Stored in `posts.payload`, returned in API responses, and written to `output/<dir>/slides.json`.

```json
{
  "date": "2026-06-10",
  "title": "Post Title",
  "theme": "warm-industrial",
  "slides": [
    { "type": "title", "variant": "title-main", "text": "…", "kicker": "…" },
    { "type": "body",  "variant": "body-text",  "heading": "…", "body": "…" },
    { "type": "body",  "variant": "body-list",  "heading": "…", "items": ["…"] },
    { "type": "quote", "variant": "quote-classic", "quote": "…", "attribution": "…" }
  ],
  "caption": "Optional Instagram caption",
  "hashtags": ["optional", "tags"]
}
```

### Slide variants

| type | variant | Required fields |
|------|---------|-----------------|
| `title` | `title-main` | `text`, optional `kicker` |
| `title` | `title-statement` | `text` |
| `title` | `title-question` | `text` |
| `body` | `body-text` | `heading`, `body` |
| `body` | `body-list` | `heading`, `items: string[]` |
| `body` | `body-comparison` | `heading`, `left: {label,body}`, `right: {label,body}` |
| `quote` | `quote-classic` | `quote`, `attribution` |
| `quote` | `quote-pullout` | `quote`, `attribution` |
| `quote` | `quote-reaction` | `quote`, `attribution` |

Slide count: 2–8 inclusive. First slide must be a title variant.

## TemplateDoc format — `assets/templates/<theme>/<id>.json`

```json
{
  "id": "title-main",
  "theme": "warm-industrial",
  "family": "title",
  "name": "Title — Main",
  "fields": [
    { "key": "text", "label": "Headline", "kind": "textarea", "required": true },
    { "key": "kicker", "label": "Kicker", "kind": "text", "required": false }
  ],
  "sample": { "text": "Big News Today", "kicker": "Breaking" },
  "root": { /* TNode tree */ }
}
```

### TNode types

| kind | Fields | Description |
|------|--------|-------------|
| `box` | `style?`, `children: TNode[]` | Flex container div |
| `text` | `text: string`, `style?` | Text node; supports `{{binding}}` |
| `repeat` | `source: string`, `style?`, `children: TNode[]` | Iterates `data[source]` array |

### TStyle

CSS property map. Supports:
- Numbers → appended with `px` (except unitless: `fontWeight`, `lineHeight`, `opacity`, `flex`, `flexGrow`, `flexShrink`, `zIndex`, `order`)
- `"$color.key"`, `"$spacing.key"`, `"$rounded.key"` → resolved from theme tokens
- `"typography": "key"` → expands full typography token set into CSS properties
- Any other string → passed through verbatim

### Bindings in text nodes

`{{fieldName}}`, `{{item.label}}`, `{{_index}}`, `{{_total}}`, `{{_date}}`

## `data/sources.json`

```json
[
  {
    "id": "bbc",
    "name": "BBC World",
    "rss": "http://feeds.bbci.co.uk/news/world/rss.xml",
    "enabled": true
  }
]
```

## `data/prompt.md`

System prompt used by `composePost`. Reset via `POST /api/prompt/reset`.

## Output directory

```
output/
  YYYY-MM-DD-1/
    1.png, 2.png, …N.png   (1080×1080 PNG, one per slide)
    slides.json             (PostPayload at render time)
    caption.txt             (present only if caption was set before render)
  YYYY-MM-DD-2/             (same-day re-render → increments N)
```
