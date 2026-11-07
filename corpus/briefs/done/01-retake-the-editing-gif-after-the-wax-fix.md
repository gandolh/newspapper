# Task 01 — Retake the README's editing GIF after the wax fix

## Context

`docs/images/editing.gif` was recorded on 2026-10-09. It shows the source
pane with an element selected, painted with the old wax. The wax fix of
2026-10-19 changed how a selection is painted: the wax is now one span per
run, under the text, so it no longer covers half of each glyph. The GIF
still shows the old wax. `editor.webp` is taken with nothing selected and is
unaffected.

The demo posts are written by hand, as
[docs/images/shots.md](../../../docs/images/shots.md) describes; there is no
seed script for them. Sign-in for the capture is a local tester account now,
not Ward. Promoted from the todo `retake-editing-gif-after-the-wax-fix`
(2026-10-31).

## Files you OWN

- `docs/images/editing.gif`
- `docs/images/shots.md` (the `editing.gif` row and, if a step changed, its
  recipe)

## Files you must NOT touch

- The other images in `docs/images/`.
- Any source code. If the capture shows a wax bug, stop and write a todo.

## What to do

1. Start the app locally and sign in with a local tester account.
2. Write the same made-up post the 2026-10-09 GIF used, by hand, as
   `shots.md` describes.
3. Record the same beats with the recipe in `shots.md`: select slide 1's
   heading, retype it one word at a time, scroll the preview to slides 2
   and 3. Convert with the `ffmpeg` line in `shots.md`.
4. Check the frames show the new wax under the text, and that no real name,
   email or account shows anywhere in them.
5. Date the `editing.gif` row in `shots.md`.

## Acceptance

`editing.gif` retaken with the same beats and the same made-up post, the
wax drawn under the text in every frame that has a selection, and its row in
`shots.md` dated.

## Outcome (2026-11-07)

`editing.gif` is retaken, run by the owner's request on 2026-11-07, after briefs 03 and 05 had
changed how a selection paints. The app ran locally against scratch paths for the database, output
and uploads, with the Reader's refresh off, signed in as a `tester` account seeded on that
database. Post 1 is the 2026-10-09 post, written again by hand: its text read off the old GIF's
frames and `slides.gif`, the same four slides on `warm-industrial-1` dated 2026-10-09. The old
frames cut the caption off after "on weekend"; it now reads "Sample City's Line 4 runs all night on
weekends from 1 November."

**The beats are the old ones:** select slide 1's heading text, retype it as "Night trams start on 1
November" one word at a time, then scroll the preview to slides 2 and 3. 8.7 s at 12 fps, 960×600,
627 KB (the old one was 2.6 MB). Converted with `shots.md`'s ffmpeg filter, fed from a concat list
instead of a webm.

**The wax, checked by zooming the heading line** in the selection frame, a mid-typing frame and the
last frame: the element's wax lies under the text and every glyph is whole; the selected range is
non-photo blue under graphite ink (brief 05), not the opaque wax bar of the 2026-10-09 GIF. The
header shows `TESTER`; no real name, email or account appears.

**Recipe changes in `shots.md`.** `agent-browser` is not used (its recorder drops idle time, as
the 2026-11-05 log noted, and it was not installed). The frames come from a Chromium screencast
through Playwright's CDP session, each with its timestamp, so pauses keep their length. The post is
at `/?post=1`: the dev server serves the app at `/` unless `NEWSPAPPER_BASE` is set. The editor
autosaves the retyped heading, so post 1's markup is put back with `PUT /api/posts/1` before each
take; a take without that selected the wrong text.

**Found, not changed:** `CLAUDE.md` ("UI at `http://localhost:4321/newspapper/`") and the
`editor.webp` row in `shots.md` name the `/newspapper/` path. Locally that path drops the query
and opens a new post unless `NEWSPAPPER_BASE=/newspapper/` is set. Both are outside this brief's
files.

Commits: 2ad75ef
Checks run: frames of the new GIF inspected at 3× zoom on the heading line (wax under the text, blue selection, every glyph whole); the README and `docs/making-a-post.md` alt text still describes the GIF.
Checks skipped: `npm test` and `npm run gate`, since no source changed.
Owner steps: none. The README image ships with the repo.
