---
summary: The reading side of the HTTP API — sources, saved articles, the keyword Search (SSE) and the Reader's stored items (list, open, read state, counts, save, refresh over SSE) — with bodies, responses and error codes. The rest of the API, and the guard every route sits behind, is in api.md.
updated: 2026-10-09
---

# HTTP API — sources, articles and the Reader

The routes behind the `/reader` page. Everything in [api.md](./api.md)'s
preamble applies: the `/api/` prefix, the Ward session guard (401 / 403 / 503)
and the SSE framing. Storage behind these routes: [data-reader.md](./data-reader.md).

## Sources

Sources live in the DB (schema v3 on). They are managed from the Reader's
**Sources** view; there is no separate `/sources` page.

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/sources` | — | `Source[]` |
| POST | `/api/sources` | `{ id, name, rss, enabled?, category? }` | 201 `Source[]` (full list) · 409 if the id exists |
| PUT | `/api/sources/:id` | `Partial<SourceConfig>` | `Source[]` · 404 |
| DELETE | `/api/sources/:id` | — | `Source[]` · 404 |
| POST | `/api/sources/:id/ping` | — | `{ ok, itemCount?, latencyMs?, error? }`, the Sources view's "Ping" |

A `Source` is its config (`id`, `name`, `rss`, `enabled`, `category`) plus the
Reader's last refresh of it: `lastFetchedAt` (a 200 or a 304 reached the feed)
and `lastError` (`null` once a refresh succeeds). A blank or absent `category`
is stored as uncategorized (`null`); a non-string one is a 400. The
conditional-GET validators stay server-side.

Deleting a source deletes its stored items and only clears the FK on its saved
articles (`source_id` → `NULL`); `source_name` is a snapshot taken at save
time, so a saved article stays readable under its source's old name.

## Articles

The `articles` table holds only **saved** articles: the library. Neither a
search result nor a Reader item is written there until the user saves it.

| Method | Path | Query / Body | Response |
|--------|------|---------------|----------|
| GET | `/api/articles` | query `sourceId?`, `search?` (title/body substring), `limit?`, `offset?` | `ArticleSummary[]` (an `Article` with `body` replaced by a ≤300-char `excerpt`), most recently saved first |
| POST | `/api/articles` | body `NewArticle` (`title` required; `sourceId`, `sourceName`, `guid`, `url`, `body`, `publishedAt`, `note` optional) | 201 `Article`, idempotent on `(source_id, guid)`: a repeat save returns the existing row, its note unchanged. `sourceName` defaults to `'Manual'` when no `sourceId` is given. |
| PATCH | `/api/articles/:id` | `{ note: string }` | `Article` with the note replaced (`''` clears it) · 400 · 404 |
| DELETE | `/api/articles/:id` | — | `{ ok: true }` · 404 |

`Article.note` is why the writer kept it (schema v6), `''` when none. The
Library view shows and edits it.

## Search (SSE)

`POST /api/scrape`: a live search, not a store. It fetches the enabled sources
and returns items matching any keyword (case-insensitive substring over title
and body), ranked by total match count. Nothing is written; saving a result is
a separate `POST /api/articles`. Its matching rule is locked
([decision](./decisions.md#keyword-matching-is-case-insensitive-or-substring-over-title--body)).

| Body | SSE events |
|------|------------|
| `{ keywords: string[], maxPerSource?: number }` | `progress: { sourceId, status: 'fetching'\|'done'\|'error', count?, error? }` (a `done` count is matches found) · `done: { articles: ScrapedArticle[], errors: Array<{ sourceId, error }> }` · `error: { message }` (e.g. no keywords given) |

`ScrapedArticle` is `{ sourceId, sourceName, guid, title, url, body,
publishedAt, matchCount }`: no `id` or `savedAt`, since it isn't a row. An
undated feed item is left out of Search's results; the Reader keeps it.

## The Reader

Stored feed items (brief 105). An **Item** is a row in `feed_items`; it becomes
an **Article** only when saved. Every id is a positive integer, else 400.

| Method | Path | Query / Body | Response |
|--------|------|---------------|----------|
| GET | `/api/reader/items` | query `scope=unread\|all` (default all), `sourceId?`, `category?`, `q?`, `cursor?`, `limit?` (clamped to 1–200, default 50) | `{ items: FeedItemSummary[], nextCursor: string \| null }`, newest first · 400 on a bad `scope` or `cursor`, a non-integer `limit`, or a repeated parameter |
| GET | `/api/reader/items/:id` | — | `FeedItem` (the full item, HTML included) · 404. No side effect. |
| PATCH | `/api/reader/items/:id` | `{ read: boolean }` | `{ id, read }` · 404. Marking a read item read keeps its first read time. |
| POST | `/api/reader/mark-read` | `{ upToId, sourceId? \| category? }` | `{ marked }` · 400 if both narrowings are given |
| GET | `/api/reader/counts` | — | `{ unread, all, unreadBySource }`, every source present, zero included |
| POST | `/api/reader/items/:id/save` | `{ note? }` | 201 `Article` · 404 |
| POST | `/api/reader/refresh` | `{ sourceId? }` | SSE, below |

**The list.** Keyset pagination on `(sort_at, id)`: `nextCursor` is opaque and
`null` on the last page, and an item stored between two pages cannot shift
one. A summary carries `read`, `saved` and a ≤200-character `excerpt` and
**never the item's HTML**, which only `GET /api/reader/items/:id` returns.
`category` absent means no category filter; `category=` (present, blank) means
the uncategorized sources. `q` is the locked keyword rule: comma-separated
terms, OR'd, each a case-insensitive substring of the title or the text. It is
case-folded in JS, so `ș` matches `Ș`, and `%` and `_` are plain text. The
order stays chronological; nothing is ranked.

**Mark all read.** `upToId` is the highest id the list had loaded, so an item
that arrived after the list loaded stays unread. `category: null` or `''` means
the uncategorized sources; no narrowing means every source.

**Save.** Writes an `articles` row with `guid` = the item's URL, the key Search
uses too, so the item lists as saved and a repeat save returns the same
article, note unchanged. A later note edit is `PATCH /api/articles/:id` with
the item's `articleId`.

**Refresh** fetches the enabled sources' feeds, or just `sourceId`'s, and
stores the new items. It streams Search's progress shape, where a `done` count
is the number of new items, then `done: { newCount, errors }`. A source's
failure is in `errors` and on its row's `lastError`, never an SSE `error`;
that event means a bad `sourceId` or a database failure ("Refresh failed", the
detail only logged). The refresh is single-flight: a request during a running
refresh, background or manual, joins it and streams its remaining events. How
the loop runs: [architecture.md](./architecture.md#the-reader).
