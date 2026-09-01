# Task 76 — The API health mark loses its word, and its ink is the only signal left

## Context

Found by brief 75 while sweeping the narrow tray, in a file that brief was not
allowed to touch. It is the same species as the two defects brief 75 fixed: a
state nobody measured.

`ui/src/components/ApiHealthDot.module.css:6-10` hides `.label` at
`max-width: 768px`. So below that width, an offline API is signalled by a **6px
red tick and nothing else** — the 320px tray renders `NEWSPAPPER … SIGN OUT –`.

That contradicts a named rule. `design-components.md` §5: *the ink is never the
only signal — every tone has its own word.* The whole reason The Mechanical uses
marks rather than coloured badges is that colour alone is not a signal, and this
is the one place the chrome breaks its own rule.

The `aria-label` survives, so this is a **visual-only** loss — a screen reader
still hears it. That narrows the fix but does not excuse it: the person most
likely to miss a dead API on a phone is someone glancing at the tray.

## The judgement this needs

There is no obvious right answer, which is why this is a brief and not a patch.

- **Keep the word at narrow widths.** Honest, and costs horizontal space in a
  tray that brief 75 just made tight — the session course at 320px is already
  `NEWSPAPPER … SIGN OUT`.
- **Differentiate by shape, not only ink.** The mark set already has `HATCH` and
  the tick; an offline state could take a visibly different *form*, which
  satisfies "the ink is never the only signal" without spending width. This is
  probably the answer, but it means deciding what the shapes are.
- **Move the health mark out of the tray below 640px**, into a place that has
  room. Costs discoverability.
- **Accept it and change the rule.** Legitimate if you argue it — but then §5
  has to say so, because a rule the code openly violates is worse than no rule.

Pick one and argue it. Whichever you pick, §5 and the code must agree when you
are done.

## Files you OWN

- `ui/src/components/ApiHealthDot.tsx` + `ApiHealthDot.module.css`
- `ui/src/components/ui/Marks.tsx` + `Marks.module.css` — **only** if a shape
  variant is the answer
- `corpus/wiki/design-components.md` §5, `corpus/wiki/chrome.md`

## Files you must NOT touch

- `ui/src/components/Sidebar.module.css` — brief 75 just rebuilt the narrow
  tray as a two-course grid; do not re-lay it out
- `ui/src/styles/global.css` — tokens are settled and contrast-measured
- `core/**`, `api/**`, `assets/**`
- `ui/src/components/editor/**`, `ui/src/components/posts/**`
- The `fmt`/`lint`/`build` scripts, `.prettierrc.json`, `eslint.config.js`

## Acceptance

- At **320, 390 and 768px**, the API's state is distinguishable **without
  relying on hue** — verify by measurement, and say how.
- Every text colour still clears 4.5:1 against its own surface, including any
  new state you introduce, and including on the wax if it can land there.
- The tray still fits at 320px with no document h-scroll and no unreachable
  route — brief 75's two-course grid is measured and must stay that way.
- `design-components.md` §5 and the shipped code agree.
- `npm run build`, `npm test`, `npm run lint` pass; `npx tsc -p ui --noEmit` at
  0; `bash corpus/lint.sh` clean.
- **State your measurement method exactly** — real viewport, iframe, or
  arithmetic. Brief 75 drove a real Chromium viewport with Playwright, which is
  already a dependency; that is the bar.
