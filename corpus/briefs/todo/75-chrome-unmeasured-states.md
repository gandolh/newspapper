# Task 75 — The two chrome states nobody measured

## Context

Brief 64 built The Mechanical and measured it carefully — contrast across ~330
text elements, the 26px grid, zero radius. But it measured **one viewport
(1280px) and one state per element**, and said so. Brief 74 closed the viewport
gap for `/posts` and, doing it, found the two places the original sweep could
not have reached.

Neither is a regression. Both have been shipping since brief 64.

**1. The tray is unusable below ~440px, and does not scroll.**
`ui/src/components/Sidebar.module.css`'s `@media (max-width: 768px)` branch sets
`.cell--nav { width: 78px }` — fixed, not flexible. With a brand compartment plus
four nav compartments plus the session and health cells, the row is wider than a
phone viewport. Measured at 390px: the `/posts`, `/articles` and `/settings`
links sit at x = 230, 308 and 386 with width 78 — the last one starting 4px from
the right edge and extending past it — and `document.scrollWidth -
clientWidth === 0`, so **nothing scrolls to reach them.** Those routes are
simply unreachable.

This is the real content of the sentence brief 64 left in its outcome note: *the
≤768px branch is written in grid multiples but was never measured in a browser.*
It was written correctly in 26px units and is still wrong, which is the point —
grid-conformance is not the same as fitting.

**2. Ten galley elements fail 4.5:1 on the selected line.**
`ui/src/components/editor/SourcePane.module.css`. On the wax highlight
(`--wax #f5d97a`) that marks the selected line, `.punct` and `.attr` at
`--graphite-soft #6d6a62` measure **3.88:1**, and `.value` at
`--process-blue #1d63a8` measures **4.43:1**. Both verified.

Brief 64's sweep measured every colour against *its own surface* — and each of
these clears 4.5:1 against paper. They fail only on the one line that is
currently selected, which is a state a static sweep does not visit.

**The design system already contains the fix.** `--wax-ink #3d3416` measures
**8.87:1** on wax, and exists precisely because wax is a surface that needs its
own ink. That is the likely answer for `.punct`/`.attr`; `.value` needs a
decision, because `--process-blue` is carrying meaning (prop values are the one
thing the markup itself names) and a darker blue may or may not still read as
the same signal.

An eleventh element the audit flags is the deliberately transparent `<textarea>`
over the highlight layer — a false positive. Do not "fix" it.

## Files you OWN

- `ui/src/components/Sidebar.module.css` (and `Sidebar.tsx` if the fix is
  structural rather than CSS)
- `ui/src/components/editor/SourcePane.module.css`
- `ui/src/styles/global.css` — **only** if a new ink token is genuinely needed;
  prefer an existing one, and say why if you add
- `corpus/wiki/chrome.md`, `corpus/wiki/design-components.md`

## Files you must NOT touch

- `core/**`, `api/**`, `assets/**`
- `ui/src/components/editor/{edits,paths,props}.ts` and the three-pane layout —
  brief 59's selection model
- `ui/src/components/ui/ChipRow.tsx` — brief 74 just shipped it
- The `fmt`/`lint`/`build` scripts, `.prettierrc.json`, `eslint.config.js`

## What to do

1. **Make every route reachable at 320px.** The options are a horizontally
   scrolling tray, compartments that shrink below 78px, or a different narrow
   layout entirely. **Pick one and argue it** — 78px is `3 × 26` and the grid is
   load-bearing in this design, so shrinking is not free. A tray that scrolls
   keeps the unit and costs discoverability; a different narrow layout keeps
   both and costs a second thing to maintain.
2. **Get the galley to 4.5:1 on wax.** Try `--wax-ink` first. For `.value`,
   decide whether the blue can darken and still read as the same signal, or
   whether the wax line should drop the colour distinction entirely — and say
   which, with the measured ratio.
3. **Record the general lesson in `chrome.md`**: a contrast sweep that visits
   each element once, in its default state, does not cover selected, hovered,
   disabled, or on-a-highlight. Name the states worth re-measuring.

## Acceptance

- At **320, 390 and 768px**, every route in the tray is reachable — either
  visible or reachable by a scroll that actually exists. State the mechanism.
- Every galley token measures **≥4.5:1 against the wax**, not only against
  paper. Put the measured ratios in the outcome note.
- Nothing else changes appearance: `grep -rn "border-radius" ui/src/ | grep -v
  ": *0"` returns nothing, and `/posts`, `/articles`, `/settings` and the editor
  look as brief 74 left them at 1280px.
- `npm run build`, `npm test`, `npm run lint` pass; `npx tsc -p ui --noEmit` at
  0; `bash corpus/lint.sh` clean.
- **Say which viewports you actually measured and how** — a real viewport, an
  iframe, or arithmetic. Brief 74's sub-1280 numbers were iframe-measured and it
  said so; do the same.
