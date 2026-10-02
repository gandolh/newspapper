# Task 93 — A wedged render hangs forever, holding the SSE and a Chromium context open

## Context

Found in the 2026-09 performance sweep and confirmed against Playwright's own
types. [core/src/render/screenshot.ts:81,86](../../../core/src/render/screenshot.ts):

```ts
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(WAIT_FOR_FONTS);   // document.fonts.ready
```

- `setContent` has no `timeout`, and no `setDefaultNavigationTimeout` /
  `setDefaultTimeout` is called anywhere in `core/src/render/` (grep: none).
  Playwright's `setContent` timeout **defaults to `0` = no timeout** (verified in
  `playwright-core` types). So a subresource that stalls — e.g. a font or image
  request that falls through the interceptors to the real network and never
  settles — makes `setContent` hang forever.
- `page.evaluate` takes no timeout at all, so a `document.fonts.ready` that never
  resolves hangs indefinitely too.

Because `renderSlides` awaits slides sequentially, one stuck slide hangs the whole
render: the SSE response never completes, the `finally { page.close();
ctx.close() }` never runs (control never returns from the `await`), and the
context leaks. The UI render button passes no `AbortController`, so a frustrated
user's retries stack more stuck contexts on the shared browser.

## What to do

1. Pass an explicit `timeout` to `setContent` (e.g. 15-20 s) — or set it via
   `ctx.setDefaultNavigationTimeout`/`setDefaultTimeout` on the context in
   `withRenderedPage`.
2. Bound the font wait: `Promise.race([page.evaluate(WAIT_FOR_FONTS), <reject
   after ~10 s>])` so a stuck `fonts.ready` fails the slide instead of hanging.
3. On timeout, throw so the existing `finally` closes the page/context and the SSE
   emits `error` (a slow render fails one request loudly rather than leaking
   silently). Keep the current success path unchanged.
4. Choose timeout values with a comment on the reasoning (a legitimate 20-slide
   render is ~11 s total today — per-slide budget must clear a real slide with
   margin; see brief 95 if concurrency changes the math).

## Acceptance

- A test: a page whose content never settles (e.g. an injected fake page/route
  that hangs, or a deliberately unreachable subresource with interceptors off)
  causes the render to **reject within the timeout**, and the context/page are
  closed afterward (assert `ctx.close`/`page.close` ran).
- A normal render still succeeds well within the budget (behind the brief-91
  Chromium guard).
- `npm test`, `npm run lint`, `npm run build`, `bash corpus/lint.sh` clean.

## Files you OWN

- `core/src/render/screenshot.ts` (+ its test)

## Files you must NOT touch

- `core/src/render/index.ts` public API
- `corpus/log.md`, `corpus/wiki/status.md`

## Related

Overlaps `screenshot.ts` with brief 92 — serialize if dispatched together.

## Outcome — 2026-10-03

`renderInBrowser` bounds both waits:
- `setContent` gets `timeout: settleMs` (Playwright's default is none) *and*
  our own `within()` race;
- `evaluate(fonts.ready)`, which takes no timeout, gets `within(fontsMs)`.

The budgets are `RENDER_TIMEOUTS = { settleMs: 20_000, fontsMs: 10_000 }`,
with the reasoning in a comment: a real slide settles in well under a second.
A stuck step throws `RenderTimeoutError` ("Rendering a slide timed out:
loading the slide did not finish within 20 s"). The brief-92 `finally` then
closes the page and context, and the route's existing catch turns it into an
SSE `error`. The losing promise's later rejection is swallowed. The timeouts
are an optional last argument, so tests run in milliseconds. The public render
API is unchanged.

Tests (`browser.test.ts`): a fake page whose `setContent`, or whose `evaluate`,
never settles rejects with `RenderTimeoutError` in under 1 s on a 50 ms budget,
and both the page and the context are closed. The real budget is passed to
Playwright's `setContent`. Real renders still pass well inside the budget.
`npm test`, lint and build are clean.
