---
summary: The Mechanical — the app chrome as shipped: tokens, the mark set, the tray and its two-course narrow layout, the health probe's two states, the two authored animations, why it shares nothing with the slide themes, and the states a once-per-element contrast sweep cannot see.
updated: 2026-09-01
---

# The app chrome — The Mechanical

A paste-up board, chosen by the owner on 2026-08-27 after two direction rounds
and built in brief 64. It shares no token, colour or typeface with the
[slide themes](./design-systems.md), and that is the point: the 1080² artwork
appears in exactly one place in the app — on paper, inside crop marks, as the
thing being made — and everything around it is board, graphite and production
marks.

Canonical reference: **[design.md](./design.md)** (§1–§4, plus the token block)
and **[design-components.md](./design-components.md)** (§5–§9), re-derived from
the shipped chrome on 2026-08-31 and moved out of the repo-root `DESIGN.md` by
brief 63. §2 records the five comp values that could not hold 4.5:1 as real
text; §9 records what the chrome does not yet carry.

- **Tokens** — `:root` in `ui/src/styles/global.css`. Board `#fbfbf9` under a
  26px non-photo blue lattice, paper for anything waxed onto it, 70% tissue
  for the inspector; graphite `#2b2b2b` text with `graphite-soft` `#6d6a62`
  the floor and `graphite-tint` `#7a7a76` for rules and ticks only. **No
  radius scale** — deleted, and nothing in `ui/` sets `border-radius`. Two
  shadows, `--shadow-waxed` and `--shadow-hinged`, both physical.
- **Typefaces** — Archivo (variable `wdth`/`wght`) and Spline Sans Mono,
  self-hosted in `ui/public/fonts/`, served from Vite's public dir at
  `/fonts/*`. Inter is
  declared for one consumer only, the preview canvas, which must set the type
  Chromium will; `assets/fonts/` (API, `/assets/fonts/*`) is the renderer's
  separate copy.
- **State is a mark, never a badge.** `Badge`, `Stepper` and `Spinner` are
  gone; `ui/src/components/ui/Marks.tsx` draws each mark once — `Mark`,
  `Stamp` (published), `TissueCorner` (draft), `HeldOut`/`HATCH` (held out,
  disabled, won't compile — the *only* way the app says that), `WAX`,
  `CropMarks`, `RegisterTargets`, `Finding`.
- **Two animations, no more** — `ui/src/lib/motion.ts`, on
  [anime.js](./decisions-engineering.md#animejs-is-the-motion-engine-tailwind-bound-kits-are-references-only)
  4.5.0: *the compile* (the stage frame re-sets; never the canvas) and *the
  hinge* (the tissue rotates about its top edge on a selection change). Both
  jump to the end state under `prefers-reduced-motion` — asserted by
  `ui/src/lib/motion.test.ts`.
- **The tray** is `ui/src/components/Sidebar.tsx`: a full-width 78px strip of *showings* —
  each compartment renders what its route produces, not a label — pointing at
  `/`, `/posts`, `/articles`, `/settings`, and `/login` via `SessionMenu`.
  It is 78px at every width. Below 640px, where one course stops fitting, it
  divides into **two courses** instead — one unit of head (wordmark, session)
  over two units of compartments, each compartment a share of its course
  rather than a fixed width. See the note below on why the fixed width was
  wrong even though it was a grid multiple.
- **The health probe** — `ui/src/components/ApiHealthDot.tsx` — ships **two
  states**, `up` and `down`. A check in flight paints as *up*; brief 76 folded
  the old `loading` away because it never had a form of its own (it shared the
  `dim` tone with `online`, so only the word ever told them apart). Above
  640px it is a tick and a word in the session cell. Below 640px it renders
  **nothing** when up and the tick plus `API DOWN` when down — clipped, not
  `display: none`, so the word stays in the accessibility tree at the width
  where the sighted view gives it up. See the note below.
- **Primitives** in `ui/src/components/ui/` still sit on Base UI with
  unchanged wrapper APIs (`Select`'s `onValueChange`, `Toggle`'s
  `onCheckedChange`); keep raw `<input>`/`<button>`/dialog elements out of
  feature components. `/kitchen-sink` is the proof surface — every
  primitive and mark on one board — and it exists **only under `vite dev`**,
  via the `proofSheet` plugin in `ui/vite.config.ts`. Keep it current.

## What a once-per-element sweep cannot see

Brief 64 measured the chrome carefully and said what it measured: **one
viewport, one state per element**. Briefs 75 and 76 fixed three defects that
sat exactly in that blind spot. All three had shipped since 64; none was a
regression. All three are worth reading as a method note rather than as bugs.

**Grid-conformance is not fitting.** The tray's narrow branch was written in
26px multiples — `width: 78px /* 3 × 26 */` — exactly as the One Grid Rule
asks, and it was still broken: at a 320px viewport the brand block, four 78px
compartments and the session cell wanted 619px of strip, the nav list was left
a 12px window onto 312px of compartments, and `/posts`, `/articles` and
`/settings` were unreachable — the hit test at each link's centre returned the
session cell. A rule stated in units invites the belief that satisfying the
units satisfies the layout. It does not: the unit says how big a thing may be,
never whether there is room for it. The grid still governs the tray — the
courses are 1 and 2 units and the strip is 3 — but a compartment's *width* is
now a share of the space that exists. Anything sized in multiples along an axis
that has to hold several of them needs a width measured in a browser, at the
narrowest viewport it claims to support, not an arithmetic check that the
number divides by 26.

**Contrast is a property of a pair, and one of the pair moves.** Every galley
token cleared 4.5:1 against paper, which is the surface the sweep visited. On
the wax highlight that marks the selected element they did not: `punct` and
`attr` measured 3.88:1 and `value` 4.43:1, because the token colours won the
cascade over the wax mark's own ink and the galley spent the selected line
writing paper ink on wax. `--wax-ink` (8.87:1 on wax) existed the whole time
and never applied anywhere. The states a sweep must re-visit, because each one
changes a surface or an ink under text that already passed:

- **on a highlight** — wax in the galley; `::selection` anywhere text is selectable
- **selected / current** — the waxed compartment, the lifted node, the inverted chip
- **hover and focus-visible** — anything that swaps ink or ground on pointer or key
- **disabled and held out** — rubylith wash and 45° hatch, both laid *over* live text
- **error** — the rubylith wash under a lint-flagged run
- **narrow** — any breakpoint that *removes* content rather than reflowing it;
  what is left has to still say what the removed thing said

**A breakpoint that hides the word leaves hue holding the state.** The health
probe hid its label under `max-width: 768px`, so from 320 to 768 both states
painted the same 6 × 1 pixel tick and differed only in ink — a 320px tray read
`NEWSPAPPER … SIGN OUT –`, which is the one place the chrome broke *state is
carried by mark, never by a coloured badge*. Measured on the production bundle
in a Chromium viewport, the up and down trays differed in **6 greyscale pixels**
at 320, 390, 640, 641 and 768 — the tick, and nothing else. The fix is not a
smaller mark. A tick that size cannot be hatched, filled or reshaped
legibly: **any hue-free distinction needs area, and the word was the area.**
So the probe keeps the full word at every width and spends the width only when
it has something to say. Same sweep after: **628 greyscale pixels** at 320 and
390, 146 from 641 up. The breakpoint also moved 768 → 640, where the tray
actually folds; between 641 and 768 the word had been hidden inside a strip
that was still one roomy course.

Two things that look like findings and are not. The galley's `<textarea>` is
deliberately `color: transparent` over the painted `<pre>`; any sweep will flag
it and it is correct as it stands. And on wax the galley pools its hues into
`--wax-ink` on purpose: bold and italic still separate component from tag from
comment, and the one hue that carried meaning — `process-blue` on prop values —
is carrying it for the element the tissue is displaying in full at that moment.

**Accepted degradation below 320px.** At 240px in the down state, the widened
session cell squeezes the brand cell — which is the flexible column and is set
to clip — and the wordmark reads `NEWSPAP`. Every route stays reachable and
document h-scroll stays 0; the wordmark is intact at 320px, the narrowest width
any real device uses. Recorded rather than fixed: brief 75 measured the tray
with the probe 6px wide, so no sweep had seen the brand cell under a *wide*
session cell until brief 76 gave the probe a word to carry.
