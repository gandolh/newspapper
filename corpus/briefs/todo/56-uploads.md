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
