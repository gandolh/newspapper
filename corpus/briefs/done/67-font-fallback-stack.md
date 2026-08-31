# Task 67 — Give the slide's typography a real fallback stack

## Context

Found by brief 66 while fixing the render typeface, and deliberately left
alone there: it was not the root cause, and it changes the browser preview as
well as the render, which was outside that brief's ownership.

Every typography token in `assets/design-systems/warm-industrial-{1,2,3}.json`
declares `"fontFamily": "Inter"` — a bare family name with nothing after it.
The interpreter turns each token into an **inline style** on the text node.
`core/src/templates/interpreter.ts:242` does set a sensible body rule
(`font-family:'Inter',sans-serif`), but an inline style outranks it, so the
body stack never applies to any text that is actually drawn.

The consequence: when Inter fails to load for any reason, the slide does not
fall back to the intended sans — it falls back to Chromium's default **serif**.
That is precisely why brief 66's defect presented as "a serif fallback", and
why it read as a rendering bug rather than a loading one.

This is latent right now. Brief 66 made the render fulfil font requests from
local disk, so Inter loads. The bug is that the *failure mode* is wrong, and
the next thing that disturbs font loading will land in Times again.

## Files you OWN

- `assets/design-systems/warm-industrial-1.json`, `-2.json`, `-3.json`
- `core/src/templates/interpreter.ts` — if the fallback is better appended at
  emit time than stored in the token, decide which and say why
- Tests for either

## Files you must NOT touch

- `core/src/render/**` — brief 66's fix lives there and is settled
- `core/src/wizard/**` · `api/**` · `ui/**`

## What to do

1. Decide **where the fallback belongs**: in the token (three JSON files, and
   every future theme must remember) or appended by the interpreter when it
   emits `font-family` (one place, but the token stops being the literal CSS
   value). Argue it, pick one, record the reasoning in the outcome note.
2. Whichever you pick, the emitted stack must end in a **sans** fallback. The
   product is a square image of text; a silent switch to serif changes what
   ships.
3. Guard it with a test that fails if a bare, unstacked family can reach the
   rendered HTML — for any theme, including one added later. A test that only
   checks today's three themes will not catch the fourth.

## A caution

The 1080² output must be **byte-identical** while Inter loads correctly. This
brief changes only what happens when it does not. Prove that with a render
comparison, not by reasoning about it.

## Acceptance

- No emitted `font-family` is a bare family name, for any theme on disk.
- A failing-then-passing test proves the fallback is present and is sans.
- A re-render of an existing post is byte-identical to before this brief.
- `npm run build`, `npm test`, `npm run lint` pass; `npx tsc -p ui --noEmit`
  stays at 0.

---

## Outcome — 2026-08-31

Landed. Gate verified by the controller: build ✓, **650 tests / 46 files** ✓,
lint ✓, `tsc -p ui` at 0 ✓, corpus lint ✓.

**The fallback lives in the interpreter, not the token. The three theme JSONs
are untouched** — verified, `git status` is empty for `assets/`.
`withFallbackFamily()` normalizes `font-family` at the single point where
`resolveStyle` produces it, and the document body rule interpolates the same
`FALLBACK_FAMILY` constant so the inline styles and the body rule cannot drift.
Emitted stack: `Inter,sans-serif`.

The argument for the emitter over the token is the one that decided it: the
brief's own criterion — correct "for any theme on disk, including one added
later" — is a property of the *emitter*, not of the files. In the token it would
depend on every future theme author remembering, and the guard could then only
report the omission after the fact instead of preventing it. The "a token should
be the literal CSS value" objection does not survive contact with the code:
`resolveStyle` already kebab-cases keys, dereferences `$color.primary`, and
appends `px` to bare numbers. A theme that wants a different generic opts out by
authoring its own — a stack already ending in a CSS generic is returned verbatim.

**The 1080² output is unchanged, proved rather than argued.** Every theme from
`listThemes()` × every document in `WZD_SAMPLES`, rendered through the real path
at 1080×1080, SHA-256 per slide, before and after: **48 slides compared, 0
differing — and 48 of 48 HTML documents differing.** The second number is what
makes the first trustworthy: it shows the harness was sensitive to the edit, so
the zero is a result and not a harness that rendered nothing.

**A finding that matters more than the fix: brief 66's guard rests on a quoting
convention, and quoting it breaks it silently.** `core/src/render/fonts.test.ts`
builds its no-Inter control with `html.replace(/'Inter'/g, …)`. That works *only*
because the inline style says `font-family:Inter` unquoted, so the rename hits
the `@font-face` rule alone and the text is left asking for a family nothing
defines. This brief's first cut emitted `'Inter',sans-serif` — quoted, matching
the body rule — and the guard failed, because control and subject became the
same document. Had it been written to fail open rather than closed, it would
have gone green-but-blind instead. `withFallbackFamily` therefore passes every
authored family through **verbatim** and appends only the tail, and the reason is
in the function's doc comment where the next person to reach for quoting will
find it before the test does. Filed as brief 71.

**The guard:** `core/src/templates/font-fallback.test.ts`, 13 tests. Before the
fix, 7 failed. The interesting failure is pixel evidence rather than inference —
with a bare family and the face missing, the render was byte-identical to an
explicitly `serif` slide, which is exactly the claim this brief was filed on.
The structural half enumerates `listThemes()` from disk (and asserts the list is
non-empty, so an empty directory cannot produce a vacuous green) and scans the
rendered HTML as well as `resolveStyle`, so a path that bypassed normalization
would still be caught. The pixel half follows `fonts.test.ts`: skipped rather
than passed without Chromium, banner to real stderr, and a throw under `CI`. It
also asserts this machine draws `serif` and `sans-serif` differently before
comparing against them, so the discriminating assertion cannot pass for the
wrong reason.

Chromium was available and the tests genuinely executed.

Also reported, not fixed: `styleToString` interpolates style values into
`style="…"` without escaping (`interpreter.ts:176-181`), so a theme token
containing a `"` would break out of the attribute. Not reachable from the
current themes. Filed as brief 71 alongside the guard fragility.
