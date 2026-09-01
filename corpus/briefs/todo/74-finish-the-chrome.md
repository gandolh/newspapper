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
