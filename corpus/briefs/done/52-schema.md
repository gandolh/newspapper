# Task 52 — SQLite schema for authored posts

## Context

Posts are now authored documents, not composed payloads:
[the markup is the source of truth](../../wiki/decisions.md#the-markup-is-the-source-of-truth),
`<head>` owns the metadata, and SQLite columns are a derived index for listing
and search. Posts are also
[titled and unlimited](../../wiki/decisions.md#posts-are-titled-and-unlimited-not-one-per-day)
with a manual [`published`](../../wiki/decisions.md#publishing-is-a-manual-state-that-optimizes-the-output)
state.

The DB is at schema version 2 and holds only development data (33 articles,
1 post). It is gitignored and disposable — the migration may drop rows.

## Files you OWN

- `core/src/storage/db.ts` (migration to version 3)
- `core/src/storage/posts.ts`, `core/src/storage/articles.ts`,
  `core/src/storage/sources.ts`
- New: `core/src/storage/{keywords,uploads,users,renders}.ts` as needed
- `core/src/types.ts` — the row types
- `corpus/wiki/data.md`

## Files you must NOT touch

Any API route or UI file. Brief 62 rewires the routes; this brief lands the
storage layer and its types only.

## What to do

Migrate to **schema version 3**:

```sql
users (id, username UNIQUE, password_hash, created_at)

posts (
  id, title NOT NULL, description, markup TEXT NOT NULL, theme NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at, updated_at, published_at
)
keywords (id, name TEXT NOT NULL UNIQUE COLLATE NOCASE)
post_keywords (post_id, keyword_id, PRIMARY KEY (post_id, keyword_id))

renders (id, post_id REFERENCES posts ON DELETE CASCADE,
         output_dir, slide_count, optimized DEFAULT 0, created_at)

sources  (id, name, rss_url UNIQUE, enabled DEFAULT 1, created_at)
articles (id, source_id REFERENCES sources ON DELETE SET NULL, source_name,
          guid, title, url, body, published_at, saved_at,
          UNIQUE (source_id, guid))

uploads (id, filename, stored_path, normalized_path, mime,
         width, height, bytes, created_at)

settings (key PRIMARY KEY, value)
```

Notes that are part of the spec, not suggestions:

1. **`posts.payload` is dropped.** The compiled tree is derived, never stored.
   Existing post rows go with it.
2. **`articles` holds only saved articles.** Scrape results are transient — they
   are returned by the API and never persisted unless the user saves them. Drop
   the existing rows.
3. `source_name` on `articles` is a deliberate denormalized snapshot so a saved
   article survives its source being deleted.
4. Keywords are normalized because they are shared across posts and used for
   filtering; a comma-joined text column would make that a scan.
5. `sources` moves out of `data/sources.json` and into the DB. Seed the table
   from the existing JSON on migration if the file is present, then stop reading
   it.
6. Indexes: `posts(status, updated_at)`, `articles(saved_at)`,
   `post_keywords(keyword_id)`.
7. Foreign keys must actually be enforced — `PRAGMA foreign_keys = ON`.

Write repository functions for each table with the same shape as the existing
ones (prepared statements, no ORM). `setPostKeywords(postId, names[])` should
upsert into `keywords` and replace the join rows in one transaction.

## Acceptance

- A fresh DB is created at version 3; an existing version-2 DB migrates without
  throwing.
- `npm test` passes, with new unit tests covering the keyword upsert/replace and
  the status CHECK constraint.
- `corpus/wiki/data.md` documents the new schema and states that `markup` is the
  source of truth.

---

## Outcome — 2026-08-27

Done. Schema v3: `users`, `posts` (markup-backed, `status` CHECK-constrained to
`draft`/`published`), `keywords` + `post_keywords`, `renders`, `uploads`, and
reworked `sources`/`articles`. Storage modules added for each; the barrel
`core/src/storage/index.ts` exports them all, so nothing needed adding to
`core/src/index.ts`.

**The migration drops data, on purpose.** v2 → v3 drops every `posts` row (a v2
post held a composed payload with no markup to derive it from) and every
`articles` row (v2 persisted all scrape output; v3 persists only what you save).
`settings` survives. Keyed on `PRAGMA user_version` with `IF NOT EXISTS`
throughout, and tested against a seeded v2 database *with rows*, opened twice.

`articles.source_id` became a real FK, so the v2 sentinel string `'manual'` can
no longer be stored — a manually added article stores `NULL` and keeps
`source_name = 'Manual'` as the snapshot. One API test asserted the old
behaviour; the controller updated it.

Deprecated shims were left in `posts.ts` and `articles.ts` purely so `api/**`
still compiles (`getPost`, `listPosts`, `deletePost`, `updatePostPayload`,
`markRendered`, `upsertArticles`, `articlesForDate`, `addManualArticle`,
`insertMany`, `todays`, `existsByUrl`). Briefs 60 and 62 delete them with the
routes that call them. `core/src/scrape/index.ts` still persists scrape output
through `upsertArticles` — brief 60 stops that.

This brief also surfaced a pre-existing defect it did not cause: `npm test` was
migrating the real `data/newspapper.db` because `defaultDbPath()` ignored the
`NEWSPAPPER_DB_PATH` the harness set. Fixed by the controller; see
`wiki/decisions-engineering.md`.
