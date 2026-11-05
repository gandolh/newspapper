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

## Outcome (2026-11-05)

Done, the brief's first direction: **the galley paints the selection.** The
textarea's `::selection` is now transparent ground and transparent ink, so it
paints nothing. `SourcePane` keeps the textarea's range in state while the
textarea has focus and the range is not collapsed (a caret is no selection,
and blur clears it), and shows it in two halves:

- **the ground** on a second `<pre>` under the galley (`.selectionLayer`): the
  same text, unpainted, with the selected characters in one inline span on wax.
  It sits under the galley's glyphs, so it cannot cover one, and an inline box
  is the text's height (15 px) where the textarea's highlight was the whole
  23 px line. No bleed: the ground ends where the characters do.
- **the ink** on the galley's tokens: a `text-selection` mark through
  `decorate`, and tokens in the range take `--wax-ink` from `.onWax`.

The second direction (the textarea's own glyphs in wax-ink over a wax
`::selection`) was ruled out: a highlight pseudo-element's box is the line box,
so it cannot be shorter than 23 px, and the textarea's glyphs are all regular
and upright, so bold components and italic comments would flatten under it.
Painting the ground in the galley's own token tree was ruled out too: a
background on a token covers any overhang of the glyph before it, and comments
are synthetic oblique, which leans into the next cell.

**Test.** `SourcePane.wax.test.ts` gains four Chromium cases: every selected
glyph keeps its ink with the selection painted (the control now also switches
off the textarea's `::selection` ground), every token in the range is
`rgb(61, 52, 22)`; the ground is the wax run's height (15 px against a 23 px
line) and lines up with the galley's characters to under half a pixel; each
line of a three-line selection is text-height; a caret paints nothing and blur
clears it. Run against the old CSS, all four failed (every selected glyph at 0
ink), the three wax cases passed. With the fix: 7 of 7; the editor's tests 84
of 84; ui typecheck, `npm run lint` and Prettier clean. Firefox was not
checked: it is not installed locally.

**Browser check** at 1280×800 in the local app, signed in as a tester on a
scratch database (account and database deleted after): selecting slide 1's
heading, and a range from the kicker into the next line's text, both read as
wax-ink on wax, line by line at text height.

**Open, the owner's call.** The element's wax run and the selection are the
same wax, and a click selects the element under the caret, so a selection
inside the waxed element (a word of the heading) has no visible extent: its
text stays readable, but nothing shows where it starts or ends. Before, the
bar was taller than the run and hid the text. Telling them apart needs a
visible change beyond "wax-ink on wax" (a deeper wax where the two overlap,
say), so it is recorded in [open-questions.md](../../wiki/open-questions.md)
instead of being decided here. Brief 01 stays blocked: README retakes wait for
the owner.
