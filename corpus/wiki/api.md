---
summary: The HTTP API's ground rules (the /api prefix, the session guard and its 401, the /api/auth routes, SSE framing) and the writing side's routes — posts, renders, publish, export, themes, settings, uploads. Sources, articles, Search and the Reader are in api-reader.md.
updated: 2026-10-09
---

# HTTP API

All endpoints are prefixed with `/api/`. The server runs on port 3001 by default.

SSE endpoints stream `event: <type>\ndata: <json>\n\n` frames. Long-running endpoints emit `progress` events during work and end with `done` or `error`.

Every route is behind the [session guard](./configuration.md#authentication)
except `/api/health`, the plugin's own `/api/auth/*` sign-in routes and what is
not API at all (the UI bundle, `/assets/fonts/`). Without a live session:
**401 `{ error: "unauthorized", reason? }`**, never a redirect, so the UI decides
where to send the user (to its own `/login`). `reason` is set when a session
existed and a check refused it: `ward_session_ended`, `ward_unavailable`.
`/output/*` and `/uploads/*` are guarded too. Guardedness is decided from the
route the router *matched*, so a percent-encoded spelling of a guarded path is
guarded too
([decision](./decisions-security.md#the-guard-decides-from-the-matched-route-not-the-raw-url)),
and an unmatched `/api/...` URL is a 401, not a 404 that says which paths exist.
A 5xx answers `{ error: "Internal Server Error" }`; the real error is only logged.

Who needs a session is `api/src/ward/ward.guard.ts`'s `requiresSession`, handed to the
auth plugin as its `isPublic`. There is no per-route opt-out.

## Health

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/health` | `{ ok: true }` |

## Accounts and sign-in

The routes are the shared library's, mounted at `/api/auth` by `api/src/ward/auth.ts`
([decision](./decisions-accounts.md)). As the browser sees them they sit under
the base, e.g. `/newspapper/api/auth/login`. Every `POST` refuses a browser
request from another origin (`403 cross_site`).

| Method | Path | Guard | Body → answer |
|--------|------|-------|---------------|
| POST | `/api/auth/login` | public | `{ username, password }` → `{ user, session, ward }` · 401 `invalid_credentials` · 429 `too_many_attempts` |
| POST | `/api/auth/logout` | public | 204 |
| GET | `/api/auth/session` | public | `{ user, session, ward, reason? }`; `user: null` when signed out |
| POST | `/api/auth/password` | session | `{ currentPassword, newPassword }` → 204 |
| POST | `/api/auth/ward/start` | public | `{ returnTo? }` → `{ url }` at Ward. Absent when Ward is not configured. |
| GET | `/api/auth/ward/callback` | public | a 303 to the app's login page (`?ward_error=<code>`), Settings or `returnTo` |
| POST | `/api/auth/ward/link`, `/reauthenticate`, `/unlink`, `/set-password`, `/logout` | session | see the library's guide |

There is no register route and no `/api/me`: the session probe answers who is
signed in, with `role` and `hasPassword`, and Ward's grant map never reaches the
browser.

## Sources, articles, Search and the Reader

The reading side — `/api/sources`, `/api/articles`, the keyword Search
(`POST /api/scrape`, SSE) and the Reader's `/api/reader/*` routes — is in
[api-reader.md](./api-reader.md).

## Posts

The markup is the source of truth. `title`, `description` and `keywords` are
**derived server-side** from the document's `<head>` on every write, so a post
cannot be saved with index columns that disagree with its own document. A
half-typed `<head>` must not fail the debounced autosave, so a missing title
falls back to `"Untitled post"` rather than 400ing — the editor's linter is what
tells the author their title is missing.

| Method | Path | Query / Body | Response |
|--------|------|---------------|----------|
| GET | `/api/posts` | query `status?` (`draft`\|`published`), `keyword?`, `search?`, `limit?`, `offset?` | `PostSummary[]`: every post field except `markup` (two queries for any N). `GET /api/posts/:id` has the markup. |
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
| GET | `/api/renders` | `postId?` | `RenderSummary[]` — the **latest** render of every post that has one, in one query (or just that post's, with `postId`) · 400 non-integer `postId` |

`RenderSummary` is `{ id, postId, slideCount, optimized, createdAt, files, thumb }`,
where `files` lists each slide **still on disk**. The run directory is read
rather than reconstructed from `slideCount`: a pre-brief-57 run holds `1.png`
and a cleaned-out run holds nothing, and `/posts` must show what exists, not
what the row claims. `outputDir` is absent by design — it is a server path.
One call gives every row its thumbnail and its export/publish availability.
`thumb` is the run's 220 px `thumb.jpg`, or its first slide for runs made
before thumbnails existed, or null.

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
| `/uploads/<ref>` | An upload's normalized copy. **Guarded**: the render browser gets its bytes from disk (`core/src/render/uploads-route.ts`), not from here. The browser's `<img>` requests carry the session cookie because its `Path` is the app base. |
| `/uploads/<ref>/original` | The untouched upload. Guarded the same way. |
| `/` (all non-API paths) | `ui/dist/` (production mode only) |

`/uploads/*` is served by the uploads route plugin, not `@fastify/static`: the
`:ref` param is matched against `^[a-z0-9][a-z0-9-]*$`, looked up in the
`uploads` table, and the resolved path re-checked for containment in the store
before a byte is read.
