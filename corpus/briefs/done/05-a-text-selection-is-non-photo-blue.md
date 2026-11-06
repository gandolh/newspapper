# Task 05 — A text selection is non-photo blue

## Context

Since brief 03 (2026-11-05) the galley paints a text selection as wax under
`--wax-ink`, the same wax as the run that marks the selected element. A
click selects the element under the caret, so most selections lie inside
that run, and a selected word of a heading keeps its text readable but
shows no extent. That was the open question "How does a selection inside
the waxed element show?" in [open-questions.md](../../wiki/open-questions.md).

On 2026-11-06 the owner chose **a different colour for selections,
everywhere**, not a deeper wax on the overlap, and picked **non-photo
blue**: the light blue paste-up artists marked with because the camera
doesn't see it, already the board's grid lines (`--non-photo`,
`rgba(127, 182, 232, 0.4)` in `ui/src/styles/global.css`). This changes
[design-components.md §7](../../wiki/design-components.md#7-browser-surfaces)
("text selection (wax on wax-ink)") and the galley paragraph in §5 that
says a selection is the same wax and ink.

The colour, measured on 2026-11-06 (WCAG contrast): `--non-photo` at its
grid strength over paper is `#cce2f6`, 10.6:1 under graphite but 1.05:1
against wax, so inside the wax run it would differ by hue alone and vanish
for blue-yellow colour blindness. At 80% over paper it is **`#99c5ed`**:
graphite `#2b2b2b` 7.8:1 on it, and 1.3:1 against wax, so it differs in
lightness too. On it the other inks fail: `--wax-ink` 6.8:1 passes,
`--graphite-soft` 2.97:1, `--process-blue` 3.4:1 and `--rubylith-ink`
3.1:1 don't.

## Owner decisions

Settled on 2026-11-06: non-photo blue for every text selection in the
chrome. The smaller call, answered the same day:

1. **The exact ground.** **Decided:** a new token, `--non-photo-select:
   #99c5ed` (non-photo at 80%, solid), with `--graphite` as the ink on it,
   as measured above. Slide themes are untouched: they never show a
   selection.

## What to do

1. The token in `global.css`, beside `--non-photo`, with the two
   measurements in its comment. The global `::selection` uses it, with
   `--graphite` as the colour.
2. The galley: `.selectionGround` in
   `ui/src/components/editor/SourcePane.module.css` uses the new ground,
   painted above the element's wax run, so a selection inside the run
   shows as blue with its exact extent. The tokens in the selected range
   take `--graphite`, a separate class from `.onWax` (in
   `SourcePane.tsx`, the `TEXT_SELECTION_MARK` case), since paper inks
   don't hold on the blue; a selected token outside the element's run
   gets the same. Comments stay italic and components 700, as on wax.
3. On 2026-11-06 the only `::selection` rules in `ui/src` were the global
   one and the textarea's transparent one in `SourcePane.module.css`,
   which stays transparent; grep again in case one was added.
4. Tests: the existing galley selection test now expects the blue ground
   and graphite ink, inside the element's wax run and outside it; one
   computed-style check that `::selection` resolves to the token. The
   check reads computed styles or pixels, not a contrast tool
   ([chrome.md](../../wiki/chrome.md) notes contrast sweeps can't see
   `::selection`).
5. Corpus: design-components §5 and §7, chrome.md's selection paragraphs,
   a dated line under "The workstation is redesigned; the slide theme is
   not" in `decisions.md` (selections leave the wax), and `log.md`. The
   open question was already moved to "Settled" when the owner answered.

## Files you OWN

- `ui/src/styles/global.css` (the token and the global `::selection`)
- `ui/src/components/editor/SourcePane.module.css`,
  `ui/src/components/editor/SourcePane.tsx` and their tests
- `corpus/wiki/design-components.md`, `corpus/wiki/chrome.md`,
  `corpus/wiki/decisions.md` (the dated line), `corpus/log.md`

## Files you must NOT touch

- `assets/design-systems/` and anything in the slide render: selections
  are chrome only.
- The element's wax run itself: the selected element still shows as wax.

## Acceptance

- `npm run gate` passes.
- In the editor (the dev server, `/newspapper/`): select a word inside the
  selected heading; the word shows on blue with its exact extent, inside
  the yellow run. Select text in the inspector or a settings field; it
  shows the same blue.
- **Owner step:** `node cli.ts newspapper all` from vps-deploy.

## Outcome (2026-11-06)

Built in `910d5eb`. `--non-photo-select: #99c5ed` sits beside `--non-photo`
in `global.css` with its measurements (rechecked: graphite 7.8:1 on it, 1.3:1
against wax), and the global `::selection` is that ground under `--graphite`.
The only other `::selection` rule in `ui/src` is still the textarea's
transparent one. Selected tokens in the galley take graphite from a new
`.onSelection` class, on the run or off it; components stay 700 and comments
italic.

**The galley needed a change of structure, not a colour.** Brief 03 painted
the ground on a second `<pre>` under the galley. Under the wax run that ground
can only go under the wax or over everything: the run is an inline stacking
context whose wax and text paint together, and lifting the layer above it hid
every selected glyph in the run (watched: 0 ink on all nine letters of the
word). So the second `<pre>` is gone and the ground is a wrapper in the
galley's token tree, one per contiguous range of selected tokens, split where
it crosses the run's edge. Off the run it sits behind the text at
`z-index: -1`, as the run does. Inside the run it is an ordinary inline box:
in an inline stacking context a negative layer paints under the element's own
ground (tried, and the blue vanished under the wax), so tree order is the way
in, its blue painted after the wax and under its own text. The one cost: it
paints after the glyph before the selection, so an oblique comment leaning
into the first selected cell would lose its tip there.

**One touch on the wax run**, outside the brief's list but needed: its
`z-index` went from `-1` to `-2`. At the same level, a selection that ends
where the run begins comes first in tree order, and the run's bleed painted
over its last 0.35em, glyph included (watched: the `>` before the run at 71 of
136 ink pixels). The wax itself looks the same.

**Tests.** `SourcePane.wax.test.ts` now has 11 Chromium cases. Changed: the
selection off the run expects blue and graphite; new: a word inside the run
shows blue pixels exactly as wide as its characters, graphite on it and
wax-ink on the rest of the run; a selection crossing into and out of the run
is two wrappers with no column of the blue missing; `getComputedStyle(p,
'::selection')` gives `rgb(153, 197, 237)` and graphite, and the token reads
`#99c5ed`. Run against the old code, six of them fail. The editor's tests
pass (10 files, 88 tests).

**Checks run:** the editor's tests, including that Chromium file;
`npm run lint`; `npm run build` (format check, `tsc` for all three
workspaces, vite build). **Skipped:** `npm run gate` and the full `npm test`,
which launch real Chromium across many files on a shared machine; this change
touches only the galley and `global.css`, whose tests ran. No browser walk in
the dev server: the galley's look was checked on screenshots from the test's
own page (a word inside the run, and selections crossing the run's edge both
ways), and `::selection` by computed style. The owner's walk after the deploy
covers the inspector and settings fields.

**Corpus beyond the brief's list:** `design.md`'s Non-Photo Rule said the blue
carries nothing, ever; it now names this one exception and the token joins
its frontmatter. `decisions.md` takes the dated line as a list item under the
section's last paragraph, since the page sits at the 200-line cap.

**Owner step:** `node cli.ts newspapper all` from vps-deploy, then the
editor walk in the board's deploy note.
