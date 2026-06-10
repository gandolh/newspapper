/**
 * htmlToPng — render a self-contained HTML string to a PNG Buffer.
 *
 * A new page is opened per call (pages are cheap; the browser singleton is
 * the expensive resource). networkidle wait ensures @font-face fonts finish
 * loading before the screenshot is taken.
 */

import { getBrowser } from './browser.js';

export interface HtmlToPngOptions {
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1080;

export async function htmlToPng(
  html: string,
  opts?: HtmlToPngOptions,
): Promise<Buffer> {
  const width = opts?.width ?? DEFAULT_WIDTH;
  const height = opts?.height ?? DEFAULT_HEIGHT;

  const browser = await getBrowser();

  // Use a BrowserContext so we can fix viewport and deviceScaleFactor.
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });

  const page = await ctx.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle' });
    const buffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width, height },
    });
    return Buffer.from(buffer);
  } finally {
    await page.close();
    await ctx.close();
  }
}
