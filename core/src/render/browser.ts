/**
 * Lazy singleton Playwright browser.
 *
 * - Launches Chromium headless on first call to getBrowser().
 * - Transparently relaunches if the cached instance has disconnected.
 * - closeBrowser() tears down cleanly (call in process exit handlers).
 */

import { chromium, type Browser } from 'playwright';

let _browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) {
    return _browser;
  }
  // Previous instance either never existed or has disconnected — relaunch.
  _browser = await chromium.launch({ headless: true });
  return _browser;
}

export async function closeBrowser(): Promise<void> {
  if (_browser) {
    const b = _browser;
    _browser = null;
    await b.close();
  }
}
