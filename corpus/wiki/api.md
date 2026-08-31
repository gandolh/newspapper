---
summary: Every HTTP route the Fastify API exposes — method, path, body, response shape, and which ones stream SSE.
updated: 2026-08-31
---

# HTTP API

All endpoints are prefixed with `/api/`. The server runs on port 3001 by default.

SSE endpoints stream `event: <type>\ndata: <json>\n\n` frames. Long-running endpoints emit `progress` events during work and end with `done` or `error`.

Every route is behind the [single-account session guard](./configuration.md#authentication)
except `/api/health`, `/api/login` and `/api/logout`. Unauthenticated requests
get **401 `{ error: "Authentication required" }`** — never a redirect, so the UI
decides where to send the user. `/output/` is guarded too; `/assets/fonts/` is not.

A route opts out by declaring `config: { public: true }` in its Fastify route
options.

## Health

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/health` | `{ ok: true }` |

## Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/login` | `{ username, password }` | `{ user: User }` + `Set-Cookie` · 401 `{ error }` · 429 `{ error, retryAfterSeconds }` |
| POST | `/api/logout` | — | `{ ok: true }` + expired cookie |
| GET | `/api/me` | — | `{ user: User }` · 401 when there is no session |
| POST | `/api/password` | `{ currentPassword, newPassword }` | `{ ok: true }` + rotated cookie · 400 too short · 401 wrong current |

`/api/login` and `/api/logout` are public; `/api/me` and `/api/password` are guarded.

The session cookie is `newspapper_session`: `HttpOnly`, `SameSite=Lax`,
`Path=/`, `Secure` unless the request is plain HTTP on loopback, 30-day
`Max-Age`. Its value is `v1.<userId>.<expiresAtMs>.<base64url HMAC-SHA256>` —
stateless, so there is no sessions table and a restart with a stable
`SESSION_SECRET` keeps everyone signed in.

A wrong password and an unknown username return the identical 401 body, and both
cost the same wall-clock time. Five failed attempts from one address lock that
address out for 60 seconds (in-memory, per-process, cleared by a success).

## Sources

Sources live in the DB as of schema v3 (`sources` table), not `data/sources.json`.
Managed from the **Sources** tab of the `/articles` page — there is no separate
`/sources` page any more.

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/sources` | — | `SourceConfig[]` |
| POST | `/api/sources` | `SourceConfig` | `SourceConfig[]` (full list) · 409 if the id exists |
| PUT | `/api/sources/:id` | `Partial<SourceConfig>` | `SourceConfig[]` · 404 |
| DELETE | `/api/sources/:id` | — | `SourceConfig[]` · 404 |
| POST | `/api/sources/:id/ping` | — | `{ ok, itemCount?, latencyMs?, error? }` — also the UI's "test feed" action |

Deleting a source only clears the FK on its articles (`source_id` → `NULL`);
`source_name` is a snapshot taken at save time, so already-saved articles stay
readable under their original source's name.

## Articles

The `articles` table holds only **saved** articles — a search's results are
never written until the user explicitly saves one.

| Method | Path | Query / Body | Response |
|--------|------|---------------|----------|
| GET | `/api/articles` | query `sourceId?`, `search?` (title/body substring), `limit?`, `offset?` | `Article[]`, most recently saved first |
| POST | `/api/articles` | body `NewArticle` (`title` required; `sourceId`, `sourceName`, `guid`, `url`, `body`, `publishedAt` optional) | 201 `Article` — idempotent on `(source_id, guid)`; a repeat save returns the existing row. `sourceName` defaults to `'Manual'` when no `sourceId` is given. |
| DELETE | `/api/articles/:id` | — | `{ ok: true }` · 404 |

## Scrape (SSE)

A search, not a persist: fetches the enabled sources and returns items
matching any of the given keywords (case-insensitive substring, across title +
body), ranked by total match count. Nothing is written to `articles` — saving
a result is a separate `POST /api/articles` call.

| Method | Path | Body | SSE events |
|--------|------|------|------------|
| POST | `/api/scrape` | `{ keywords: string[], maxPerSource?: number }` | `progress: { sourceId, status: 'fetching'\|'done'\|'error', count?, error? }` (count is matches found once `status: 'done'`) · `done: { articles: ScrapedArticle[], errors: Array<{ sourceId, error }> }` · `error: { message }` (e.g. no keywords given) |

`ScrapedArticle` is `{ sourceId, sourceName, guid, title, url, body, publishedAt, matchCount }` —
distinct from the saved `Article` shape (no `id`, no `savedAt`) since it isn't a row yet.

## Posts

The markup is the source of truth. `title`, `description` and `keywords` are
**derived server-side** from the document's `<head>` on every write, so a post
cannot be saved with index columns that disagree with its own document. A
half-typed `<head>` must not fail the debounced autosave, so a missing title
falls back to `"Untitled post"` rather than 400ing — the editor's linter is what
tells the author their title is missing.

| Method | Path | Query / Body | Response |
|--------|------|---------------|----------|
| GET | `/api/posts` | query `status?` (`draft`\|`published`), `keyword?`, `search?`, `limit?`, `offset?` | `PostRow[]` |
| POST | `/api/posts` | `{ markup, theme? }` | 201 `PostRow` · 400 missing markup or unknown theme |
| GET | `/api/posts/:id` | — | `PostRow` · 404 |
| PUT | `/api/posts/:id` | `{ markup, theme? }` | `PostRow` · 400 · 404. An omitted theme keeps the post's current one. |
| PUT | `/api/posts/:id/status` | `{ status: 'draft' \| 'published' }` | `PostRow` · 400 · 404 |
| DELETE | `/api/posts/:id` | — | `{ id, deleted: true }` · 404 — render records and keyword links cascade away |

An unknown `theme` is rejected at save time, not render time — it would
otherwise reach `loadTheme` and throw two steps later.

## Renders

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/api/renders` | `postId?` | `RenderSummary[]` — the **latest** render of every post that has one (or just that post's, with `postId`) · 400 non-integer `postId` |

`RenderSummary` is `{ id, postId, slideCount, optimized, createdAt, files }`,
where `files` lists each slide **still on disk**. The run directory is read
rather than reconstructed from `slideCount`: a pre-brief-57 run holds `1.png`
and a cleaned-out run holds nothing, and `/posts` must show what exists, not
what the row claims. `outputDir` is absent by design — it is a server path.
One call gives every row its thumbnail and its export/publish availability.

## Render (SSE)

| Method | Path | Body | SSE events |
|--------|------|------|------------|
| POST | `/api/posts/:id/render` | — | `progress: { done, total }` · `done: { post, render, files }` · `error: { message }` |

Compiles the post's markup with the strict `compileDocument` path and renders
every slide to JPEG. Post not found, unknown theme, markup that will not
compile, and a slideless document all arrive as an `error` event, not a status
code — the response has already begun.

## Publish

| Method | Path | Response |
|--------|------|----------|
| POST | `/api/posts/:id/publish` | `{ ... }` · 404 not found · 409 anything else (e.g. never rendered) |

Marks the post published and runs the JPEG optimization pass over its latest
render **the first time only** — the render's `optimized` flag guards the
re-encode, so publishing twice never degrades the image. In the UI it is a
deliberate action behind a confirm; it never happens automatically.

## Export

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/posts/:id/export.zip` | `application/zip` — the latest render's JPEGs + slides.json + caption.txt · 404 no such post, never rendered, or the output directory is gone |

## Themes

`/api/preview` and every `/api/templates*` route went with the template system
(see decisions.md "The template system is removed"). Theme listing was never
part of that registry, so it survives on its own:

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/themes` | — | `Array<{ name, tokens }>` |

## Settings

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/settings` | — | `Settings` |
| PUT | `/api/settings` | `Partial<Settings>` | `Settings` |

## Uploads

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/uploads` | `multipart/form-data`, one file part | 201 `Upload & { original }` · 400 · 413 · 415 |
| GET | `/api/uploads?limit&offset` | — | `Upload[]`, newest first |
| GET | `/api/uploads/:id` | — | `Upload` · 404 |
| DELETE | `/api/uploads/:id` | — | `{ id, deleted: true }` · 404 |

The response shape adds a **ref** and three URLs to the DB row:
`{ id, ref, filename, mime, width, height, bytes, createdAt, src, url, originalUrl }`.
`src` is the value an `<Image src="…">` carries; `url` is `/uploads/<ref>`
(normalized bytes) and `originalUrl` is `/uploads/<ref>/original`.
`width`/`height`/`bytes` describe the **normalized** copy — what actually gets
served — and the POST response carries the source dimensions separately under
`original`.

Rejections return `{ error, code }`, where `code` is one of `empty_upload`,
`file_too_large`, `unsupported_format`, `unreadable_image`, `image_too_large`.
Format is decided by decoding the bytes, never by the declared `Content-Type` or
the filename.

## Static assets (not API routes)

| Path | Serves |
|------|--------|
| `/assets/fonts/<name>.ttf` | Inter font files |
| `/output/<dir>/slide-NN.jpg` | Rendered slide images |
| `/uploads/<ref>` | An upload's normalized copy — **public**, because headless Chromium fetches it at render time with no session cookie. Declares `config: { public: true }`. |
| `/uploads/<ref>/original` | The untouched upload. Public for the same reason. |
| `/` (all non-API paths) | `ui/dist/` (production mode only) |

`/uploads/*` is served by the uploads route plugin, not `@fastify/static`: the
`:ref` param is matched against `^[a-z0-9][a-z0-9-]*$`, looked up in the
`uploads` table, and the resolved path re-checked for containment in the store
before a byte is read.
