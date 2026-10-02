import type { FastifyInstance } from 'fastify';

import { createWardClient, type WardClient } from './ward.client.js';
import {
  NEWSPAPPER_APP_SLUG,
  WardAuthenticationError,
  WardUnavailableError,
  type WardCaller,
} from './ward.types.js';
import { wardConfig } from './config.js';

/**
 * The global session guard, now backed by Ward.
 *
 * ## The route convention survived; everything under it did not
 *
 * `GUARDED_PREFIXES`, `PUBLIC_PATHS` and `config: { public: true }` are kept
 * verbatim. That split was a good pattern — it says which surfaces are gated in
 * one readable place, and it opts a route out explicitly rather than by
 * omission. What is gone is what stood behind it: the stateless 30-day HMAC
 * cookie, `SESSION_SECRET`, the scrypt password check, the IP-keyed lockout and
 * the `users` table.
 *
 * ## `/uploads/*` is no longer public, and that is the point of this change
 *
 * The old `PUBLIC_PATHS` had to let `/uploads/:ref` through unauthenticated,
 * because the render browser fetches images mid-render carrying no cookie.
 * While newspapper was loopback-only that exposure was bounded by the ref's
 * entropy **and an unreachable port**; moving to the shared VPS left only the
 * entropy.
 *
 * It is now guarded like everything else, because the renderer stopped making
 * the request at all: `core/src/render/uploads-route.ts` intercepts
 * `/uploads/*` inside the browser context and fulfils it from disk, the same
 * mechanism `fonts.ts` already used. That was chosen over a render-scoped
 * token — the option the corpus expected — because it removes the request
 * rather than authorising it, so there is no new bearer credential with a
 * lifetime, a signing key and a leak path. See that file.
 *
 * ## The IP-keyed lockout is gone rather than retuned
 *
 * It was correct reasoning for a single-account app on localhost. It is now
 * moot rather than merely riskier: newspapper has no credential to brute-force.
 * Login is Ward's, and Ward has its own lockout with its own budget — which is
 * the right place for it, since a per-app counter would only have protected one
 * of six front doors to the same accounts.
 */

declare module 'fastify' {
  interface FastifyRequest {
    /** The Ward session, or null when the request is not authenticated. */
    ward: WardCaller | null;
  }
  interface FastifyContextConfig {
    public?: boolean;
  }
}

/** Prefixes the guard covers. Everything else (the UI, fonts) is public. */
export const GUARDED_PREFIXES = ['/api/', '/output/', '/uploads/'] as const;

/**
 * Paths reachable without a session.
 *
 * Only health remains. `/api/login` and `/api/logout` are gone — newspapper
 * cannot sign anybody in or out, because the session is the estate's and ending
 * it in one app while the others still honoured it would be a lie the cookie
 * contradicts immediately.
 */
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

export const UNAUTHENTICATED_BODY = { error: 'Authentication required' } as const;
export const FORBIDDEN_BODY = { error: 'This account has no access to newspapper' } as const;
export const UNAVAILABLE_BODY = { error: 'Sign-in is temporarily unavailable' } as const;

export interface WardGuardOptions {
  /** Injected by tests. Production builds one from the environment. */
  client?: WardClient;
}

export function registerAuthGuard(fastify: FastifyInstance, options: WardGuardOptions = {}): void {
  const ward = options.client ?? createWardClient(wardConfig());

  fastify.decorateRequest('ward', null);

  fastify.addHook('onRequest', async (req, reply) => {
    if (!requiresSession(req.url, req.routeOptions?.url)) return;
    if (req.routeOptions?.config?.public === true) return;

    let session: WardCaller;
    try {
      session = await ward.authenticate(req.headers.cookie);
    } catch (error) {
      /*
       * Ordered most specific first. `WardConfigurationError` extends
       * `WardUnavailableError`, so this branch catches both — which is the
       * point of that subclassing: newspapper needs no extra branch to fail
       * closed on its own misconfiguration.
       *
       * 503, never 401. Telling somebody they are signed out when the identity
       * service is down sends them to a login page that also cannot work.
       */
      if (error instanceof WardUnavailableError) {
        req.log.error({ err: error }, 'ward is not answering; failing closed');
        return reply.status(503).send(UNAVAILABLE_BODY);
      }
      if (error instanceof WardAuthenticationError) {
        // No cleared-cookie header any more: the cookie is Ward's, on Ward's
        // path, and an app clearing another app's credential is not its
        // business — it would sign the person out of the whole estate.
        return reply.status(401).send(UNAUTHENTICATED_BODY);
      }
      throw error;
    }

    /*
     * Any newspapper role opens the app. It is a single-editor tool and has no
     * roles of its own to distinguish, so inventing a hierarchy here would be a
     * second, unenforced definition of authority. What matters is that a Ward
     * account holding **no** newspapper grant is refused — that is the estate's
     * security boundary, and it is what lets prm keep public registration open
     * without those accounts reaching this app.
     */
    const roles = session.grants[NEWSPAPPER_APP_SLUG] ?? [];
    if (roles.length === 0) {
      req.log.warn({ subject: session.subject }, 'live ward session with no newspapper grant');
      return reply.status(403).send(FORBIDDEN_BODY);
    }

    req.ward = session;
  });
}
