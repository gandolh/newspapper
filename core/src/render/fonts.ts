/**
 * Fonts for the render browser.
 *
 * `renderTemplate` injects `@font-face` rules whose `src` points at the API
 * (`http://localhost:3001/assets/fonts/Inter-*.ttf`). That works in a normal
 * page and does *not* work in the renderer: `page.setContent` leaves the
 * document on an opaque origin, font fetches are always CORS-mode, and the API
 * only allows the UI origin — so Chromium fetched the TTF (200, all 407 kB),
 * failed the CORS check, and marked the face `error`. Every slide came out in
 * the fallback sans.
 *
 * The renderer runs on the same machine as those TTFs, so it does not need the
 * network at all: `installFontRoute` intercepts any `…/assets/fonts/<file>`
 * request the render page makes and fulfils it from `assets/fonts/` on disk.
 * That removes the CORS failure, the round trip, and the dependency on the API
 * being up. Anything not found on disk falls through to the network unchanged.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BrowserContext } from 'playwright';

/** `<repo>/assets/fonts` — four levels up from core/src/render/fonts.ts. */
export const FONT_DIR: string = resolve(
  fileURLToPath(import.meta.url),
  '..',
  '..',
  '..',
  '..',
  'assets',
  'fonts',
);

/** Requests routed to the local font directory. */
export const FONT_ROUTE_GLOB = '**/assets/fonts/*';

const SAFE_NAME = /^[A-Za-z0-9._-]+\.(?:ttf|otf|woff2?)$/;

const CONTENT_TYPES: Record<string, string> = {
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * Absolute path of the local font file a request URL refers to, or null when
 * the URL is not a plain filename inside the font directory or no such file
 * exists. Names are whitelisted, not sanitised: `../` never resolves.
 */
export function localFontPath(url: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }
  const name = decodeURIComponent(pathname.split('/').pop() ?? '');
  if (!SAFE_NAME.test(name)) return null;

  const file = resolve(FONT_DIR, name);
  if (!file.startsWith(FONT_DIR + sep)) return null;
  return existsSync(file) ? file : null;
}

/**
 * Font bytes live for the life of the process: a run renders every slide in its
 * own context, and re-reading ~400 kB per weight per slide is pure waste. The
 * set is bounded by the files in `assets/fonts/`.
 */
const fontBytes = new Map<string, Buffer>();

function readFont(file: string): Buffer {
  const cached = fontBytes.get(file);
  if (cached) return cached;
  const bytes = readFileSync(file);
  fontBytes.set(file, bytes);
  return bytes;
}

/**
 * Serve `…/assets/fonts/*` to this browser context from disk, with a permissive
 * CORS header so an opaque-origin document may actually use the face.
 */
export async function installFontRoute(ctx: BrowserContext): Promise<void> {
  await ctx.route(FONT_ROUTE_GLOB, async (route) => {
    const file = localFontPath(route.request().url());
    if (!file) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      headers: { 'access-control-allow-origin': '*' },
      body: readFont(file),
    });
  });
}
