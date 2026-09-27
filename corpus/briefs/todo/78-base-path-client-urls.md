# Task 78 — Under `/newspapper/`, post links go off-app and every image 404s

## Context

Found in the 2026-09 sweep and verified by reading. The base-path work
(`ui/src/lib/base.ts`, HEAD commit) is sound in `lib/api.ts` — `api()` wraps
paths in `withBase`, and `wardLoginUrl` is deliberately origin-absolute. But
three client sites that build URLs **outside** `api()` were missed, so served at
`https://gandolh.ro/newspapper/` (Caddy strips the prefix before Fastify; the
browser does not know the prefix and resolves a leading-`/` URL against the
origin root):

1. **Post links navigate off the app.**
   [ui/src/components/posts/PostsIsland.tsx:255](../../../ui/src/components/posts/PostsIsland.tsx)
   and :269 use raw `href={`/?post=${post.id}`}` — plain `<a>`, not `withBase`,
   not the router's `<Link>`. The **same file** already does it right three lines
   away: `window.location.assign(withBase(`/?post=${post.id}`))` (:317) and
   `withBase('/')` (:190, :238). Clicking a thumbnail or title requests
   `https://gandolh.ro/?post=123` — a different app — instead of
   `/newspapper/?post=123`.

2. **Post thumbnails 404.** PostsIsland.tsx:260 renders `<img src={thumb}>` where
   `thumb = render.files[0]`, a server-built `/output/<dir>/slide-01.jpg`
   (`api/src/routes/renders.ts:37`, deliberately origin-relative — "outputDir is
   a server path"). A leading-`/` `src` resolves against the origin root →
   `https://gandolh.ro/output/...` → 404. Every thumbnail on `/posts` breaks.

3. **Image-picker thumbnails and the live preview 404.**
   `ui/src/components/editor/ImagePicker.tsx:122` uses `<img src={upload.url}>`
   where `upload.url = /uploads/<ref>` (`core/src/uploads/index.ts` →
   `uploadPublicPath`). And `ui/src/components/editor/EditorIsland.tsx:169` calls
   `compileTraced(previewDoc, theme)` with **no** `uploadBaseUrl`, so it defaults
   to `WZD_COMPILE_DEFAULTS.uploadBaseUrl = '/uploads'` (`core/src/wizard/compile.ts:33`),
   and every `<Image>` in the preview canvas renders
   `background-image: url('/uploads/<ref>')` → resolves against origin root →
   404 under `/newspapper/`.

None of this shows in dev (base is `/`), and nothing fails loudly — the page
loads and the images are just blank, which is exactly the failure `base.ts`'s own
header warns about.

## What to do

1. PostsIsland: replace both raw `<a href={`/?post=…`}>` with the router's
   `<Link>` (which applies `withBase`), or at minimum `withBase(...)` the href —
   matching how the rest of the file and `Sidebar.tsx` already link.
2. PostsIsland: `withBase(thumb)` before using it as `<img src>`.
3. ImagePicker: `withBase(upload.url)` before `<img src>`.
4. EditorIsland: pass `{ uploadBaseUrl: withBase('/uploads') }` into
   `compileTraced(previewDoc, theme, …)`.
5. Sweep for any other leading-`/` URL built for `src`/`href`/`location`/`fetch`
   outside `api()`: grep `ui/src` for `href="/`, `href={\`/`, `src={`, `url('/`,
   `location.assign('/`, `location.href`. Report every hit and whether it is
   base-safe. `<Image>` refs compiled for the **render** (server-side) must stay
   origin-relative — only the browser-resolved ones need `withBase`.

## Acceptance

- Build the UI with `NEWSPAPPER_BASE=/newspapper/` and confirm (state method):
  post title/thumbnail links resolve under `/newspapper/`, and thumbnail, picker
  and preview image URLs are `/newspapper/output/…` and `/newspapper/uploads/…`.
- A unit test that renders each of the three components (or exercises the URL
  builders) under a mocked `BASE_URL='/newspapper/'` and asserts the emitted
  `src`/`href` carries the prefix. If mocking `import.meta.env.BASE_URL` needs a
  seam, add the smallest one (see brief 90).
- Dev (base `/`) behaviour unchanged.
- `npm run build`, `npm test`, `npx tsc -p ui --noEmit`, `npm run lint`, and
  `bash corpus/lint.sh` clean.

## Files you OWN

- `ui/src/components/posts/PostsIsland.tsx`
- `ui/src/components/editor/ImagePicker.tsx`
- `ui/src/components/editor/EditorIsland.tsx`
- any component test files you add for the above

## Files you must NOT touch

- `ui/src/lib/base.ts` — the helper is correct; this brief only uses it
- `api/src/routes/renders.ts` and `core/src/uploads/index.ts` — the server paths
  are deliberately origin-relative; the fix is on the browser side
- `core/**` beyond passing an option into `compileTraced`
- `corpus/log.md`, `corpus/wiki/status.md`
