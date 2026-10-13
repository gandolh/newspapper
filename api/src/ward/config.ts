/**
 * Where the auth plugin is mounted and how the browser reaches it, read from
 * the environment. Pure, so the paths are testable without a server.
 *
 * ## Three paths that look alike and are not
 *
 * Newspapper is served under a base (`/newspapper/`) and Caddy's `handle_path`
 * strips it before Fastify sees a request; the dev server strips it the same
 * way. So for the same route there are two spellings:
 *
 * | | browser | Fastify |
 * |---|---|---|
 * | the plugin's callback | `/newspapper/api/auth/ward/callback` | `/api/auth/ward/callback` |
 *
 * `routePrefix` is the Fastify spelling, `/api/auth`. It is **not** the
 * library's default `/auth`, because only the base is stripped, not `/api`.
 *
 * `cookiePath` is the browser spelling, and it is the **base**, not
 * `<base>/api`. The browser must send the session to every URL the guard
 * covers, and `<img>` tags in the editor and the posts list load `/output/*` and
 * `/uploads/*`, which are beside `/api` and not under it. A cookie scoped to
 * `/newspapper/api` would never reach them, and every thumbnail would be a 401.
 * `fastify.inject` ignores cookie paths, so no test can catch that: it is a
 * rule here, and the boot check in the library keeps the callback under it.
 */

/** Unique in the estate: every app shares one origin. */
export const SESSION_COOKIE = 'newspapper_session';

/** Fastify-side mount of the plugin's routes: `/api` stays, only the base is stripped. */
export const AUTH_ROUTE_PREFIX = '/api/auth';

/** The callback's tail, as `routePrefix` spells it. */
const CALLBACK_TAIL = `${AUTH_ROUTE_PREFIX}/ward/callback`;

/** `/newspapper/` or `/newspapper` becomes `/newspapper`; the root becomes `''`. */
export function trimBase(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim().replace(/\/+$/, '');
  if (trimmed === '') return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export interface AuthPaths {
  /** Browser-side path of the app, `''` at the origin root. */
  base: string;
  /** The session cookie's `Path`: the base, or `/` at the root. */
  cookiePath: string;
  loginPath: string;
  settingsPath: string;
  afterSignInPath: string;
}

/**
 * The app's browser-side paths.
 *
 * The base is `NEWSPAPPER_BASE`, the same variable the UI bundle is built with,
 * so there is one answer to "where does this app live". If it is unset but the
 * Ward callback is configured, the base is read back out of the callback, which
 * the library already requires to end in `/api/auth/ward/callback`.
 */
export function authPaths(env: Record<string, string | undefined> = process.env): AuthPaths {
  let base = trimBase(env['NEWSPAPPER_BASE']);
  if (base === '' && env['NEWSPAPPER_BASE'] === undefined) {
    const callback = parseUrl(env['WARD_OIDC_REDIRECT_URI'])?.pathname;
    if (callback?.endsWith(CALLBACK_TAIL))
      base = trimBase(callback.slice(0, -CALLBACK_TAIL.length));
  }
  return {
    base,
    cookiePath: base === '' ? '/' : base,
    loginPath: `${base}/login`,
    settingsPath: `${base}/settings`,
    afterSignInPath: `${base}/`,
  };
}

/**
 * The app's own origin, which decides the cookie's `Secure` flag and what a
 * browser's `Origin` header must match on the plugin's `POST` routes.
 *
 * `PUBLIC_ORIGIN` wins. Without it the origin is the callback's, which is on
 * the app's own origin by construction, and without that, the dev server's.
 */
export function publicOrigin(env: Record<string, string | undefined> = process.env): string {
  const explicit = env['PUBLIC_ORIGIN']?.trim().replace(/\/+$/, '');
  if (explicit) return explicit;
  return parseUrl(env['WARD_OIDC_REDIRECT_URI'])?.origin ?? 'http://localhost:4321';
}

function parseUrl(value: string | undefined): URL | undefined {
  if (!value || !URL.canParse(value)) return undefined;
  return new URL(value);
}
