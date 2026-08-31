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
