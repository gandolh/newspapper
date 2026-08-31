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

---

## Outcome — 2026-08-31

Fixed and guarded. `core/src/render/fonts.ts` (new) intercepts
`**/assets/fonts/*` on the render context and fulfils it from local disk;
`screenshot.ts` installs it and also awaits `document.fonts.ready`.

**The brief's own hypothesis was wrong, and proving that was most of the work.**
This was not a timing race. `page.setContent` leaves the render document on an
**opaque origin**, so Chromium sends the `@font-face` fetch with `Origin: null`;
font fetches are always CORS-mode; the API's allowlist is the two UI origins; so
the response arrived complete — 200, all 407 kB — with no
`Access-Control-Allow-Origin`, and Chromium discarded it. `FontFace.status` was
`'error'`, and `document.fonts.status` was *already* `'loaded'` with `ready`
resolved, because a face that errors is a settled face. A `fonts.ready` wait
alone was measured to change nothing: byte-identical output. It was kept as
cheap insurance for decode, but it is not the fix. Full reasoning and the
rejected `data:` URI alternative are in
[decisions-engineering.md](../../wiki/decisions-engineering.md#the-renderer-serves-its-own-fonts-from-disk-not-over-http).

**Cost: +26 ms per slide**, median 583 → 609 ms over six timed renders. That is
Chromium rasterising Inter — work it previously skipped by failing the fetch.

**The guard handles the skip case properly**, which matters more here than
usual. `core/src/render/fonts.test.ts` renders a slide and compares it against
the same slide with Inter renamed out of existence, with a determinism
assertion first so the inequality is signal rather than noise. Without Chromium
the tests report **skipped** (never passed), write a banner to real stderr —
vitest's default reporter swallows `console.error` from module scope, hooks, and
passing or skipped tests — and **fail outright under `CI`**. Verified by the
controller in both modes with `PLAYWRIGHT_BROWSERS_PATH=/nonexistent`.

Chromium 148.0.7778.96 was available; the browser tests genuinely executed.

**One finding was promoted to a brief.** The typography tokens in
`assets/design-systems/*.json` carry a bare `"fontFamily": "Inter"` with no
fallback, emitted as an inline style that outranks the interpreter's body rule —
so a font failure lands on Chromium's default *serif*, not the intended sans.
That is why this defect presented as "a serif fallback" rather than as a missing
font. Latent now that fonts load from disk; filed as brief 67.

Also noted, not filed: `api/src/server.ts` still gives `/assets/fonts/` the
UI-only CORS allowlist. Harmless once the renderer stopped fetching over HTTP,
but the next non-UI consumer of that path hits the same wall.
