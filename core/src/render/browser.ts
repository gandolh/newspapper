/**
 * Lazy singleton Playwright browser.
 *
 * - Launches Chromium headless on first call to getBrowser().
 * - Transparently relaunches if the cached instance has disconnected.
 * - closeBrowser() tears down cleanly (call in process exit handlers).
 */

import { chromium, type Browser } from 'playwright';

let _browser: Browser | null = null;
/**
 * The launch in progress, shared by every caller that arrives while it runs.
 * Without it two renders started together (a double-clicked Render) each
 * launched a Chromium, the second overwrote `_browser`, and the first ran on
 * unreferenced until the container restarted: 100-300 MB gone per race.
 */
let _launching: Promise<Browser> | null = null;

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
  // A launch still in flight would otherwise land after this returns and leave
  // a browser running that nothing will ever close.
  if (_launching) await _launching.catch(() => undefined);
  if (_browser) {
    const b = _browser;
    _browser = null;
    await b.close();
  }
}
