import type { FastifyInstance } from 'fastify';
import { findUser } from '@newspapper/core';
import type { User } from '@newspapper/core';
import { db } from '../lib/db.js';
import { getSessionSecret } from './secret.js';
import {
  SESSION_COOKIE,
  clearedSessionCookie,
  parseCookies,
  shouldUseSecureCookie,
  verifySession,
} from './session.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: User | null;
  }
  interface FastifyContextConfig {
    public?: boolean;
  }
}

/** Prefixes the guard covers. Everything else (the UI, fonts) is public. */
export const GUARDED_PREFIXES = ['/api/', '/output/'] as const;

/** Paths reachable without a session — everything needed to obtain one. */
export const PUBLIC_PATHS: ReadonlySet<string> = new Set([
  '/api/health',
  '/api/login',
  '/api/logout',
]);

export function pathOf(url: string): string {
  return url.split('?')[0] ?? '';
}

export function isGuardedPath(url: string): boolean {
  const path = pathOf(url);
  if (PUBLIC_PATHS.has(path)) return false;
  return GUARDED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export const UNAUTHENTICATED_BODY = { error: 'Authentication required' } as const;

/**
 * Global session guard. Attached to the root instance (not registered as a
 * plugin) so the hook is not encapsulated. A route opts out with
 * `config: { public: true }`, or by being listed in PUBLIC_PATHS.
 */
export function registerAuthGuard(fastify: FastifyInstance): void {
  fastify.decorateRequest('user', null);

  fastify.addHook('onRequest', async (req, reply) => {
    if (!isGuardedPath(req.url)) return;
    if (req.routeOptions?.config?.public === true) return;

    const secure = shouldUseSecureCookie(req.protocol, req.headers.host);
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    const session = verifySession(token, getSessionSecret());

    if (!session) {
      return reply
        .header('Set-Cookie', clearedSessionCookie(secure))
        .status(401)
        .send(UNAUTHENTICATED_BODY);
    }

    const user = findUser(db(), session.userId);
    if (!user) {
      return reply
        .header('Set-Cookie', clearedSessionCookie(secure))
        .status(401)
        .send(UNAUTHENTICATED_BODY);
    }

    req.user = user;
  });
}
