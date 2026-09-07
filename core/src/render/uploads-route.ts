/**
 * Upload bytes for the render browser — served from disk, never over HTTP.
 *
 * ## The problem this closes
 *
 * A compiled slide carries `<Image>` refs as `url('/uploads/<ref>')`, and
 * `resolve-images.ts` rewrites them to absolute URLs so the render page can
 * fetch them. That fetch is made by a **headless Chromium with no cookie jar**,
 * which is why `GET /uploads/:ref` was marked `config: { public: true }` — the
 * renderer could not authenticate, so the route could not require it.
 *
 * That was defensible while newspapper was loopback-only: the exposure was
 * bounded by the ref's entropy **and by an unreachable port**. Moving to the
 * shared VPS removes the second half and leaves only the first, which is a
 * meaningfully weaker position than the one the decision was taken under.
 *
 * ## Why interception rather than a render-scoped token
 *
 * The obvious fix is to mint a short-lived token, hand it to the render browser
 * and require it on `/uploads/*`. It works, and it was the option the corpus
 * expected. This is better, and the codebase already proves the technique:
 * `fonts.ts` does exactly this for `@font-face` files, for a different reason
 * (CORS on an opaque origin) but with the same mechanism.
 *
 * Intercepting is strictly stronger than a token because it removes the request
 * rather than authorising it:
 *
 * - **No new credential exists.** A render token is a bearer credential with a
 *   lifetime, a signing key, a leak path through logs, and a revocation story.
 *   None of that has to be designed, and none of it can be got wrong.
 * - **`/uploads/*` stops being public at all** — the whole route moves behind
 *   the session guard, so the entropy of a ref stops being a security boundary
 *   and goes back to being an identifier.
 * - **Rendering stops depending on the API being reachable**, exactly as fonts
 *   already do. The renderer runs on the same machine as the bytes; it never
 *   needed the network.
 * - It is **faster**: no HTTP round trip per image per slide.
 *
 * The cost is that the renderer now needs the store root and the database,
 * which it already has — this module is in `core`, beside the store itself.
 *
 * ## Anything not resolvable falls through
 *
 * A URL that is not a valid upload ref, or names an upload that does not exist,
 * is passed to the network unchanged rather than failed. That keeps this a
 * pure optimisation of a path that already worked, and it means a bug here
 * degrades to the old behaviour instead of rendering blank images — with the
 * important difference that the old behaviour is now a **401**, which is
 * visible, rather than a silent success.
 */

import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import type { BrowserContext } from 'playwright';

import type { DB } from '../storage/db.js';
import { findUploadByRef, parseUploadRef, uploadFiles } from '../uploads/index.js';

/** Requests routed to the local upload store. Matches any origin. */
export const UPLOADS_ROUTE_GLOB = '**/uploads/*';

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/**
 * The on-disk file a render-page request URL refers to, or null.
 *
 * `parseUploadRef` is the same validator the API route uses, so a URL this
 * accepts is exactly a URL that route would have accepted — there is no second,
 * looser definition of "is this an upload" introduced here.
 */
export function localUploadFile(db: DB, url: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }

  // `/uploads/<ref>/original` is deliberately NOT served here. The renderer
  // only ever asks for the normalized bytes, and quietly widening the surface
  // to the untouched upload would be a second decision hiding inside a
  // performance change.
  const ref = parseUploadRef(pathname);
  if (!ref) return null;

  const upload = findUploadByRef(db, ref);
  if (!upload) return null;

  return uploadFiles(upload).served;
}

/**
 * Serve `…/uploads/<ref>` to this browser context from disk.
 *
 * The permissive CORS header matches `installFontRoute`'s and is needed for the
 * same reason: `page.setContent` puts the document on an opaque origin, so
 * every subresource fetch is CORS-mode.
 */
export async function installUploadsRoute(ctx: BrowserContext, db: DB): Promise<void> {
  await ctx.route(UPLOADS_ROUTE_GLOB, async (route) => {
    const file = localUploadFile(db, route.request().url());
    if (!file) {
      await route.fallback();
      return;
    }

    // Read per request rather than cached: unlike the four font files, an
    // upload store is unbounded, and holding every image a run touches in
    // memory for the life of the process is how a renderer starts failing on
    // large newspapers.
    await route.fulfill({
      status: 200,
      contentType: CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      headers: { 'access-control-allow-origin': '*' },
      body: readFileSync(file),
    });
  });
}
