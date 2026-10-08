# Task 105 — The Reader: a FreshRSS-style place to follow, read and clip

## Owner decisions (confirm before dispatch)

The brief is written against the recommended option of each. If the owner picks
the other one, the lines it changes are named.

1. **The Reader replaces `/articles`** (recommended). One RSS zone, at
   `/reader`, with views *Read · Search · Library · Sources*. The tray keeps four
   compartments; the Articles compartment becomes Reader; `/articles` redirects.
   *Alternative:* `/reader` as a fifth compartment beside `/articles`. That
   leaves two RSS places in the nav, and it puts a fifth 78px-course share into a
   tray that already broke once at 320px ([chrome.md](../../wiki/chrome.md)). If
   chosen, the tray acceptance line below becomes a full re-measure of the
   narrow layout, and `ArticlesIsland` stays untouched.
2. **Articles render as sanitized HTML, images included** (recommended).
   Sanitized in the browser with DOMPurify, a new UI dependency pinned exactly.
   Images are hotlinked: the browser fetches them from the publisher's host
   (`referrerpolicy="no-referrer"`, `loading="lazy"`). The app sets no CSP
   anywhere, so the sanitizer is the only line of defence and is tested as such.
   *Alternative:* plain-text paragraphs from the existing `stripHtml`, with no
   dependency and no images. If chosen, drop step 7's sanitizer and its
   acceptance line.
3. **"Inspire" means clip and copy, never seed.** Save to the library with a
   note, copy title + link, and copy a selected passage as an attributed quote.
   There is no "start a post from this" action; that is locked by
   [decisions.md](../../wiki/decisions.md#a-saved-article-is-a-reference-not-a-pipeline-input).
   Reversing it needs an explicit revisit and a log line, not a brief.

Defaults this brief picks (edit here, not during the build): background refresh
every 30 minutes; items kept 30 days, but always the newest 50 per source; an
item is marked read when it is opened.

## Context

Today RSS is a keyword search that fetches every enabled feed, plus every item's
page, on each query. Nothing is kept unless saved. There is nowhere to just
*read*: you only see what a keyword caught.

[FreshRSS](https://freshrss.org/) is the reference the owner pointed at. It is a
self-hosted aggregator: feeds grouped in categories, unread counts in a sidebar,
a list plus a reading view, read/unread and favourites, search operators, saved
queries, keyboard shortcuts, OPML, per-feed purge rules, a CSS-selector
full-text fetch, WebSub, extensions and multi-user support. Newspapper needs the
reading core of that, aimed at writing posts:

| FreshRSS | Here |
|---|---|
| Categories + feeds with unread counts | **Yes.** A `category` text column on `sources`, not a categories table. |
| Normal view (list) + reader view | **Yes, as three panes.** Rail · list · reading pane. |
| Read / unread, mark-all-read | **Yes.** Mark-all-read is bounded by what the list loaded. |
| Favourites | **Becomes "save to library".** The existing `articles` table, plus a note. |
| Search operators, saved queries | **No.** A filter box using the locked keyword rule. |
| Keyboard shortcuts | **Yes,** a fixed set (step 9). |
| Purge policy | **Yes,** one global rule (step 4). |
| OPML, autodiscovery, CSS-selector full text, WebSub, labels, sharing, extensions, multi-user | **Not in this brief** (see the end). |

The heavy part is new: items are **stored**. A refresh fetches only feed XML,
never each item's page (that is what makes Search slow). Saved articles stay
what they are, references you write from.

## What to do

The work has three seams. If it is split at dispatch, cut it here: **A**
(steps 1–5, `core/`), then **B** (step 6, `api/`), then **C** (steps 7–10,
`ui/`). B needs A's types, and C needs B's routes.

1. **Schema v6** (`core/src/storage/db.ts`, one `runMigrationStep` like the
   others, so a crash rolls back):
   - `feed_items`: `id` INTEGER PK; `source_id` TEXT NOT NULL → `sources(id)`
     ON DELETE CASCADE; `guid` TEXT NOT NULL; `title`; `url` TEXT NOT NULL;
     `author`; `content_html` (capped at 256 KB at insert); `content_text`
     (`stripHtml` of it, for filtering and excerpts); `published_at` (nullable);
     `fetched_at` NOT NULL; `sort_at` NOT NULL; `read_at` (nullable). UNIQUE
     `(source_id, guid)`. Index `(sort_at DESC, id DESC)` and
     `(source_id, read_at)`.
   - `sources`: add `category`, `etag`, `last_modified`, `last_fetched_at`,
     `last_error` (all nullable TEXT).
   - `articles`: add `note` TEXT NOT NULL DEFAULT `''`.
2. **The dedupe key is the URL.** `guid` on `feed_items` is the item's link,
   matching what Search already writes into `articles.guid`. An item counts as
   *saved* when `articles` has the same `(source_id, guid)`. Use the feed's own
   `<guid>` and the reader can never tell which items are already in the
   library.
3. **Fetch richer items** (`core/src/scrape/rss.ts`). `fetchFeed` currently
   prefers `contentSnippet` (plain text) and drops undated items. The reader
   needs the HTML `content` (rss-parser fills it from `content:encoded` or
   `description`; check both on an RSS 2.0 and an Atom fixture) plus `author`.
   It also needs undated items kept, with `publishedAt: null`. **Search must not
   change:** `searchArticles` filters out undated items itself, and its results
   on the existing fixtures stay identical. Add conditional GET: send
   `If-None-Match` / `If-Modified-Since` from the stored values. A 304 is "no
   change", not an error (today any non-2xx throws). Keep every fetch on
   `safeFetch`.
4. **Refresh and purge** (new `core/src/reader/`). `refreshSources(db, opts)`
   fetches enabled sources four at a time (lift `mapWithConcurrency` out of
   `scrape/index.ts` into `core/src/util/` and reuse it). It inserts new items
   with `INSERT … ON CONFLICT DO NOTHING`, records `last_fetched_at`,
   `last_error`, `etag` and `last_modified` per source, and reports per-source
   progress through the same event shape as Search.
   - `sort_at` is `min(published_at, fetched_at)`, falling back to `fetched_at`
     when undated, so a future-dated item cannot pin itself to the top.
   - It is **single-flight**: a manual refresh during a background one joins
     the running promise instead of starting a second.
   - After each refresh, purge: delete items whose `fetched_at` is older than
     `READER_RETENTION_DAYS` (default 30), except the newest 50 per source.
     Saved items live on in `articles`, so purging one loses nothing.
5. **Background schedule.** The API starts the refresh loop on boot (first run
   after a short delay, then every `READER_REFRESH_MINUTES`, default 30, `0` =
   off). The loop stops on server close. Tests run with it off, and no timer may
   keep vitest alive. This assumes one API process (true today, under pm2); say
   so in [configuration.md](../../wiki/configuration.md).
6. **Routes** (new `api/src/routes/reader.ts`, all behind the guard):
   - `GET /api/reader/items?scope=unread|all&sourceId=&category=&q=&cursor=&limit=50`
     returns `{ items: ItemSummary[], nextCursor }`. Keyset on
     `(sort_at, id)`. **No `content_html` in the list** (brief 95's lesson).
     Each summary carries `read`, `saved` and a ≤200-char excerpt.
   - `GET /api/reader/items/:id` returns the full item. It has no side effect:
     opening is a separate write.
   - `PATCH /api/reader/items/:id` with `{ read }`.
   - `POST /api/reader/mark-read` with `{ sourceId? | category?, upToId }`
     marks only items with `id <= upToId`, so items that arrived after the list
     loaded stay unread.
   - `GET /api/reader/counts` returns unread per source and in total.
   - `POST /api/reader/refresh` (SSE, optional `{ sourceId }`) streams the
     Search progress protocol, then `done: { newCount, errors }`.
   - Extend `sources` (accept `category`) and `articles` (`note` on POST, plus
     `PATCH /api/articles/:id` with `{ note }`).
   - The `q` filter follows the
     [locked keyword rule](../../wiki/decisions.md#keyword-matching-is-case-insensitive-or-substring-over-title--body):
     comma-separated terms, OR, case-insensitive substring over title and
     `content_text`. Order stays chronological, because this is a timeline and
     not a ranked search. **SQLite `LIKE` folds ASCII only**, so `ș` would miss
     `Ș`. Register a JS lower-casing function on the connection (or filter in
     JS), and escape `%` and `_`.
7. **Render an item** (`ui/src/components/reader/`). Sanitize `content_html`
   with DOMPurify against an allowlist: text formatting, headings, lists,
   blockquote, pre/code, figure, `a[href]` (http(s) only, forced
   `target="_blank" rel="noopener noreferrer"`) and `img[src|alt]` (forced
   `loading="lazy" referrerpolicy="no-referrer"`, `max-width: 100%`). Nothing
   else survives. If `DOMPurify.isSupported` is false, render `content_text` as
   paragraphs instead of passing anything through. DOMPurify returns the
   input untouched when unsupported (still true in 3.4.16).
8. **The page.** `/reader` takes the board's fluid width (like the editor) and
   has three panes:
   - **Rail:** *Unread* and *All*, each with a count. Then sources grouped by
     category (uncategorized last), each with its unread count and a rubylith
     mark when `last_error` is set. A Refresh button with live progress. Links
     to the Search, Library and Sources views. Those are today's three panels,
     moved, not rewritten. Sources gains a category field; Library shows and
     edits the note.
   - **List:** filter box, Mark all read (confirm dialog), and rows. A row shows
     unread as weight *and* a mark (never colour alone), plus source, age and a
     saved mark. A "Load more" button at the end, not infinite scroll.
   - **Reading pane:** title, source · author · date, Open original ↗, Save to
     library (opens an inline note field), Copy title + link, and Copy quote.
     Copy quote is enabled when text is selected inside the pane and copies
     `“passage” — Title, Source, URL`. The body uses a comfortable measure
     (~70ch).
   - Below the narrow breakpoint the panes collapse to rail → list → article,
     with a back control.
   - Designed states: no sources (link to Sources), all caught up, loading
     skeletons, a failing source, refresh in progress, an item with no content
     ("Open original").
   - Selected scope and source stay in component state. `ui/src/router.tsx`
     knows only the pathname, and extending it is not this brief.
9. **Keys** (ignored while focus is in a text field): `j`/`k` next/previous
   (opens the item, which marks it read) · `m` toggle read · `s` save · `v` open
   original · `c` copy title + link · `r` refresh · `/` focus the filter ·
   `Shift+A` mark all read · `?` shortcut legend (the existing `Modal`).
10. **Nav.** In `routes.tsx`, `/reader` is a sheet and `/articles` redirects
    to it, the same way `/history` → `/posts` works. Rendering inside the one
    `<App>` is load-bearing. In `Sidebar.tsx`, the Articles compartment becomes
    Reader, keeps the clipping showing, and is active on `/reader`.
11. **Wiki.** Update [api.md](../../wiki/api.md), [data.md](../../wiki/data.md),
    [migrations.md](../../wiki/migrations.md),
    [architecture.md](../../wiki/architecture.md) (page map),
    [configuration.md](../../wiki/configuration.md) (the two env vars),
    [dependencies.md](../../wiki/dependencies.md) (DOMPurify, and why not
    sanitize-html server-side), and [glossary.md](../../wiki/glossary.md):
    **Item** is a stored feed entry, which becomes an **Article** only when
    saved. Add a [decisions.md](../../wiki/decisions.md) entry: *the Reader stores
    items; a saved article is still a reference.*

## Acceptance

- **Migration.** A copy of a real v5 DB migrates to v6 with sources and
  articles intact. A fresh DB is created at v6. A step that fails rolls back.
- **Refresh**, against local fixtures (RSS 2.0 with `content:encoded`, Atom, an
  undated item, a future-dated item, a 304):
  - a second refresh inserts 0 items;
  - undated items are kept, and the future-dated item sorts at its fetch time;
  - a 304 parses nothing and updates `last_fetched_at`;
  - one failing source sets `last_error` and does not stop the others;
  - two concurrent refresh calls perform one run.
- **Search is unchanged.** `scrape.test.ts` passes with its expectations
  untouched.
- **Purge** keeps the newest 50 per source and deletes the rest past the
  window.
- **Read state.** `mark-read` with an `upToId` leaves a later-inserted item
  unread.
- **Filter.** Matches the locked rule, including `ș` against `Ș`, and treats a
  literal `%` and `_` as text.
- **Saving.** Saving from the reader writes `articles.guid = url`. The list then
  shows the item as saved. Saving twice leaves one row. The note persists and
  shows in Library.
- **Sanitizer.** Tested against `<script>`, `onerror`, `javascript:` and
  `data:` hrefs, `<iframe>`, `<svg onload>`, `<style>` and `<form>`; none
  survive. The test **asserts `DOMPurify.isSupported` under the test DOM**
  first, otherwise it is green because nothing ran
  ([green-because-nothing-ran.md](../../wiki/green-because-nothing-ran.md)).
- **List payload.** `GET /api/reader/items` responses contain no
  `content_html`.
- **In a real browser:**
  - The whole loop works from the keyboard: j/k, m, s, v, c, r, `/`.
  - Every designed state in step 8 is seen at least once.
  - At 320px, every tray compartment is still hit-testable (measured, not
    computed), and the reader collapses to list → article.
  - `/articles` lands on `/reader`.
- **Gates.** `npm run gate` is clean (build, test, lint, corpus lint, with
  `CI=1`).

## Files you OWN

- `core/src/storage/db.ts`, `core/src/storage/sources.ts`,
  `core/src/storage/articles.ts`, new `core/src/storage/feed-items.ts`
  (+ tests)
- `core/src/scrape/rss.ts`, `core/src/scrape/index.ts` (the undated filter and
  the `mapWithConcurrency` move only), new `core/src/reader/**`,
  new `core/src/util/concurrency.ts`
- `core/src/types.ts`, `core/src/index.ts` (exports)
- new `api/src/routes/reader.ts`; `api/src/routes/sources.ts`,
  `api/src/routes/articles.ts`; `api/src/server.ts` (registering the route and
  the loop's start and stop)
- new `ui/src/components/reader/**`; `ui/src/components/articles/**` (moved
  into the reader's views); `ui/src/routes.tsx`, `ui/src/components/Sidebar.tsx`,
  `ui/src/lib/types.ts`; `ui/package.json` + `package-lock.json` (DOMPurify,
  exact pin)
- `.env.example` (the two vars) and the wiki pages in step 11

## Files you must NOT touch

- `core/src/wizard/**`, the editor, `core/src/render/**`, `core/src/publish/**`,
  `core/src/uploads/**`, `api/src/ward/**`
- `core/src/scrape/safe-url.ts`: use it, don't loosen it
- Keyword matching semantics in Search (locked)
- `corpus/log.md`, `corpus/wiki/status.md` (the controller's)

## Not in this brief

Each is a follow-up worth its own brief once the Reader is in use:

- OPML import/export (moving from FreshRSS or Feedly).
- Feed autodiscovery from a site URL.
- Full text for truncated feeds (FreshRSS's CSS-selector fetch).
- Repointing the Search tab at stored items. A live fetch with page bodies is a
  different thing from filtering what is stored, and the switch deserves its own
  decision.
- Per-feed refresh intervals and auto-mark-read rules.
- Labels beyond "saved", and saved queries.
- An unread count in the tray.
- Query-string state in the router.
- Sharing services, WebSub and multi-user. These are out for this product, not
  just later.
- Any model-written summary or "post idea". The product has no LLM, by
  [decision](../../wiki/decisions.md#no-llm-in-the-product).
