---
summary: The reading side's SQLite tables — sources (with the Reader's category, conditional-GET validators and last refresh outcome), saved articles (with the note), and feed_items, the Reader's stored entries — plus how an item is keyed, dated, capped and purged. The posts side and the rest of the schema are in data.md.
updated: 2026-10-09
---

# Data — sources, articles and feed items

Split out of [data.md](./data.md) on 2026-10-09, when brief 105 added
`feed_items`. Same database, same schema version (6); the routes over these
tables are in [api-reader.md](./api-reader.md).

## `sources`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | slug, e.g. `bbc` |
| `name` | TEXT NOT NULL | |
| `rss_url` | TEXT NOT NULL UNIQUE | |
| `enabled` | INTEGER NOT NULL DEFAULT 1 | |
| `created_at` | TEXT ISO-8601 | |
| `category` | TEXT | the Reader's grouping; NULL = uncategorized (v6) |
| `etag`, `last_modified` | TEXT | the feed's last validators, sent back on the next refresh (v6) |
| `last_fetched_at` | TEXT ISO-8601 | set only when a refresh got a 200 or a 304 (v6) |
| `last_error` | TEXT | why the last refresh failed; NULL once one succeeds (v6) |

Sources moved out of `data/sources.json` and into the DB in v3. The migration
seeds this table from that file once, for the default installation DB only;
nothing reads the JSON afterwards. The validators never leave the server.

## `articles`

The library: only **saved** articles. A search result or a Reader item is not
a row here until the user saves it.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `source_id` | TEXT → `sources(id)` ON DELETE SET NULL | NULL for manual or orphaned |
| `source_name` | TEXT NOT NULL DEFAULT `''` | denormalized snapshot, survives the source being deleted |
| `guid` | TEXT NOT NULL | the item's URL (the feed guid only for rows saved before v6) |
| `title` | TEXT NOT NULL | |
| `url` | TEXT | |
| `body` | TEXT NOT NULL DEFAULT `''` | |
| `published_at` | TEXT ISO-8601 | |
| `saved_at` | TEXT ISO-8601 | |
| `note` | TEXT NOT NULL DEFAULT `''` | why it was kept (v6); set on first save, then only by `PATCH /api/articles/:id` |
| | | UNIQUE `(source_id, guid)` |

Index: `idx_articles_saved_at` on `(saved_at)`. SQLite treats NULLs as distinct,
so the repository dedupes source-less articles on `guid` explicitly.

## `feed_items`

The Reader's stored entries (v6, brief 105). An item becomes an `articles` row
only when saved, and the two share the key `(source_id, guid)`, so "is this
item saved?" is a lookup.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK AUTOINCREMENT | never reused, see below |
| `source_id` | TEXT NOT NULL → `sources(id)` ON DELETE CASCADE | |
| `guid` | TEXT NOT NULL | the item's link |
| `title` | TEXT NOT NULL DEFAULT `''` | |
| `url` | TEXT NOT NULL | |
| `author` | TEXT | |
| `content_html` | TEXT NOT NULL DEFAULT `''` | the feed's HTML, **unsanitized**, capped at 256 KB |
| `content_text` | TEXT NOT NULL DEFAULT `''` | that HTML stripped: what the filter searches |
| `published_at` | TEXT ISO-8601 | as the feed dated it; NULL when undated or unparseable |
| `fetched_at` | TEXT ISO-8601 NOT NULL | |
| `sort_at` | TEXT ISO-8601 NOT NULL | the timeline position: the earlier of `published_at` and `fetched_at` |
| `read_at` | TEXT ISO-8601 | NULL = unread |
| | | UNIQUE `(source_id, guid)` |

Indexes: `idx_feed_items_sort` on `(sort_at DESC, id DESC)`, the list's keyset;
`idx_feed_items_source_read` on `(source_id, read_at)`, the counts.

- **Keyed on the link.** `guid` is the item's URL rather than the feed's
  `<guid>`, because it is the key Search already writes into `articles.guid`.
  A second refresh inserts nothing it already has (`ON CONFLICT DO NOTHING`),
  and an item with no http(s) link is not stored at all.
- **Dated defensively.** An undated item is kept and sorts at its fetch time; a
  future-dated one sorts at its fetch time too, so a feed cannot pin an item to
  the top. `rss-parser` reads the body from `content:encoded`, then `content`,
  then `summary`.
- **Capped, then sanitized late.** The HTML is stored as the feed sent it, cut
  at 256 KB on a UTF-8 boundary, and sanitized only in the browser, at render
  ([dependencies.md](./dependencies.md#ui--newspapperui)). The list never
  carries it.
- **AUTOINCREMENT on purpose.** Mark all read takes an `upToId`. That only
  means "everything the list had loaded" if a purged id is never handed out
  again, which plain `INTEGER PRIMARY KEY` does not promise.
- **Purged after each refresh.** An item older than `READER_RETENTION_DAYS`
  (by `fetched_at`) is deleted, except each source's newest 50 by `sort_at`, so
  a quiet feed never empties. Saved articles are untouched: they are their own
  rows. Deleting a source deletes its items.
