# Task 71 — Make the typeface guard's control explicit, and escape style values

## Context

Two findings from brief 67, both in code brief 67 was not allowed to change.

## 1. The typeface guard rests on a quoting convention

`core/src/render/fonts.test.ts` is brief 66's guard: it renders a slide and
compares it against a control built by
`html.replace(/'Inter'/g, "'NoSuchFaceOnThisMachine'")`, asserting the two
differ. If they ever stop differing, Inter is not loading.

That control works **only because the inline styles say `font-family:Inter`
unquoted**. The regex therefore hits the `@font-face` rule alone, and the text
is left asking for a family nothing defines. Quote the inline family and the
regex renames it too — so the text asks for `'NoSuchFaceOnThisMachine'`, the
`@font-face` still loads it from the real `Inter-*.ttf` via brief 66's disk
route, and **control and subject become the same document**.

Brief 67 hit this for real: its first cut emitted `'Inter',sans-serif` to match
the body rule, and the guard failed. That it failed *closed* was luck. A guard
whose control silently collapses into its subject is the shape of every
"green because nothing ran" entry in [log.md](../../log.md) — this one has now
been hit six times in this repo.

The test's own comment (around line 185) claims it renames the family "in the
`@font-face` rule *and* in every `font-family`". **That is not what happens**,
and the test works because it is not what happens.

## 2. Style values are interpolated into an attribute without escaping

`core/src/templates/interpreter.ts:176-181` — `styleToString` builds
`style="…"` by interpolation, used at the three `renderNode` call sites. A theme
token containing a `"` breaks out of the attribute. Not reachable from the three
themes on disk, so this is hardening, not a live defect. Brief 67 dropped its
sanitizing quote logic rather than half-fix this.

## Files you OWN

- `core/src/render/fonts.test.ts`
- `core/src/templates/interpreter.ts` and its tests

## Files you must NOT touch

- `assets/design-systems/**` — brief 67 deliberately left the themes alone
- `core/src/render/fonts.ts`, `screenshot.ts` — brief 66's fix is settled
- `core/src/wizard/**` · `api/**` · `ui/**`

## What to do

1. **Make the control document explicit.** The guard should not depend on any
   quoting convention in the code under test. Build the control so it is
   *structurally* incapable of loading Inter — render it from a theme whose
   family genuinely does not exist, or strip the `@font-face` block, or
   otherwise make the absence a fact rather than a side effect of a regex.
   Whatever you choose, a reader must be able to see why the control cannot
   render in Inter without reasoning about quoting.
2. **Prove the new control still fails when it should.** Break Inter loading
   deliberately (brief 66's route interception is the obvious lever) and show
   the guard failing. A guard that has never been seen to fail is not a guard.
3. Fix the comment so it describes what the code does.
4. **Escape style values** in `styleToString`. Add a test with a token
   containing a quote.

## Acceptance

- The guard does not depend on the quoting of `font-family` anywhere. Prove it:
  change the emitted family to a quoted form, and the guard must still work.
- The guard is demonstrated failing when Inter genuinely cannot load, and
  passing otherwise — quote both outputs in the outcome note.
- A theme token containing `"` cannot escape the `style` attribute, with a test.
- `npm run build`, `npm test`, `npm run lint` pass; `npx tsc -p ui --noEmit` at 0.
