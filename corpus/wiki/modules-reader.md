---
summary: The reading side of @newspapper/core — Search's scrape module, the feed fetchers, the Reader's refresh and schedule, and the storage for sources, saved articles and feed items — with what each exports. The posts side, render, themes, util and uploads are in modules.md.
updated: 2026-10-09
---

# Modules — scrape, the Reader and its storage

Split out of [modules.md](./modules.md) on 2026-10-09, when brief 105 added
`core/src/reader/` and `storage/feed-items.ts`. Everything here is exported from
the main entry, `core/src/index.ts`, unless marked internal. The tables:
[data-reader.md](./data-reader.md).

## Scrape

```ts
// core/src/scrape/index.ts
export async function searchArticles(sources: SourceConfig[], opts: SearchOptions): Promise<SearchResult>
export async function pingSource(source: SourceConfig): Promise<PingResult>
```

`searchArticles()` fetches each enabled source (trimmed to `maxPerSource` feed
items), fetches bodies, and keeps items matching any of `opts.keywords`
(case-insensitive substring, title + body), ranked by total match count. It
**persists nothing**: `SearchResult.articles` are `ScrapedArticle[]`, not DB
rows; saving one is a separate call to `saveArticle`/`saveArticles`. Undated
items are dropped here, not in `fetchFeed`, because the Reader keeps them.

```ts
// core/src/scrape/rss.ts, body.ts
export async function fetchFeed(url, userAgent, timeoutMs, deps?): Promise<RssItem[]>
export async function fetchFeedConditional(url, opts: FeedFetchOptions, deps?): Promise<FeedFetchResult>
export async function fetchBody(url: string, opts?): Promise<string>
export function stripHtml(html: string): string
```

`fetchFeedConditional` is the Reader's: it sends the stored ETag and
Last-Modified and reports a 304 as "not modified", parsing nothing. Both
fetchers go through `safe-url.ts`, so a feed URL that is not a public
http(s) address is refused before any request.

## The Reader

```ts
// core/src/reader/
export function refreshSources(db: DB, opts?: RefreshOptions): Promise<RefreshResult>   // { newCount, errors }
export function isRefreshing(db: DB): boolean
export function startReaderSchedule(db: DB | (() => DB), opts?: ReaderScheduleOptions): ReaderSchedule  // { active, stop() }
export function readerRefreshMinutes(env?): number    // READER_REFRESH_MINUTES, default 30, 0 = off
export function readerRetentionDays(env?): number     // READER_RETENTION_DAYS, default 30
```

`refreshSources` is single-flight per connection and never rejects for one
source's failure; `startReaderSchedule` takes a getter so the API can hand over
its lazily reopened connection. Both, and why one process:
[architecture.md](./architecture.md#the-reader).

```ts
// core/src/util/concurrency.ts — internal
export async function mapWithConcurrency<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]>
```

Shared by Search and the Reader, both at four feeds at a time.

## Storage

```ts
// core/src/storage/feed-items.ts — the Reader's items (schema v6)
export function insertFeedItems(db, sourceId, items: readonly NewFeedItem[], fetchedAt: string): number  // new rows only
export function listFeedItems(db: DB, query?: FeedItemQuery): FeedItemPage       // keyset, newest first, no HTML
export function getFeedItem(db: DB, id: number): FeedItem | undefined
export function setFeedItemRead(db, id, read: boolean, now?): boolean
export function markFeedItemsRead(db: DB, scope: MarkReadScope, now?): number    // { upToId, sourceId? | category? }
export function getReaderCounts(db: DB): ReaderCounts
export function purgeFeedItems(db: DB, opts: PurgeOptions): number               // { retentionDays, keepPerSource? }
export function saveFeedItemToLibrary(db, id, opts?: { note? }): Article | undefined
export function filterTerms(q: string | undefined): string[]
export function capUtf8(html: string, maxBytes?): string
export class InvalidCursorError extends Error
```

```ts
// core/src/storage/articles.ts — the saved library; nothing is a row until saved
export function saveArticle(db: DB, input: NewArticle): Article        // idempotent on (source_id, guid)
export function saveArticles(db: DB, rows: NewArticle[]): number       // returns newly inserted count
export function listArticles(db: DB, filter?: ArticleFilter): Article[]  // { search?; sourceId?; limit?; offset? }
export function listArticleSummaries(db: DB, filter?: ArticleFilter): ArticleSummary[]
export function findArticle(db: DB, id: number): Article | undefined
export function getArticlesByIds(db: DB, ids: number[]): Article[]
export function updateArticleNote(db: DB, id: number, note: string): Article | undefined
export function removeArticle(db: DB, id: number): Article | undefined
export function countArticles(db: DB): number
```

```ts
// core/src/storage/sources.ts — DB-backed as of schema v3 (was data/sources.json)
export function listSources(db?: DB): Source[]
export function getSource(id: string, db?: DB): Source | undefined
export function addSource(src: SourceConfig, db?: DB): Source[]
export function updateSource(id: string, patch: Partial<Omit<SourceConfig, 'id'>>, db?: DB): Source[]
export function removeSource(id: string, db?: DB): Source[]
export function saveSources(all: SourceConfig[], db?: DB): void
export function normalizeCategory(category: string | null | undefined): string | null
export function listRefreshTargets(db: DB, sourceId?: string): RefreshTarget[]   // with the validators
export function recordSourceFetched(db, id, outcome: { fetchedAt, etag, lastModified }): void
export function recordSourceError(db: DB, id: string, error: string): void
```

In `sources.ts`, `db` is trailing and optional on the original six: a caller
with no open handle gets one opened and closed for the call, the same pattern
as `getSettings`. The Reader's three take it first and require it.
