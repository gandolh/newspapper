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
chrome. One smaller call, with the default this brief builds:

1. **The exact ground.** Default: a new token, `--non-photo-select:
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
