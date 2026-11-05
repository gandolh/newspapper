# Task 03 — A text selection in the galley keeps its text

## Context

Found on 2026-11-05 while retaking the editing GIF (brief 01) and promoted
from the todo `galley-text-selection-hides-the-selected-text` the same day.

The source pane is a transparent `<textarea>` laid over the galley's `<pre>`,
which draws the visible text. `ui/src/components/editor/SourcePane.module.css`
gives the textarea

```css
.input::selection {
  background: var(--wax);
  color: transparent;
}
```

The textarea paints above the galley, so the opaque wax covers the galley's
glyphs, and the textarea's own glyphs are transparent: a selected range shows
as a blank wax bar, and the selection box is the full line height, taller
than the wax run under a caret. The 2026-10-19 wax fix (one wax span per
run, under the text) works for a caret; this is the selection only. The rule
has been there since the editor's first commit (`f315e01`).

[design-components.md §7](../../wiki/design-components.md) says a text
selection is wax on wax-ink. [chrome.md](../../wiki/chrome.md) lists
`::selection` among the states a contrast sweep cannot see, so the check has
to look at pixels or computed styles, not run a contrast tool.

Brief 01 (the GIF retake) waits on this: its first beat selects text. The
owner put README retakes off on 2026-11-05, so 01 stays blocked after this.

## Files you OWN

- `ui/src/components/editor/SourcePane.module.css`
- `ui/src/components/editor/SourcePane.tsx`, only if the fix needs markup
  (for example the galley drawing the selection itself)
- A test beside `SourcePane.wax.test.ts`, or that file
- `corpus/wiki/design-components.md` or `chrome.md` if a stated rule changes;
  `corpus/log.md`, `corpus/wiki/status.md`

## Files you must NOT touch

- `docs/images/` (the retakes wait for the owner).
- The wax run itself under a caret: it is right.

## What to do

1. Reproduce: in the local app, select a range in the source pane (drag,
   Shift+arrows, or `setSelectionRange`) and see the text vanish.
2. Make the selected text readable as wax-ink on wax, with the selection
   painted no taller or wider than the wax run. Two directions to weigh, the
   simpler that holds in Chrome and Firefox wins:
   - the textarea's `::selection` becomes transparent (or nearly) and the
     galley paints the selected range itself, as it paints the element's
     wax run; or
   - the textarea's `::selection` keeps wax but shows its own glyphs in
     wax-ink, if they line up with the galley's exactly (same font, size,
     padding, wrapping).
3. Keep the caret, typing and the element wax run as they are.

## Acceptance

- With a range selected in the galley, the selected text stays readable in
  wax-ink on wax, in Chrome; Firefox too if it can be checked locally.
- The selection paints no taller or wider than the wax run.
- A test pins the rule (computed style, or the galley's selection spans).
- Typecheck, lint and the editor's own tests pass.
- The todo `galley-text-selection-hides-the-selected-text` is deleted when
  this brief moves to `done/` (the repo's convention).
