# Task 95 — Post-list endpoints ship full markup and run N+1 keyword queries

## Context

Found in the 2026-09 performance sweep and measured against a real SQLite DB
seeded with 150 posts (~5.6 KB markup each) + one render each:

- `queryPosts` (`core/src/storage/posts.ts:85-118`) selects `p.*` — including the
  full `markup` TEXT of every post — and `rowToPost` (posts.ts:39-52) then issues
  a **separate** `keywordsForPost(db, r.id)` query per row. `GET /api/posts`
  (default limit 100) → **101 SQL statements**, **557 KB** JSON for 100 posts,
  dominated by `.markup` the list view never shows.
- `GET /api/renders` with no `postId` (`api/src/routes/renders.ts:70-75`, called
  by `PostsIsland` on every load/filter) calls `queryPosts(db(), {limit:500})` —
  paying the full N+1 keyword cost and pulling 500 full markups — purely to read
  `post.id`, then one `latestRender` per post → **301 statements**.
- `GET /api/articles` (`listArticles`) returns full scraped `body` per row though
  `ArticlesIsland` shows only a ~220-char excerpt.

At the single-editor scale these are not catastrophic, but they are pure waste on
a shared box and grow with the library.

## What to do

1. Batch keywords: one `SELECT … WHERE post_id IN (…)` for all returned rows,
   assembled in memory, instead of per-row `keywordsForPost`.
2. Add a **list projection** (id, title, description, keywords, theme, status,
   dates — **no `markup`**) for `GET /api/posts`, and use it there; keep the full
   post (with markup) for `GET /api/posts/:id` / the editor. Confirm the UI list
   never needs `markup` (grep `PostsIsland` for `.markup`).
3. `GET /api/renders` (no postId): join `renders` → latest-per-post directly (a
   single query, e.g. a grouped/`MAX(created_at)` subquery), not via `queryPosts`.
   It only needs post ids + render rows.
4. `listArticles`: return a body excerpt (or omit body) for the list; keep full
   body where a consumer needs it. Verify what `ArticlesIsland` actually reads.

Keep the API response *shapes* the UI depends on stable, or update the UI types
in lockstep.

## Acceptance

- `GET /api/posts` for N posts issues O(1) queries (not N+1) and its payload no
  longer contains `markup`; measure statements + bytes before/after and state
  them (reuse the sweep's `db-perf` approach).
- `GET /api/renders` (no postId) issues O(1) queries, not ~2N.
- The Posts grid and Articles list still render correctly (fields they read are
  present).
- `npm test` (add/adjust storage + route tests), `npx tsc`, `npm run lint`,
  `npm run build`, `bash corpus/lint.sh` clean. Update `corpus/wiki/api.md`/`data.md`
  if response shapes change (coordinate with brief 83).

## Files you OWN

- `core/src/storage/posts.ts`, `core/src/storage/articles.ts` (+ their tests)
- `api/src/routes/renders.ts`, `api/src/routes/posts.ts`, `api/src/routes/articles.ts` (+ tests)
- `ui/src/lib/types.ts` and the list components **only** if a shape changes

## Files you must NOT touch

- keyword *matching* semantics (locked) — only how rows are loaded
- `corpus/log.md`, `corpus/wiki/status.md`

## Outcome — 2026-10-03

Measured with the sweep's approach (prepared-statement counting through the
real app via `app.inject`, 150 posts with ~5.6 KB of markup and one render
each, plus 100 articles with 4 KB bodies):

| Route | Before | After |
|---|---|---|
| `GET /api/posts` | 101 statements, 583 KB | **2 statements, 21 KB** |
| `GET /api/renders` | 301 statements | **1 statement** |
| `GET /api/articles` | 1 statement, 417 KB | 1 statement, **48 KB** |

Changes:
- `keywordsForPosts(db, ids)` loads keywords for many posts in one query
  (`IN (SELECT value FROM json_each(?))`). Both `queryPosts` (full posts,
  markup kept) and the new `queryPostSummaries` use it.
- `PostSummary = Omit<Post, 'markup'>`, returned by `GET /api/posts`.
  `GET /api/posts/:id` still returns the full post.
- `latestRenders(db)` is one correlated `MAX(id)` query. `GET /api/renders`
  uses it. It lives in `storage/renders.ts`, beside `latestRender`.
- `ArticleSummary = Omit<Article, 'body'> & { excerpt }` (≤300 characters;
  the UI shows 220), returned by `GET /api/articles`.
- Both new types are in core and the UI mirror, which passes the parity test.
  `PostsIsland` and `ArticlesIsland` are retyped, and the compiler found
  exactly the places that read `body`. The library now shows `excerpt`.
  Neither list read `markup`.

Keyword matching semantics are unchanged. Tests (`list-queries.test.ts`):
- summaries carry no markup, keep correct keywords, and take 2 statements for
  30 posts;
- full posts are 2 statements too and keep their markup;
- summaries equal the full posts minus markup;
- the batch keyword loader handles no-keyword posts and an empty id list;
- `latestRenders` returns each post's newest render in 1 statement;
- article excerpts are cut, with no body.

`api.md` documents the new shapes. `npm test` 724/724, `tsc` for all three,
lint, build and corpus lint are clean.
