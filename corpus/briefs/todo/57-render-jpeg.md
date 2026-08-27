# Task 57 — Render to JPEG and optimize on publish

## Context

[Output is JPEG, not PNG](../../wiki/decisions.md#output-is-jpeg-not-png), and
[publishing is a manual state](../../wiki/decisions.md#publishing-is-a-manual-state-that-optimizes-the-output)
that runs an optimization pass. PNG has been the format since v1, so this
touches the output convention, the export, and the history UI.

## Files you OWN

- `core/src/render/screenshot.ts`, `core/src/render/output.ts`,
  `core/src/render/index.ts`
- `core/src/publish/**` — new: the optimization pass
- `api/src/routes/render.ts`, and the publish endpoint
- `corpus/wiki/data.md` (output convention section)

## Files you must NOT touch

`core/src/render/browser.ts` beyond what the format change requires;
`core/src/wizard/**`; the schema migration.

## What to do

1. **Render JPEG directly** where Playwright can (`type: 'jpeg', quality`)
   rather than screenshotting PNG and converting — fewer moving parts. Draft
   renders use a high quality (≈92); the file size only matters at publish.
2. **Output layout** stays `output/YYYY-MM-DD-N/`, with `slide-01.jpg` … and
   `caption.txt`. No PNGs are written **and none are kept** — if a re-render
   finds stale `.png` files in the directory, remove them.
3. **Publish pass:** re-encode the rendered slides at quality ≈85 via Sharp
   (brief 56 adds it), in place. Record `optimized = 1` on the `renders` row.
   Publishing an already-published post must be idempotent — never re-encode an
   already-optimized image, because repeated JPEG passes visibly degrade it.
   That is the failure this brief most needs to avoid.
4. **ZIP export** contains the JPEGs and the caption.
5. Anything in the UI that says "PNG" gets corrected.

## Acceptance

- A render produces only `.jpg` files; no `.png` is written anywhere.
- Publishing twice produces a byte-identical file the second time.
- The exported ZIP opens and contains one image per slide plus the caption.
- Text on a rendered slide is legible at quality 85 — check a real slide by eye,
  not just the file size, and say so in the outcome note.
- `npm test` passes.
