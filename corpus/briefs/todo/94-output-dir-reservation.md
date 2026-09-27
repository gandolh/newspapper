# Task 94 — Two concurrent renders can pick the same output directory and overwrite each other

## Context

Found in the 2026-09 sweep and reproduced.
[core/src/render/output.ts:25-44](../../../core/src/render/output.ts) `nextOutputDir`
scans `output/` for `YYYY-MM-DD-N` and returns `max(N)+1`, but by its own comment
"does NOT create the directory" — creation happens later, in `writeRun`, after the
multi-second render loop. Nothing in `api/src/routes/render.ts` or
`core/src/render/index.ts` serializes renders. Two renders started close together
(double-clicked "Render", or two posts near-simultaneously) both scan before
either writes, both compute the same `output/<date>-N`, and both later write
`slide-01.jpg`/`slides.json`/… into that one directory. Last write wins per file;
each render's `renders` row points at the shared dir with its own (now wrong)
`slideCount`. A post's export/thumbnail can show another post's images.

Reproduced: two back-to-back `nextOutputDir` calls (nothing written between)
returned the same path; concurrent `writeRun`s into it left B's 5 files and B's
`slides.json` where A also "owned" the path.

## What to do

Make directory selection **reserve** the directory atomically, or serialize
renders:

- **Preferred:** create the directory at selection time —
  `mkdirSync(dir, { recursive: false })` inside a retry loop that bumps `N` on
  `EEXIST` — so two renders can never claim the same `N`. Move creation from
  `writeRun` into the reservation (or have `writeRun` accept an already-reserved
  dir). Keep the pre-brief-57 filename tolerance intact.
- **Or:** a simple in-process render queue/mutex so only one render runs at a
  time (also caps Chromium memory — coordinate with brief 92/93). Note this
  changes concurrency behaviour; pick with the perf tradeoff in mind.

## Acceptance

- A test: two `nextOutputDir(date, root)` (or the new reservation call) invoked
  without writing between them return **distinct** directories; concurrent
  `renderSlides`/`writeRun` never interleave files into one dir.
- Existing render/output tests still pass.
- `npm test`, `npm run lint`, `npm run build`, `bash corpus/lint.sh` clean.

## Files you OWN

- `core/src/render/output.ts` (+ its test)
- `core/src/render/index.ts` only if `writeRun`'s dir-creation contract moves
- a render serialization helper if you take the queue route

## Files you must NOT touch

- the slide filename convention (other code parses `slide-NN.jpg`)
- `corpus/log.md`, `corpus/wiki/status.md`
