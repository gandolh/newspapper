# Task 106 — The selected-line highlight clips the letters in the source pane

## Context

Found 2026-10-09 during the README refresh. In the editor's source pane, the
yellow (wax) highlight on the selected element clips the edges of the letters:
the first or last glyph of a run looks cut, as if a yellow block sat over it.

**Unconfirmed in a browser.** The cause below is read from the code, not
observed. Reproducing it is step 1.

## Reproduce

1. `npm run dev`, sign in through the local Ward (see
   [configuration.md](../../wiki/configuration.md#local-sign-in)), open the
   editor at `/`.
2. Open any post with a few slides. Click inside a `<Slide>` child, or click an
   element on the canvas, so the source pane waxes that element's range.
3. Zoom the browser to 300% on the source pane and look at the edges of the
   yellow run, at every token boundary inside it (`<`, the component name, each
   attr and value) and at its first and last character.
4. Compare with the same run with the highlight turned off in devtools
   (remove the `wax` class from the spans).

## Evidence

- `ui/src/components/editor/SourcePane.tsx:128-148`. The highlight layer is a
  `<pre>` of one `<span>` per token. Each span in the selected range gets the
  `WAX` class, so the wax is **applied per token**, not once to the run.
- `ui/src/components/ui/Marks.module.css:141-147`. `.wax` sets a background and
  two zero-blur `box-shadow`s, `-0.35em` and `0.35em` (about 4.4px at the
  galley's 12.5px), to bleed the wax past the text.
- Likely cause: inline boxes paint in tree order, each one's background and
  shadow first and then its text. A span's left shadow therefore paints over the
  last glyph of the span before it, and its right shadow is painted before the
  next span's text but over nothing it should not. In a run of wax tokens, every
  token boundary lets the next token's left bleed cover about half of the
  previous token's last character (a monospace glyph here is about 7.5px wide).
  The run's first character is covered the same way by the unwaxed token to its
  left. Ink on wax is `--wax-ink`, so the covered part shows as wax-yellow.
- `ui/src/components/editor/SourcePane.module.css:60-76`. `.highlight` has
  `overflow: hidden` and `padding: var(--sp-half)` (13px). The bleed is smaller
  than the padding, so the pane edge should not clip it; rule that out in
  step 1 anyway, including when the run starts at column 0.
- The design intent is in
  [design-components.md](../../wiki/design-components.md) ("bled 20px past the
  text on both sides"). The shipped value is 0.35em, not 20px, so the page and
  the code already disagree; settle which one is right while fixing this.

## What to do

1. Reproduce with a screenshot at high zoom and name the real cause. If it is
   not the paint-order one above, say so in the outcome note.
2. Fix it so no glyph is covered. Options, not a ruling: paint the wax as one
   block per contiguous run (a wrapper span, or a single absolutely placed
   layer behind the text), keep the bleed on that block only, or drop the
   `box-shadow` bleed for `padding` plus negative `margin` on a wrapper.
3. Keep the contrast and the casing rules in
   [chrome.md](../../wiki/chrome.md) intact: `--wax-ink` on wax at 8.87:1,
   bold components and italic comments stay.
4. If the bleed width changes, update the "20px" in `design-components.md` to
   match the shipped value.

## Acceptance

- At 300% zoom, no glyph in or beside a selected run is covered by wax, at
  every token boundary and at both ends of the run.
- The same check with a selected run that starts at column 0, ends at the end
  of a line, and spans several lines.
- A test or screenshot check that would fail on the old paint order. A
  happy-dom test cannot see paint order; use real Chromium through the guard in
  `core/src/render/test-support/chromium.ts`, or a recorded screenshot compare.
  Say which in the outcome note (see
  [green-because-nothing-ran.md](../../wiki/green-because-nothing-ran.md)).
- `npm run gate` passes.

## Out of scope

The wax colour, the `--wax-ink` contrast, the syntax-token colours, the lint
marks (`rubylith`) and the canvas-side selection (`waxed`). The textarea's own
`::selection` style. No change to `decorate` or `tokenize` in `highlight.ts`
unless the fix cannot be done in the render.

## Outcome — 2026-10-19

Done. The cause was the paint-order one the brief named, confirmed in the
browser.

**Reproduced** in the real app (API and Vite dev server on spare ports, a
throwaway local account on a scratch database), the starter post, the caret in
`<Heading size="xl">`, at a device scale of 3. The wax covered the right half of
the `<`, the `g` of `Heading`, the `e` of `size`, the `=`, the closing quote and
the `>`: every token's last glyph, under the next token's `-0.35em` shadow. The
glyph before the run is covered the same way (the `>` of `<Slide>` in the test).
The pane edge plays no part: the `.highlight` padding (13px) is wider than the
bleed (about 4.4px), and a run starting at column 0 shows its bleed whole.

**The fix** is in the render, not in `highlight.ts`. `SourcePane` wraps each
contiguous run of selected tokens in one span carrying `WAX` plus `.waxRun`, and
only that wrapper paints wax. `.waxRun` is `position: relative; z-index: -1`
inside `.highlight`, which is now `z-index: 0` (a stacking context), so the
ground and the bleed lie under all the galley's text, the glyphs either side of
the run included. `box-decoration-break: clone` gives each line of a multi-line
run its own ends, as the per-token bleed did. The tokens inside take
`--wax-ink` from `.onWax` (one class, so it beats the `:where()` hues); bold
components and italic comments stay. No metric changed, so the paint still sits
under the caret.

**The bleed stays 0.35em.** `design-components.md` said 20px, the comps' figure.
In a galley 7.5px to the character that is nearly three characters of yellow
either side, which reads as selecting the neighbouring tokens, so the page now
says 0.35em and why.

**The test is real Chromium, through the guard:**
`ui/src/components/editor/SourcePane.wax.test.ts` bundles the shipped
`SourcePane`, its CSS modules and `global.css` with Vite, mounts it at device
scale 3 with Spline Sans Mono served from `ui/public/fonts/`, and counts each
glyph's ink with the wax painted and with every background and shadow in the
galley switched off. A glyph under 85% of its unwaxed ink is covered. Two cases:
a mid-line run with a glyph against both ends, and a run from column 0 to the
end of a line over three lines. **Watched failing on the old code first:** 10
covered glyphs in the first case and 7 in the second, each at about half its
ink. Two guards keep it from passing on nothing: the control must find ink in
every glyph, and the waxed shot must hold wax-yellow pixels the control does
not. Breaking the stacking context on purpose (wax behind the paper, which
covers nothing) fails it with "the wax did not paint".

Found on the way: bundling a component under Vitest needs `jsxDev: false`.
NODE_ENV is `test` there, so Vite emits `jsxDEV` calls that a production React
cannot serve, and React reports the render error to the page, not to the
caller; the test now collects page errors and fails on them.

`npm run gate` passes.
