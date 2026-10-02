/**
 * Brief 92. Two leaks on the shared, long-lived Chromium: concurrent launches
 * orphaning a browser, and a render whose setup failed leaving its context open.
 */
import { afterAll, describe, expect, it, vi } from 'vitest';
import { chromium, type Browser } from 'playwright';

import { closeBrowser, getBrowser } from './browser.js';
import { renderInBrowser } from './screenshot.js';
import { probeChromium } from './test-support/chromium.js';

const guard = await probeChromium('browser.test', 'that concurrent launches share one browser');
afterAll(() => guard.close());

describe('getBrowser', () => {
  it('concurrent callers share one launch, and close leaves nothing running', async (ctx) => {
    if (!guard.orSkip((note) => ctx.skip(note))) return;
    await closeBrowser();
    const launch = vi.spyOn(chromium, 'launch');
    try {
      const [a, b, c] = await Promise.all([getBrowser(), getBrowser(), getBrowser()]);
      expect(launch).toHaveBeenCalledTimes(1);
      expect(b).toBe(a);
      expect(c).toBe(a);
      await closeBrowser();
      expect(a.isConnected()).toBe(false);
    } finally {
      launch.mockRestore();
    }
  });

  it('close waits for a launch still in flight and closes it too', async (ctx) => {
    if (!guard.orSkip((note) => ctx.skip(note))) return;
    await closeBrowser();
    const pending = getBrowser();
    await closeBrowser();
    expect((await pending).isConnected()).toBe(false);
  });
});

describe('renderInBrowser cleanup', () => {
  function fakeBrowser(failAt: 'route' | 'newPage' | 'setContent') {
    const page = {
      setContent: vi.fn(async () => {
        if (failAt === 'setContent') throw new Error('setContent failed');
      }),
      evaluate: vi.fn(async () => true),
      close: vi.fn(async () => undefined),
    };
    const context = {
      route: vi.fn(async () => {
        if (failAt === 'route') throw new Error('route install failed');
      }),
      newPage: vi.fn(async () => {
        if (failAt === 'newPage') throw new Error('newPage failed');
        return page;
      }),
      close: vi.fn(async () => undefined),
    };
    const browser = { newContext: vi.fn(async () => context) } as unknown as Pick<
      Browser,
      'newContext'
    >;
    return { browser, context, page };
  }

  for (const failAt of ['route', 'newPage', 'setContent'] as const) {
    it(`closes the context when ${failAt} throws`, async () => {
      const { browser, context, page } = fakeBrowser(failAt);
      await expect(
        renderInBrowser(browser, '<p>x</p>', 100, 100, async () => 'never'),
      ).rejects.toThrow(/failed/);
      expect(context.close).toHaveBeenCalledTimes(1);
      if (failAt === 'setContent') expect(page.close).toHaveBeenCalledTimes(1);
    });
  }
});
