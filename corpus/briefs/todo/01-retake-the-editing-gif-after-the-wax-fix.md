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
