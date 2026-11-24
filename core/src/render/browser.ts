/**
 * Lazy singleton Playwright browser.
 *
 * - Launches Chromium headless on first call to getBrowser().
 * - Transparently relaunches if the cached instance has disconnected.
 * - closeBrowser() tears down cleanly (the API calls it on shutdown).
 * - useBrowser() counts the renders holding the browser and closes it after
 *   IDLE_CLOSE_MS with none, so a resting container carries no Chromium.
 */

import { chromium, type Browser } from "playwright";

let _browser: Browser | null = null;
/**
 * The launch in progress, shared by every caller that arrives while it runs.
 * Without it two renders started together (a double-clicked Render) each
 * launched a Chromium, the second overwrote `_browser`, and the first ran on
 * unreferenced until the container restarted: 100-300 MB gone per race.
 */
let _launching: Promise<Browser> | null = null;

/**
 * How long the browser stays up with no render using it. Chromium is 100-300 MB
 * resident on a box with no spare memory, and renders come in bursts (a post is
 * written by hand, then rendered a few times), so it goes after two quiet
 * minutes. The next render pays a 1-2 s launch.
 */
export const IDLE_CLOSE_MS = 120_000;

let _users = 0;
let _idleTimer: ReturnType<typeof setTimeout> | null = null;

function cancelIdleTimer(): void {
  if (_idleTimer) clearTimeout(_idleTimer);
  _idleTimer = null;
}

/**
 * Run `fn` with the shared browser. While any `fn` runs the browser is in use
 * and is never closed; when the last one finishes the idle timer starts, and a
 * new call cancels it. `idleMs` is for tests.
 */
export async function useBrowser<T>(fn: (browser: Browser) => Promise<T>, idleMs = IDLE_CLOSE_MS): Promise<T> {
  cancelIdleTimer();
  _users++;
  try {
    return await fn(await getBrowser());
  } finally {
    _users--;
    if (_users === 0) {
      cancelIdleTimer();
      _idleTimer = setTimeout(() => {
        _idleTimer = null;
        // A render may have started since the timer was set; re-check.
        if (_users === 0) void closeBrowser().catch(() => undefined);
      }, idleMs);
      _idleTimer.unref();
    }
  }
}

export async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) {
    return _browser;
  }
  if (_launching) return _launching;
  // Previous instance either never existed or has disconnected — relaunch.
  _launching = chromium
    .launch({ headless: true })
    .then((browser) => {
      _browser = browser;
      return browser;
    })
    .finally(() => {
      _launching = null;
    });
  return _launching;
}

export async function closeBrowser(): Promise<void> {
  cancelIdleTimer();
  // A launch still in flight would otherwise land after this returns and leave
  // a browser running that nothing will ever close.
  if (_launching) await _launching.catch(() => undefined);
  if (_browser) {
    const b = _browser;
    _browser = null;
    await b.close();
  }
}
