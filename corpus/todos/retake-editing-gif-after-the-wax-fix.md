---
title: Retake the README's editing GIF after the galley wax fix
created: 2026-10-31
status: open
tags: [docs, readme]
---

# Retake the README's editing GIF after the galley wax fix

`docs/images/editing.gif` was recorded on 2026-10-09 and shows the source pane with an element selected. The wax fix of 2026-10-19 changed how that selection is painted: the wax is now one span per run, under the text, so it no longer covers half of each glyph. The GIF still shows the old wax. `editor.webp` is taken with nothing selected and is unaffected.

## Context

The demo posts are written by hand, as [docs/images/shots.md](../../docs/images/shots.md) describes; there is no seed script for them. Sign-in for the capture is a local tester account now, not Ward.

## Acceptance

`editing.gif` retaken with the same beats and the same made-up post, and its row in `shots.md` dated.
