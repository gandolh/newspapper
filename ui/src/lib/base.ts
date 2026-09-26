/**
 * Where this app lives on the origin, and the two functions that respect it.
 *
 * Newspapper is served at `/` in dev and at `/newspapper/` behind Caddy, whose
 * `handle_path` STRIPS the prefix before the request reaches Fastify. So the
 * server never sees the prefix and needs no notion of it — but the BROWSER
 * does, because every URL the client builds is resolved against the origin, not
 * against the app. An origin-absolute `/api/health` written in a component is a
 * request to `https://gandolh.ro/api/health`, which is a different app.
 *
 * That is the whole bug this module exists to prevent, and it is a bad one to
 * find at runtime: the document loads (Caddy routes `/newspapper/` fine), and
 * then every asset and every API call under it misses. Nothing fails loudly;
 * the page just renders empty.
 *
 * ── One source of truth ─────────────────────────────────────────────────────
 *
 * `import.meta.env.BASE_URL` is Vite's own echo of the `base` it built with —
 * see `NEWSPAPPER_BASE` in `ui/vite.config.ts`. Reading it here rather than
 * threading a second environment variable through the client is deliberate: the
 * bundle's asset URLs and the app's own URLs then cannot disagree, because they
 * are the same value. prm and imbatranim-os each carry the base twice (a Vite
 * `base` plus a router basename) and have to keep the two in step by hand.
 *
 * ── What is NOT base-relative ───────────────────────────────────────────────
 *
 * Ward's paths. `/ward/login` and `/ward/account` are a DIFFERENT app on the
 * same origin, so prefixing them would send a person signing in to
 * `/newspapper/ward/login`, which is nothing. See `lib/api.ts`.
 */

/**
 * Normalize a raw base to the form the rest of this module assumes: a leading
 * and a trailing slash, so `''`, `/newspapper` and `/newspapper/` all mean the
 * same place. Exported for the tests — application code wants `BASE`.
 */
export function normalizeBase(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (trimmed === '' || trimmed === '/') return '/';
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

/**
 * Prefix an app-owned path with `base`. Pure, two-argument form — `withBase` is
 * this bound to the base the bundle was built with.
 *
 * `base.slice(0, -1)` drops the trailing slash so the path's own leading slash
 * is the only join, which is what makes `joinBase('/newspapper/', '/')` come out
 * as `/newspapper/` rather than `/newspapper//`.
 */
export function joinBase(base: string, path: string): string {
  const prefix = normalizeBase(base).slice(0, -1);
  const absolute = path.startsWith('/') ? path : `/${path}`;
  return `${prefix}${absolute}`;
}

/**
 * The inverse: an origin pathname to the path this app routes on.
 *
 * `/newspapper` with no trailing slash maps to `/` as well. Caddy's
 * `redirectBare` normally adds the slash before the browser gets here, but the
 * router should not be the thing that depends on that.
 *
 * A pathname outside the base is returned untouched. That cannot happen behind
 * Caddy, and inventing a different answer for it would only hide a routing
 * mistake somewhere else.
 */
export function stripPrefix(base: string, pathname: string): string {
  const normalized = normalizeBase(base);
  const prefix = normalized.slice(0, -1);
  if (prefix === '') return pathname === '' ? '/' : pathname;
  if (pathname === prefix) return '/';
  if (pathname.startsWith(normalized)) return pathname.slice(prefix.length) || '/';
  return pathname;
}

/** The base this bundle was built with — `/` in dev, `/newspapper/` on the VPS. */
export const BASE = normalizeBase(import.meta.env.BASE_URL);

/** Prefix an app-owned absolute path (`/posts`, `/api/health`) with the base. */
export function withBase(path: string): string {
  return joinBase(BASE, path);
}

/** Turn `window.location.pathname` into the path the router matches on. */
export function stripBase(pathname: string): string {
  return stripPrefix(BASE, pathname);
}
