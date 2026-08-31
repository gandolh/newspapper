# Task 66 — The rendered slide is in the wrong typeface

## Context

Found by brief 59 while verifying the editor end to end. **Every rendered JPEG
comes out in a serif fallback instead of Inter**, while the browser preview of
the same document shows Inter correctly.

That makes this a shipping-quality defect, not a polish item: the whole product
is one square image, and it is currently being published in the wrong font.

## What is known

- The theme tokens are right — `fontFamily: "Inter"` is what the compiler emits.
- The font is being served — `/assets/fonts/Inter-Regular.ttf` returns 200 with
  the full ~407 kB.
- The preview is right, and it uses the same compiled tree.

So the compile, the tokens and the static serving are all fine. The failure is
in the render step: **headless Chromium is screenshotting before the
`@font-face` has resolved.** The template interpreter injects `@font-face` rules
into every rendered HTML string, and nothing waits for them.

Brief 59 could not fix it — `core/src/render/**` was outside its ownership.

## Files you OWN

- `core/src/render/**` — the screenshot path and the HTML it loads
- `core/src/templates/interpreter.ts` — only if the `@font-face` injection itself
  is the problem
- Tests for both

## Files you must NOT touch

`core/src/wizard/**` · `assets/design-systems/**` · `assets/fonts/**` (the files
are correct) · `api/**` · `ui/**`

## What to do

1. **Reproduce it first, and prove it.** Render a slide and assert the typeface
   in the output rather than eyeballing it — a test that fails today is the
   deliverable here, before any fix.
2. Make the screenshot wait for the fonts to be ready. `document.fonts.ready` is
   the obvious lever; whether that alone is sufficient with Playwright's
   navigation lifecycle is for you to determine, not assume.
3. Consider whether serving the font over HTTP is the right mechanism at all.
   Embedding the TTF as a `data:` URI in the injected `@font-face` removes the
   network round trip and the race with it. Weigh that against the HTML string
   growing by ~400 kB per font weight — the interpreter injects **all** weights
   today, and six weights inlined is a different proposition from one.
4. Whatever you choose, the guard must be **a test that fails if the fallback
   comes back**, not a comment saying it was fixed.

## Acceptance

- A test renders a slide and asserts the output is set in Inter — failing before the fix, passing after.
- The rendered JPEG and the browser preview agree on typeface for the same document.
- No increase in render time that a person would notice; state the before and after.
- `npm run build`, `npm test`, `npm run lint` pass.

## Note

The existing render tests skip cleanly with a warning when Chromium is
unavailable. Follow that pattern — a font assertion that silently skips in CI is
worse than none, so make the skip visible.
