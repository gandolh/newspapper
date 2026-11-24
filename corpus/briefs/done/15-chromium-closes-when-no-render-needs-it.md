# Brief 15: Chromium closes when no render needs it

**Depends on:** nothing.
**Builder:** Sonnet.
**Before you start:** run `brief-board guide` (the repo's `CLAUDE.md` says so).

Filed 2026-11-24 from the estate's infra review. The owner's answer that day: reduce what each app uses on the
box rather than cap its memory (the box has 3.7 GiB and no upgrade). `newspapper` was the largest app on the box
that day, at 141.7 MiB, with no render since its last start.

## Context

- `core/src/render/browser.ts` keeps one Chromium for the life of the process. `getBrowser()` (line 20) launches it
  on the first render and returns the same one after; `closeBrowser()` (line 38) exists, and its doc comment says
  to call it in the exit handlers, but only the test support calls it
  (`core/src/render/test-support/chromium.ts:73`).
- Each render opens and closes its own context and page (`renderInBrowser` in `core/src/render/screenshot.ts`,
  the `finally` at the end); the browser process stays.
- `api/src/server.ts:50` closes the app on SIGTERM through `closeWithGrace` and never closes the browser.
- So after the first Render the container carries Chromium until the next deploy: 100-300 MB by `browser.ts`'s own
  comment (line 16), on a box with about 2.2 GiB available on 2026-11-24. Renders are occasional: a post is
  written by hand and rendered a few times.

## Decisions

- **Close after 120 s with no render.** Count the renders using the browser: `withRenderedPage` (the only caller
  of `getBrowser()` outside tests) takes the browser, and gives it back in a `finally`. When the count drops to
  zero an idle timer starts (`unref`'d, so it never holds the process open); a new render cancels it. A browser in
  use is never closed. The next render after a close pays the launch, 1-2 s.
- **Close on shutdown.** The `closeWithGrace` handler calls `closeBrowser()` after `app.close()`.
- `getBrowser()` keeps its contract for the test support: it still returns a connected browser.
- The idle time is a constant in `browser.ts` with a comment giving the reason; tests may pass a shorter one.

## Files you OWN

- `core/src/render/browser.ts`, `core/src/render/screenshot.ts` (`withRenderedPage` only), and a test beside
  `browser.ts`
- `api/src/server.ts` (the shutdown handler)
- `corpus/wiki/architecture.md` or `modules.md`, wherever the render path's browser is described; the closeout:
  the outcome note, `corpus/log.md`, `corpus/wiki/status.md`

## Files you must NOT touch

- `renderInBrowser`'s context and page handling, the timeouts, the font and upload routes.
- `infrastructure/Dockerfile` (brief 16 owns it).

## What to do

1. **Confirm the callers.** `grep -rn "getBrowser\|closeBrowser" core/src api/src`: only `withRenderedPage` and
   the test support should use them. If anything else holds the browser across an `await` without going through
   `withRenderedPage`, stop and hand back.
2. The use count and idle timer in `browser.ts`, and `withRenderedPage` taking and giving back.
3. The shutdown call in `server.ts`.
4. Tests (Chromium tests go through the test-support guard, as the others do): after a render and the idle time,
   the browser is closed and a second render launches a new one; a render still running when the idle time would
   end keeps the browser; two renders started together share one launch, as today.
5. **Measure** in a container of today's image and of the new one (or on the laptop with `ps`): resident memory of
   the container after start, after one render, and 3 minutes after the render. Today's should stay up after the
   render; the new one should come back near its start level, with no Chromium process left (`docker top`).

If your session can't build Docker images, run step 5 against the API started locally (`ps` on the node process
and its Chromium children), and hand the container reading to the controller.

## Acceptance

- [ ] The tests in step 4 pass.
- [ ] Step 5's readings are in the outcome: start, after a render, 3 minutes later; before and after.
- [ ] `npm run check` exits 0 (it sets `CI=1`, so the Chromium tests run); `bash corpus/lint.sh` passes.
- [ ] End move `ready_for_deploy`.

## Owner steps

- `node cli.ts newspapper server` from vps-deploy. It can ship in the same deploy as brief 16.

## Outcome (2026-11-24)

- `core/src/render/browser.ts`: `useBrowser(fn, idleMs = IDLE_CLOSE_MS)` counts the renders holding the browser;
  at zero an unref'd timer starts (`IDLE_CLOSE_MS` = 120 s, the reason is in the comment) and re-checks the count
  when it fires; a new call cancels it; `closeBrowser()` also clears it. `getBrowser()` is unchanged and the
  `_launching` guard still holds. `withRenderedPage` goes through `useBrowser`. `api/src/server.ts` calls
  `closeBrowser()` after `app.close()` in the `closeWithGrace` handler.
- Callers confirmed: only `withRenderedPage` and the test support used the browser.
- Tests (`browser.test.ts`, 13 pass): idle close then relaunch, a render running when the time would end keeps
  the browser, a render joining one tick before the timer keeps it, two together share one launch (fake timers and
  a fake launch), and one real Chromium close and relaunch.
- Measured on the laptop with the node process tree (`ps`, includes the tsx wrapper's 3 children, about 190 MiB):
  start 212 MiB; after one render 549 MiB (8 processes); 3 minutes later 523 MiB before the change, 188 MiB with
  3 processes after it, no Chromium left. The container reading (`docker top`) is for the controller: no image
  built here.
- `npm run check` exit 0. Ships with `node cli.ts newspapper server`.
