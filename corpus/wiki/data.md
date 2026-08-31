---
summary: On-disk and in-DB shapes — the v4 SQLite schema for authored posts, the TNode compile target, and the output/YYYY-MM-DD-N convention. Nothing here is a file format the user edits; the .wzd document is in markup.md.
updated: 2026-08-31
---

# Data

## SQLite — `data/newspapper.db`

Schema version: **4**. Auto-created and migrated on boot. The path is resolved
from `core/src/storage/db.ts` via `import.meta.url`, never from the CWD.
Foreign keys are enforced (`PRAGMA foreign_keys = ON`).

**The `.wzd` markup is the source of truth.** `posts.markup` is the document; every
other column on `posts` — title, description, keywords — is *derived from its
`<head>` block on save* and exists only so the library can be listed, filtered
and searched without parsing every post. See
[the decision](./decisions.md#the-markup-is-the-source-of-truth) and
[markup.md](./markup.md) for the `<head>` shape.

### `posts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | autoincrement |
| `title` | TEXT NOT NULL | derived from `<head><title>` |
| `description` | TEXT NOT NULL DEFAULT `''` | derived from `<head><description>` |
| `markup` | TEXT NOT NULL | the `.wzd` document — the source of truth |
| `theme` | TEXT NOT NULL DEFAULT `warm-industrial-1` | one of [the three themes](./design-systems.md) |
| `status` | TEXT NOT NULL DEFAULT `draft` | `CHECK (status IN ('draft','published'))` |
| `created_at` / `updated_at` | TEXT ISO-8601 | `updated_at` bumped on every markup write |
| `published_at` | TEXT ISO-8601 \| NULL | stamped on publish, cleared on unpublish |

Index: `idx_posts_status_updated_at` on `(status, updated_at)`.

**v3 → v4** (brief 65) rewrote `posts.theme`, the `defaultTheme` setting and the
column default to `'warm-industrial-1'`. The default needs a table rebuild, so
`posts` is copied and renamed with `PRAGMA foreign_keys` briefly off — `DROP
TABLE posts` would cascade `post_keywords` and `renders` away. Skipped unless
`sqlite_master` still holds the legacy default, so a re-run is a no-op.

`published` is a [manual state](./decisions.md#publishing-is-a-manual-state-that-optimizes-the-output),
never automatic.

### `keywords` / `post_keywords`

| `keywords` | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `name` | TEXT NOT NULL UNIQUE COLLATE NOCASE | `Budget` and `budget` are one keyword |

| `post_keywords` | Type | Notes |
|--------|------|-------|
| `post_id` | INTEGER → `posts(id)` ON DELETE CASCADE | |
| `keyword_id` | INTEGER → `keywords(id)` ON DELETE CASCADE | |
| | | PRIMARY KEY `(post_id, keyword_id)` |

Index: `idx_post_keywords_keyword_id` on `(keyword_id)`.

Normalized rather than a comma-joined column because keywords are shared across
posts and used to filter the library — a text column would make that a scan.
Derived from `<head><keywords>`; `setPostKeywords` upserts and replaces the join
rows in one transaction.

### `renders`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `post_id` | INTEGER → `posts(id)` ON DELETE CASCADE | |
| `output_dir` | TEXT NOT NULL | absolute path |
| `slide_count` | INTEGER NOT NULL DEFAULT 0 | |
| `optimized` | INTEGER NOT NULL DEFAULT 0 | set by the publish-time pass |
| `created_at` | TEXT ISO-8601 | |

One row per render run; a post's export and thumbnail read the newest.

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `username` | TEXT NOT NULL UNIQUE | |
| `password_hash` | TEXT NOT NULL | hashing is the caller's job — storage never sees plaintext |
| `created_at` | TEXT ISO-8601 | |

### `sources`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | slug, e.g. `bbc` |
| `name` | TEXT NOT NULL | |
| `rss_url` | TEXT NOT NULL UNIQUE | |
| `enabled` | INTEGER NOT NULL DEFAULT 1 | |
| `created_at` | TEXT ISO-8601 | |

Sources moved out of `data/sources.json` and into the DB in v3. The migration
seeds this table from that file once, for the default installation DB only;
nothing reads the JSON afterwards.

### `articles`

Holds only **saved** articles. Scrape results are transient — the API returns
them and never persists them unless the user saves one.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `source_id` | TEXT → `sources(id)` ON DELETE SET NULL | NULL for manual or orphaned |
| `source_name` | TEXT NOT NULL DEFAULT `''` | denormalized snapshot — survives the source being deleted |
| `guid` | TEXT NOT NULL | feed guid, or the URL |
| `title` | TEXT NOT NULL | |
| `url` | TEXT | |
| `body` | TEXT NOT NULL DEFAULT `''` | |
| `published_at` | TEXT ISO-8601 | |
| `saved_at` | TEXT ISO-8601 | |
| | | UNIQUE `(source_id, guid)` |

Index: `idx_articles_saved_at` on `(saved_at)`. SQLite treats NULLs as distinct,
so the repository dedupes source-less articles on `guid` explicitly.

### `uploads`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `filename` | TEXT NOT NULL | original name |
| `stored_path` | TEXT NOT NULL | the kept original |
| `normalized_path` | TEXT | the derived copy, NULL until made |
| `mime` | TEXT NOT NULL | |
| `width`, `height` | INTEGER | |
| `bytes` | INTEGER NOT NULL DEFAULT 0 | |
| `created_at` | TEXT ISO-8601 | |

Rows only — the files live under `uploads/`. **`settings`** is a key-value
table with exactly one key, `defaultTheme`.

## Migration history

| Version | Shape |
|---|---|
| 1 | CLI era: `posts(date, run_number, payload, output_dir)`, `articles(scraped_at)` |
| 2 | Web app: `posts.payload` + `status draft\|rendered` + `output_dir`, `settings` |
| 3 | Authored posts: `posts.markup`, `keywords`, `post_keywords`, `renders`, `users`, `uploads`, `sources` in the DB |
| 4 | The theme family: `warm-industrial` → `warm-industrial-1` in `posts.theme`, the column default, and the `defaultTheme` setting |

A fresh database is created at version 4 directly; an existing one walks every
step in one boot. `migrate()` (`core/src/storage/db.ts`) keys on
`PRAGMA user_version` and uses `IF NOT EXISTS` throughout, so re-running is a
no-op.

**v2 → v3 destroys rows on purpose.** A v2 post held a composed slide payload
with no markup to derive it from, and v2 articles were transient scrape output.
Both tables are dropped and recreated, so **every v2 post row and every v2
article row is deleted**. `settings` survives untouched. A v1 database walks
v1 → v2 → v3 in one boot and loses its posts the same way.

## TNode — the `.wzd` compile target

Not an on-disk format: the JSON template files went with
[the template system](decisions.md#the-template-system-is-removed) (brief 58).
`TNode` is in-memory only — `core/src/wizard/compile.ts` builds one per
`<Slide>`, and `renderTemplate` walks it into HTML.

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

**Bindings in text nodes**: `{{fieldName}}`, `{{item.label}}`, `{{_index}}`,
`{{_total}}`, `{{_date}}`. The compiler resolves `<head>` fields before the
interpreter sees the tree; `_index`/`_total` come from `renderTemplate`'s
options — that is how `<PageCounter/>` gets its numbers.

## Output directory

```
output/
  YYYY-MM-DD-1/
    slide-01.jpg, slide-02.jpg, …slide-NN.jpg   (1080×1080, one per slide)
    slides.json
    caption.txt             (present only if a caption was set before render)
  YYYY-MM-DD-2/             (same-day re-render → increments N)
```

JPEG only, no `.png` ([decisions.md](decisions.md#output-is-jpeg-not-png)) —
draft quality ~92; `writeRun` deletes any stale `.png` it finds in the target
dir. `POST /api/posts/:id/publish` (`core/src/publish`) re-encodes in place at
~85 and flags the render `optimized`, guarding a repeat publish from
re-degrading the image.

Each directory is recorded as a row in `renders`.
