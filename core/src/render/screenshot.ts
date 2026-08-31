/**
 * htmlToPng / htmlToJpeg — render a self-contained HTML string to an image Buffer.
 *
 * A new page is opened per call (pages are cheap; the browser singleton is
 * the expensive resource).
 *
 * Fonts: the HTML `renderTemplate` produces carries `@font-face` rules pointing
 * at the API's `/assets/fonts/`. Those are served from disk instead (see
 * `fonts.ts`) — an HTTP fetch would be blocked by CORS, because `setContent`
 * puts the document on an opaque origin. The screenshot then waits for
 * `document.fonts.ready`, so a face that is still decoding cannot be caught
 * mid-flight; `networkidle` alone never guaranteed that.
 */

import type { Page } from 'playwright';
import { getBrowser } from './browser.js';
import { installFontRoute } from './fonts.js';

export interface HtmlToPngOptions {
  width?: number;
  height?: number;
}

export interface HtmlToJpegOptions {
  width?: number;
  height?: number;
  /** JPEG quality, 0–100. Defaults to DEFAULT_JPEG_QUALITY. */
  quality?: number;
}

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1080;

/** Draft-quality JPEG — file size only matters once a post is published. */
export const DEFAULT_JPEG_QUALITY = 92;

/** Evaluated in the page: settles when every used @font-face has resolved. */
const WAIT_FOR_FONTS = 'document.fonts.ready.then(() => true)';

async function withRenderedPage<T>(
  html: string,
  width: number,
  height: number,
  fn: (page: Page) => Promise<T>,
): Promise<T> {
  const browser = await getBrowser();

  // Use a BrowserContext so we can fix viewport and deviceScaleFactor.
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });

  await installFontRoute(ctx);

  const page = await ctx.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle' });
    // @font-face loading is lazy and not part of any navigation lifecycle:
    // fonts.ready settles once every face the document actually used has
    // finished (or failed). Written as a source string because `core` compiles
    // without the DOM lib — `document` is not a name this workspace has.
    await page.evaluate(WAIT_FOR_FONTS);
    return await fn(page);
  } finally {
    await page.close();
    await ctx.close();
  }
}

export async function htmlToPng(
  html: string,
  opts?: HtmlToPngOptions,
): Promise<Buffer> {
  const width = opts?.width ?? DEFAULT_WIDTH;
  const height = opts?.height ?? DEFAULT_HEIGHT;

  const buffer = await withRenderedPage(html, width, height, (page) =>
    page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height } }),
  );
  return Buffer.from(buffer);
}

/**
 * Render straight to JPEG via Playwright's own encoder — no PNG intermediate.
 */
export async function htmlToJpeg(
  html: string,
  opts?: HtmlToJpegOptions,
): Promise<Buffer> {
  const width = opts?.width ?? DEFAULT_WIDTH;
  const height = opts?.height ?? DEFAULT_HEIGHT;
  const quality = opts?.quality ?? DEFAULT_JPEG_QUALITY;

  const buffer = await withRenderedPage(html, width, height, (page) =>
    page.screenshot({ type: 'jpeg', quality, clip: { x: 0, y: 0, width, height } }),
  );
  return Buffer.from(buffer);
}
