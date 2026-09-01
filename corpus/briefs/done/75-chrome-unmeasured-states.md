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

---

## Outcome — 2026-09-01

Both fixed. Gate verified by the controller: build ✓, **659 tests / 47 files** ✓,
lint ✓, `tsc -p ui` at 0 ✓, corpus lint ✓, zero non-zero `border-radius`.
`global.css`, `core/`, `api/`, `assets/`, `ChipRow` and `/posts` are untouched —
checked, not asserted.

**The brief's own premise was wrong in both directions, and measurement found
it.** `document.scrollWidth - clientWidth === 0` was true, but `ul.cells` *was*
an overflow-x scroll container: scrollWidth 312 against clientWidth **82 at
390px** and **12 at 320px**. So at 390 the three routes were reachable — by an
invisible, undiscoverable scroll — and at **320 they were genuinely
unreachable**, confirmed by hit-testing after `scrollIntoView`, where
`elementFromPoint` returned the Sign-out button for all four nav links. Worse
than reported at 320, milder at 390. The scroll was not the missing fix; it was
the bug's disguise.

**The tray divides into two courses below 640px** — 1 unit of head (wordmark
left, session right) over 2 units of compartments, inside the same 78px strip.
`--tray-h` is unchanged, so `EditorIsland`'s `calc(100vh - var(--tray-h) - …)`
needed no edit and `global.css` was never opened. Compartments become equal
`flex: 1 1 0` shares floored at `--sp-double`, below which the course scrolls for
real.

The grid survives where it matters: courses are 1 and 2 units, the strip is 3,
the showing is 1. **Only the compartment *width* stopped being a multiple — and
width was never in the spec**, which dimensions a tray cell by `height: 78px`
alone. Rejected, each with a number: shrinking to 52px (at 320px one course needs
151 + 208 + ~150 = 509, arithmetically impossible); horizontal scroll as the fix
(it already existed and was the disguise); icon-only compartments (costs the
caption and still does not fit); growing the tray to 104px (would edit
`global.css` and a token other files consume).

**The galley bug was bigger than filed.** `--wax-ink` was not merely losing to
two tokens — it was **never applying anywhere**: `.text` and `.component` were
taking graphite at 10.17:1 on wax, which passes, so nothing flagged them. All
eleven wax spans now measure **8.87:1**.

The fix is the right shape: every token *colour* is written at zero specificity
with `:where()`, so `Marks.module.css`'s `color: var(--wax-ink)` on the wax run
wins **regardless of module emit order**. Weight and slope stay at normal
specificity, so `component` is still 700, `binding` 700, `comment` italic. That
removes the cascade fight rather than winning it — the emit-order dependence was
the actual defect, and a specificity bump would have left it one refactor away
from returning.

**`.value` pools into `--wax-ink`; the blue does not darken.** Four reasons, and
the second is the good one: the blue's job is that prop values are the one thing
the markup names — and on the *selected* run that job is redundant, because the
tissue is displaying that element's props in full at that moment. Also: two inks
on one line is two marks, against The One Mark Rule; the casing distinction
survives in weight and slope; and keeping the blue needed a new token
(process-blue needs L ≤ 0.1177 for 4.5:1 on wax and sits at 0.1208 — it fails by
a hair) plus a `design.md` sidecar entry the brief did not own.

**Measured in a real Chromium viewport, not iframes** — Playwright, already a
dependency, driving `setViewportSize` across 240 / 280 / 320 / 390 / 480 / 600 /
640 / 641 / 700 / 768 / 1024 / 1280. Zero unreachable routes, zero clipped
compartments, zero document h-scroll at every one. **Then re-run against the
production bundle**, which was worth doing precisely because the fix turns on CSS
module ordering and dev and prod concatenate differently. One figure is
arithmetic and labelled as such: `--wax-ink` over a lint-error run (16% rubylith
wash on wax) computes to ~7.46:1, unmeasured.

Nothing else changed at 1280: full-page screenshots of `/`, `/posts`,
`/articles` and `/settings` before and after are **byte-identical PNGs**. Only
the editor with a node selected differs, which is the intended change.

**One finding outside its ownership, filed as brief 76:**
`ApiHealthDot.module.css` hides its label below 768px, so an offline API is a
6px red tick and nothing else — contradicting §5's *the ink is never the only
signal*. Visual-only; the `aria-label` survives.
