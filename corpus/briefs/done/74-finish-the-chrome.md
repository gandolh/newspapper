# Task 74 — Finish the two design-spec items worth building

## Context

Brief 64 built The Mechanical across every route and recorded, in
[design-components.md § 9](../../wiki/design-components.md#9-what-the-shipped-chrome-does-not-yet-carry),
four things the spec describes that the chrome does not carry. Each was blocked
on changing a structure another brief owned rather than on styling.

Two of the four were judged worth building on 2026-09-01. **The other two were
dropped**, and § 9 now records that as a decision rather than a gap — do not
build them, and do not treat their absence as unfinished work.

**1. The scale-chip row for constrained props** (§ 5, Fields). The inspector
still selects an enum through `Select`. The chip row is the control the spec
calls for, and **the vocabulary is already in the app** — the keyword filter on
`/posts` and the tab rows on `/articles` and the narrow editor are scale chips.
This is not a new component; it is using the one that exists in the pane that
does not.

**2. `/posts` as a grid of boards, not a list** (§ 5). Every mark is already on
the row — stamp, tissue corner, crop marks, mono columns. The layout is a row
where the spec calls for a grid of boards.

## Files you OWN

- `ui/src/components/editor/InspectorPane.tsx` + its module CSS — **only** the
  control that renders a constrained prop
- `ui/src/components/posts/PostsIsland.tsx` + its module CSS — the layout
- `ui/src/components/ui/**` — only if the chip row should become a shared
  primitive, which is a judgement call: it is currently open-coded in three
  places, so extracting it is defensible and inventing a fourth variant is not
- `corpus/wiki/design-components.md` § 9

## Files you must NOT touch

- `ui/src/styles/global.css` — the tokens are settled and were contrast-measured
- `core/**`, `api/**`, `assets/**`
- The editor's **selection model and three-pane layout** (brief 59). You are
  changing which control renders a prop, not how a prop is selected, read, or
  written. If a change reaches `edits.ts`, `paths.ts` or `props.ts`, stop.
- `.prettierrc.json`, `eslint.config.js`, the `fmt`/`lint`/`build` scripts

## What to do

1. **Replace `Select` with a scale-chip row for constrained props only.** Props
   whose values come from a named scale — `size`, `align`, `emphasis` — are the
   ones this applies to. Content props (`Image.src`, `Quote.by`, `Stat.label`)
   keep their field. If a scale ever grows past what a row can hold, say so
   rather than letting it wrap into a mess.
2. **Decide whether the chip row becomes a shared primitive.** Three open-coded
   instances already exist. Extract or don't, but say which and why — and if you
   extract, the existing three adopt it in the same pass or you have made it
   four.
3. **Lay `/posts` out as a grid of boards.** The marks are already correct; this
   is layout. It must stay on the 26px grid at the breakpoints you test, and
   **you must say which breakpoints you actually measured** — brief 64 measured
   only 1280px and said so, and that gap is still open.
4. **Update § 9** to describe what remains, and keep the two dropped items
   recorded as dropped with their reasons.

## What NOT to build

**The thumbnail strip** and **the wax half of the compile animation** were
dropped on 2026-09-01. Both require inventing a structure to serve a decoration:
there is no strip in the editor to style, and "the changed lines take the wax
briefly" needs the editor to retain a line diff purely so something can flash.
If you find yourself building either, you have misread this brief.

## Acceptance

- No constrained prop in the inspector renders through `Select`.
- `/posts` is a grid; every mark it carried as a list it still carries.
- **Nothing else changed appearance.** Brief 64's chrome was measured — zero
  border-radius, contrast ≥4.5:1 on ~330 text elements, 26px grid. Verify you
  did not regress it: `grep -rn "border-radius" ui/src/ | grep -v ": *0"`
  returns nothing, and every text colour still clears 4.5:1 against its own
  surface.
- `npm run build`, `npm test`, `npm run lint` pass; `npx tsc -p ui --noEmit` at
  0; `bash corpus/lint.sh` clean.

---

## Outcome — 2026-09-01

Both items shipped. Gate verified by the controller: build ✓, **659 tests / 47
files** ✓, lint ✓, `tsc -p ui` at 0 ✓, corpus lint ✓. `core/`, `api/`,
`assets/`, `global.css` and the editor's `edits/paths/props.ts` are untouched —
checked, not asserted.

**`ChipRow` is a shared primitive, and the brief's premise about it was wrong.**
The dispatch said three places open-code a chip row. Only **two** do — `/posts`'s
keyword filter and `/articles`'s panel switch, near-identical blocks differing
only in horizontal padding. The third, the narrow editor's pane switcher, is
`<Button variant={pane === name ? 'primary' : 'ghost'} size="sm">` in a 4px-gap
flex; **only its CSS comment calls it a chip row.** Converting it would have
changed its appearance (Archivo 12px → mono 9px uppercase) and reached brief
59's three-pane layout, so it was left alone. Both real instances adopted the
primitive in the same pass, so the chip CSS went from two copies to one — not,
as the brief risked, to three.

`size` (5 steps), `align` (3) and `emphasis` (3) — the only three scales in the
catalogue — render as chips; no `Select` remains in the pane. Content props keep
their fields. **`size` at five is the ceiling**: a scale past about six should go
back to a `Select`, recorded in §9 and in the component's docstring.

No rubylith chip was built. §5 specifies one for a masking value, but no scale
in the catalogue has such a value, so building it would have meant a variant
with no caller. §9 records it as still-not-carried.

**Brief 64's "1280px only" gap is closed for `/posts`**: 1280 in a real viewport,
then 1024 / 900 / 768 / 600 / 390 / 320 each in a same-origin iframe of that
width — real layout and media queries, same engine and stylesheet, but **not** a
resized window, and the outcome says so rather than implying viewport coverage.
Columns 3/2/2/2/1/1/1, gutter 26px above 768 and 13px below, document overflow 0
at every width including 320.

**Appearance was held by a per-property control, not by eye.** For each adopted
call site the *deleted* declarations were transcribed out of `git show HEAD:` into
a live element beside the real one and computed styles diffed: `/articles` 3
chips × 25 properties → 0 differences; `/posts` 8 chips × 20 properties → 0
differences. A sanity assertion confirmed the control carried the old classes and
the subject the new ones — so the control could not collapse into its subject,
which is the failure that bit brief 66's guard and has its own log entry.

Contrast re-measured rather than assumed: 111/111 text elements on `/posts` and
78/78 on `/kitchen-sink` at ≥4.5:1. Every mark the list carried the grid still
carries — 2 stamps, 5 tissue corners, 7 crop-mark sets, 24 `Mark`s, 7
thumbnails — and publish and delete are still behind confirms.

**Two findings outside its ownership, both filed as brief 75 and both verified
by the controller.** The tray is unusable below ~440px: the `≤768px` branch fixes
each nav cell at 78px, so at 390px the last three links sit at x = 230/308/386
and `scrollWidth - clientWidth === 0` — those routes are unreachable, with no
scroll to reach them. And ten galley elements fail 4.5:1 **on the wax of the
selected line**: `.punct`/`.attr` at 3.88:1 and `.value` at 4.43:1, both
confirmed numerically. Neither is a regression; both have shipped since brief 64,
and both are states a once-per-element sweep at one viewport cannot reach.

Method caveat the agent stated rather than hid: `git stash` is blocked by this
environment, so no pre-change bundle could be built for a pixel diff. The
injected-old-CSS control above is the substitute — stronger per-property, but it
does not cover pixels nobody enumerated.
