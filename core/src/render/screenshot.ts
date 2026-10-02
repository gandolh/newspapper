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

import type { Browser, BrowserContext, Page } from 'playwright';
import { getBrowser } from './browser.js';
import { installFontRoute } from './fonts.js';
import { installUploadsRoute } from './uploads-route.js';
import type { DB } from '../storage/db.js';

export interface HtmlToPngOptions {
  width?: number;
  height?: number;
  /** See {@link HtmlToJpegOptions.db}. */
  db?: DB;
}

export interface HtmlToJpegOptions {
  width?: number;
  height?: number;
  /** JPEG quality, 0–100. Defaults to DEFAULT_JPEG_QUALITY. */
  quality?: number;
  /**
   * The uploads database, so `<Image>` bytes are served to the render page from
   * disk instead of fetched over HTTP.
   *
   * **Optional, and omitting it is a real choice rather than a default.**
   * Without it the page falls back to fetching `/uploads/<ref>` from the API —
   * which now requires a session the render browser does not have, so images
   * come out blank. That is the intended failure: `/uploads/*` stopped being a
   * public route when newspapper left loopback, and a silent fallback to an
   * unauthenticated fetch is exactly what must not happen. Callers that render
   * slides with images pass it; `render.test.ts`'s text-only fixtures do not.
   *
   * See `uploads-route.ts` for why interception beat a render-scoped token.
   */
  db?: DB;
}

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1080;

/** Draft-quality JPEG — file size only matters once a post is published. */
export const DEFAULT_JPEG_QUALITY = 92;

/** Evaluated in the page: settles when every used @font-face has resolved. */
const WAIT_FOR_FONTS = 'document.fonts.ready.then(() => true)';

/**
 * How long one slide may take to settle, and to finish loading its fonts.
 *
 * Playwright's `setContent` defaults to **no** timeout and `evaluate` takes none,
 * so one subresource that never settled used to hang the slide, then the
 * sequential render, then the SSE response, forever, with its context leaked.
 * A real slide settles in well under a second (a 20-slide render is ~11 s in
 * total), so 20 s and 10 s fail only a slide that is genuinely stuck, and fail
 * it loudly.
 */
export const RENDER_TIMEOUTS = { settleMs: 20_000, fontsMs: 10_000 } as const;

export class RenderTimeoutError extends Error {
  constructor(step: string, ms: number) {
    super(`Rendering a slide timed out: ${step} did not finish within ${ms / 1000} s`);
    this.name = 'RenderTimeoutError';
  }
}

/** Reject after `ms`. The losing promise's own later rejection is swallowed,
 * since closing the page in `finally` makes it reject. */
function within<T>(promise: Promise<T>, ms: number, step: string): Promise<T> {
  promise.catch(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RenderTimeoutError(step, ms)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function withRenderedPage<T>(
  html: string,
  width: number,
  height: number,
  fn: (page: Page) => Promise<T>,
  db?: DB,
): Promise<T> {
  return renderInBrowser(await getBrowser(), html, width, height, fn, db);
}

/**
 * One render in its own context on `browser`. Exported for tests, which hand it
 * a fake browser to prove the cleanup.
 *
 * Everything from `newContext` on sits inside the `try`: a route install or
 * `newPage` that throws used to leave its context open on the long-lived
 * browser, one leaked context per transient failure until the process
 * restarted.
 */
export async function renderInBrowser<T>(
  browser: Pick<Browser, 'newContext'>,
  html: string,
  width: number,
  height: number,
  fn: (page: Page) => Promise<T>,
  db?: DB,
  timeouts: { settleMs: number; fontsMs: number } = RENDER_TIMEOUTS,
): Promise<T> {
  let ctx: BrowserContext | undefined;
  let page: Page | undefined;
  try {
    // Use a BrowserContext so we can fix viewport and deviceScaleFactor.
    ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });

    await installFontRoute(ctx);
    // Same mechanism as the fonts above, for a security reason rather than a
    // CORS one: it is what lets `/uploads/*` be a guarded route.
    if (db) await installUploadsRoute(ctx, db);

    page = await ctx.newPage();
    await within(
      page.setContent(html, { waitUntil: 'networkidle', timeout: timeouts.settleMs }),
      timeouts.settleMs,
      'loading the slide',
    );
    // @font-face loading is lazy and not part of any navigation lifecycle:
    // fonts.ready settles once every face the document actually used has
    // finished (or failed). Written as a source string because `core` compiles
    // without the DOM lib — `document` is not a name this workspace has.
    await within(page.evaluate(WAIT_FOR_FONTS), timeouts.fontsMs, 'loading its fonts');
    return await fn(page);
  } finally {
    await page?.close().catch(() => undefined);
    await ctx?.close().catch(() => undefined);
  }
}

export async function htmlToPng(html: string, opts?: HtmlToPngOptions): Promise<Buffer> {
  const width = opts?.width ?? DEFAULT_WIDTH;
  const height = opts?.height ?? DEFAULT_HEIGHT;

  const buffer = await withRenderedPage(
    html,
    width,
    height,
    (page) => page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height } }),
    opts?.db,
  );
  return Buffer.from(buffer);
}

/**
 * Render straight to JPEG via Playwright's own encoder — no PNG intermediate.
 */
export async function htmlToJpeg(html: string, opts?: HtmlToJpegOptions): Promise<Buffer> {
  const width = opts?.width ?? DEFAULT_WIDTH;
  const height = opts?.height ?? DEFAULT_HEIGHT;
  const quality = opts?.quality ?? DEFAULT_JPEG_QUALITY;

  const buffer = await withRenderedPage(
    html,
    width,
    height,
    (page) => page.screenshot({ type: 'jpeg', quality, clip: { x: 0, y: 0, width, height } }),
    opts?.db,
  );
  return Buffer.from(buffer);
}
