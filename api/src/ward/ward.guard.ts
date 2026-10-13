/**
 * Which requests need a session.
 *
 * The library guards **every** route unless it is allowlisted. Newspapper's
 * allowlist is the inverse of what the old guard had, and is kept in that shape
 * on purpose: the UI bundle, the fonts and the SPA's not-found fallback are
 * public (the login page has to load before anyone is signed in), and the
 * guarded surface is the short list below. The plugin adds its own routes
 * (`/api/auth/login`, `/session`, the Ward start and callback) itself.
 *
 * ## `/uploads/*` is guarded, and stays so
 *
 * Brief 23's text says it "stays public for headless rendering". It does not
 * need to be: `core/src/render/uploads-route.ts` serves the render browser's
 * `/uploads/*` from disk, so nothing anonymous fetches it, and the 2026-09-06
 * revision in `decisions-security.md` closed it for that reason. That decision
 * stands here. The consequence is on the cookie, not the guard: see
 * `config.ts` on why the session cookie's path is the app base.
 */

/** Prefixes the guard covers. Everything else (the UI, fonts) is public. */
export const GUARDED_PREFIXES = ['/api/', '/output/', '/uploads/'] as const;

/** Paths reachable without a session, besides the plugin's own routes. */
export const PUBLIC_PATHS: ReadonlySet<string> = new Set(['/api/health']);

export function pathOf(url: string): string {
  return url.split('?')[0] ?? '';
}

export function isGuardedPath(url: string): boolean {
  const path = pathOf(url);
  if (PUBLIC_PATHS.has(path)) return false;
  return GUARDED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Whether a request must carry a session, from **what Fastify matched** as well
 * as the raw URL.
 *
 * Deciding from the raw URL alone was the bug (brief 77): find-my-way
 * percent-decodes the path before matching, so `/%61pi/posts` never started
 * with `/api/` here yet routed to the real `/api/posts` handler, and the whole
 * API was readable and writable without a session. `routeOptions.url` is the
 * matched route *pattern* (`/api/posts`, `/api/posts/:id`, and `/output/*` for
 * the static plugins), already decoded by the router, so it is the authoritative
 * input. Nothing here decodes a path by hand.
 *
 * The raw check stays as a second reason to guard, never a reason to skip: a
 * request is public only if neither spelling is guarded. `/api/health` stays
 * public because its matched pattern is exactly `/api/health`.
 */
export function requiresSession(rawUrl: string, matchedRoute: string | undefined): boolean {
  if (matchedRoute !== undefined && isGuardedPath(matchedRoute)) return true;
  if (matchedRoute !== undefined && PUBLIC_PATHS.has(matchedRoute)) return false;
  return isGuardedPath(rawUrl);
}
