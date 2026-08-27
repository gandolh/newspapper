# Task 56 — Image uploads and the Sharp pipeline

## Context

`<Image>` is part of the component catalogue, and the project had no image
handling at all before this. [Sharp is un-banned for image work
only](../../wiki/decisions.md#sharp-is-allowed-for-images-only) — a reversal of
a v2-era constraint that existed because there were no images to process.

Note the standing rule this does **not** relax: the rest of the forbidden
dependency list in the root `CLAUDE.md` still applies.

## Files you OWN

- `core/src/uploads/**` — new: storage paths, Sharp processing
- `api/src/routes/uploads.ts` — upload, list, delete, and serving
- `ui/src/components/editor/` image picker (coordinate with brief 59)
- `.gitignore`, `.env.example`

## Files you must NOT touch

`core/src/render/**` (brief 57 owns the JPEG change), the schema migration
(brief 52 creates the `uploads` table).

## What to do

1. **Add `sharp`** at an exact pinned version.
2. **Storage.** Files live in `uploads/`, gitignored, with the path resolved
   from `UPLOADS_DIR` when set so the store can sit outside the repo. Resolve it
   from `import.meta.url`, never `process.cwd()` — this is the single most
   repeated bug in this project's history.
3. **On upload:** accept JPEG, PNG, WebP. Keep the **original** untouched.
   Derive a **normalized** copy: max dimension 2160px (2× the canvas so slides
   stay sharp), EXIF stripped, auto-oriented. Record both paths plus width,
   height, bytes and mime in the `uploads` table.
4. **Serving.** Uploads are served over HTTP so the render browser can fetch
   them. The URL must be reachable from inside headless Chromium at render time
   — verify this rather than assuming it.
5. **Deletion** removes both files and the row. Do not orphan either.
6. Reject files over a sane cap (10MB) with a 413 and a useful message.

## Acceptance

- Uploading each accepted format produces an original plus a normalized copy and
  a correct DB row.
- EXIF is verifiably stripped, and a rotated photo comes out upright.
- A slide containing `<Image>` renders with the image actually visible in the
  output — this is the test that proves the URL works from Chromium.
- Deleting an upload leaves nothing behind on disk.
- `corpus/wiki/dependencies.md` records `sharp` and why the ban was lifted.

---

## Outcome — 2026-08-27

Done, 40 tests. `sharp` pinned at `0.35.4` and `@fastify/multipart` at `10.1.1`
— the second is beyond the brief, and earns its place by giving the multipart
stream a `fileSize` limit so an oversized body is cut off rather than buffered.

The security surface, concretely: the client filename never becomes a path (the
stored name is a slug plus 8 hex from `randomBytes(4)`, and the original
survives only as a display column); content-type and extension are ignored
entirely, with the real format read from the bytes and allow-listed to
jpeg/png/webp, so a GIF or SVG is refused rather than decoded; both file size
(10 MB) and *decoded* size (12000px per edge, 40M pixels) are bounded, the
latter checked from the header before any decode — tested with a sub-1KB PNG
whose IHDR claims 30000×30000; EXIF is stripped on the normalized copy and
verified positively, with a test asserting an `Orientation: 6` JPEG comes back
upright at 60×120 with no EXIF while the original keeps both.

**The `.gitignore` gotcha is the notable one.** The pattern has to be
`/uploads/`, anchored. Unanchored, `uploads/` also matches `core/src/uploads/`,
and the entire new module goes invisible to git while still building and testing
green. It would have shipped as "done" and vanished on clone. This is exactly
the failure the wave gate's tracked-not-just-on-disk check exists to catch.

`/uploads/*` is public by necessity — headless Chromium carries no session
cookie. Recorded with its trade-off in `wiki/decisions-engineering.md`.
