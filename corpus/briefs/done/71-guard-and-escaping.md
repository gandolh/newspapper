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

---

## Outcome — 2026-08-31

Both fixed. Gate verified by the controller: build ✓, **657 tests / 46 files** ✓,
lint ✓, `tsc -p ui` at 0 ✓, corpus lint ✓.

**The control is now structurally incapable of loading Inter, and the guarantee
is checked on the product rather than trusted from the process.** `noInterHtml()`
takes the subject document itself, deletes every `@font-face` block and renames
the face on a word boundary (`\bInter\b`, case-insensitive, so `Inter`, `'Inter'`
and `"Inter"` all go) — then `assertCannotLoadInter()` reads the finished string
and throws unless it contains **no `@font-face` at all** and **no occurrence of
the substring `inter` in any case**. Neither edit is trusted; the assertion is.
Because the control *is* the subject document, everything else is identical by
construction, so a pixel difference is Inter and only Inter. Three no-browser
tests assert the control's property, so it is never part of a Chromium skip.

**The guard was demonstrated failing.** With `installFontRoute` temporarily
neutered — reproducing brief 66's original CORS defect — both pixel assertions
fail: *"the rendered slide is pixel-identical to a document that does not contain
Inter at all"* and *"the render browser fetched fonts over HTTP"*. Restored, 7
passed. `core/src/render/fonts.ts` ends **byte-identical to HEAD** despite being
used as the lever.

**The quoting experiment found a real defect in the agent's own first cut**,
which is the best argument for having run it. That cut used
`.replace(/'Inter',/g, '')`; under a quoted family it ate the *inline*
declaration too, leaving `font-family:sans-serif` rather than the renamed face.
**The pixel guard still passed — only the structural test caught it.** That is
the same failure mode one level up, and it is why the final construction renames
on a word boundary instead of deleting on quote characters.

For the record, the old mechanism measured under quoting: the control's text
asked for `'NoSuchFaceOnThisMachine'` and the control's own `@font-face` defined
that family **from the real `Inter-Regular.ttf`**. Same typeface, same pixels —
the control had become the subject, invisibly.

`withFallbackFamily`'s doc comment is rewritten: the no-quoting rule is now
recorded as history and a style choice, not a live constraint.

**Escaping:** `escapeStyle()` escapes `&` first (so it cannot re-escape its own
output), then `"`, `<`, `>`, applied to both key and value in `styleToString` —
the single funnel for all three `renderNode` sites. Single quotes are left alone
deliberately: the attribute is always double-quoted and `font-family:'Inter'`
must survive verbatim. Four tests; three fail without the fix. The themes on disk
are untouched, so this stays hardening rather than a live fix.

Chromium was available and every test genuinely executed.
