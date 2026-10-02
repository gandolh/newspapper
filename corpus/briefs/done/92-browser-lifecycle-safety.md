# Task 92 — Concurrent renders orphan a Chromium, and a context leaks on setup failure

## Context

Found in the 2026-09 performance sweep; both reproduced/verified. Two
browser-lifecycle bugs on the shared, long-lived singleton:

1. **Launch race → orphaned browser.**
   [core/src/render/browser.ts:13-20](../../../core/src/render/browser.ts):
   ```ts
   if (_browser && _browser.isConnected()) return _browser;
   _browser = await chromium.launch({ headless: true });
   return _browser;
   ```
   No in-flight lock. Two renders started while `_browser` is null/disconnected
   (double-clicked "Render", or two posts near-simultaneously) both call
   `chromium.launch()`; the second to resolve overwrites `_browser`, so
   `closeBrowser()` and every later `getBrowser()` only ever see one instance.
   The other is a live ~100-300 MB Chromium with no reference — it runs until the
   container restarts. Reproduced: two concurrent `getBrowser()` returned two
   distinct connected `Browser` objects; after `closeBrowser()` one stayed
   `isConnected()`.

2. **Context leak on setup failure.**
   [core/src/render/screenshot.ts:59-92](../../../core/src/render/screenshot.ts):
   `newContext` → `installFontRoute` → `installUploadsRoute` → `newPage()` all run
   **before** the `try { … } finally { page.close(); ctx.close(); }`. If
   `ctx.newPage()` (or a route install) throws — a real Playwright failure mode —
   the just-created `BrowserContext` is never closed. Each transient failure leaks
   one context on the singleton until the process restarts.

On a modest shared VPS these are memory/handle leaks that degrade every other app
on the box.

## What to do

1. `getBrowser`: cache the in-flight launch promise (same pattern
   `ward.client.ts` uses for introspection):
   ```ts
   let _launching: Promise<Browser> | null = null;
   // if connected → return; else if _launching → return it;
   // else _launching = chromium.launch(...).then(b => { _browser = b; _launching = null; return b; })
   //                     .catch(e => { _launching = null; throw e; });
   ```
   so concurrent callers share one launch and none is orphaned. Ensure
   `closeBrowser()` interacts correctly with an in-flight launch.
2. `withRenderedPage`: create the context inside a `try`, and close it (and the
   page if it exists) in a `finally` that covers `newContext`-through-`newPage` —
   guard `page?.close()` since `page` may not exist yet.

## Acceptance

- A test: two concurrent `getBrowser()` calls return the **same** `Browser`
  instance and exactly one `chromium.launch` occurred (spy/count), and after
  `closeBrowser()` nothing stays connected.
- A test: if `newContext`/`newPage` is made to throw (inject a fake browser whose
  `newPage` rejects), no context is left open (assert `ctx.close` was called).
- Existing render tests still pass with real Chromium (behind brief-91 guard).
- `npm test`, `npm run lint`, `npm run build`, `bash corpus/lint.sh` clean.

## Files you OWN

- `core/src/render/browser.ts` (+ a test)
- `core/src/render/screenshot.ts` (+ its test)

## Files you must NOT touch

- `core/src/render/index.ts`'s public API shape (other briefs depend on it)
- `corpus/log.md`, `corpus/wiki/status.md`

## Related

Brief 93 (render timeouts) and 94 (output-dir collision) touch the same render
path — they are independent fixes; if dispatched together, expect file-ownership
overlap on `screenshot.ts` between 92 and 93 and serialize them.

## Outcome — 2026-10-03

**Launch race.** `getBrowser` keeps the in-flight launch promise
(`_launching`), so every caller that arrives while it runs shares it, and it is
cleared in `finally`. `closeBrowser` first awaits an in-flight launch (ignoring
its failure), then closes, so a launch can't land after a close and run
unreferenced.

**Context leak.** `withRenderedPage` now delegates to an exported
`renderInBrowser(browser, …)`, and everything from `newContext` through `fn`
sits inside one `try`. The `finally` closes `page?` and `ctx?`, each guarded
and with errors swallowed, so a failing route install, `newPage` or
`setContent` still closes the context. The public API of
`core/src/render/index.ts` is unchanged.

Tests (`browser.test.ts`):
- three concurrent `getBrowser()` calls give **one** `chromium.launch` (a
  passthrough spy on real Chromium) and the same instance, and after
  `closeBrowser()` it is disconnected;
- `closeBrowser()` during an in-flight launch leaves that browser
  disconnected;
- with a fake browser failing at route install, `newPage` or `setContent`,
  the context is closed exactly once (and the page too, when it existed).

The race tests fail on the old code. The existing render tests pass on real
Chromium. `npm test` 712/712, lint, `tsc` and build are clean, and no orphaned
headless Chromium was left after the runs.
