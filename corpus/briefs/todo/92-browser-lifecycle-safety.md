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
