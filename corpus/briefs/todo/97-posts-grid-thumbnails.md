# Task 97 — The posts grid downloads a full 1080² JPEG per post to paint a 104px thumbnail

## Context

Found in the 2026-09 performance sweep.
[ui/src/components/posts/PostsIsland.tsx:259-264](../../../ui/src/components/posts/PostsIsland.tsx)
sets `thumb = render.files[0]` — the render's actual full-resolution `slide-01.jpg`
(draft quality q=92) — into `<img className={styles.thumb} src={thumb}>`, and
`.thumbLink` is fixed at `104×104` (PostsIsland.module.css:50-57). No resized
derivative is generated anywhere in the render/storage pipeline. `loading="lazy"`
limits it to on-screen cards, but scrolling a library of even 50-100 rendered
posts pulls that many full-size JPEGs (~150-950 KB each) to show postage stamps.

(Also fix the base-path bug on this same `src` — see brief 78 — if 78 hasn't
landed; otherwise this brief only adds the derivative.)

## What to do

1. At render completion, generate a small derivative of `slide-01` (e.g. ~220×220
   for ~2× DPR) with Sharp, store it alongside the run (e.g.
   `output/<dir>/thumb-01.jpg`), and expose it in the `GET /api/renders` summary
   (a `thumb` field) so the grid can point at it.
2. Point `PostsIsland`'s `<img src>` at the derivative (base-path-safe).
3. Make it backward-tolerant: a run with no derivative (older renders) falls back
   to the full slide, so nothing breaks for existing output.

## Acceptance

- After rendering, a small `thumb-01.jpg` exists in the run dir and the grid loads
  that (measure: bytes per thumbnail before/after).
- Older runs without a derivative still show a thumbnail (fallback).
- The derivative is generated once at render time, not per grid load.
- `npm test` (cover the derivative generation + the summary field), `npx tsc`,
  `npm run lint`, `npm run build`, `bash corpus/lint.sh` clean. Update
  `corpus/wiki/api.md`/`data.md` for the new field + file (coordinate with 83).

## Files you OWN

- `core/src/render/*` (derivative generation — likely `index.ts`/a new module)
- `api/src/routes/renders.ts` (add `thumb` to the summary) (+ its test)
- `ui/src/components/posts/PostsIsland.tsx` + its CSS module

## Files you must NOT touch

- the slide filename convention for `slide-NN.jpg`
- `corpus/log.md`, `corpus/wiki/status.md`

## Depends on / relates to

Brief 78 (base-path `src` fix on the same element) and brief 95 (`/api/renders`
shape) both touch `renders.ts`/PostsIsland — coordinate ownership if dispatched
together.
