/**
 * The test seam that replaces the old fake Ward.
 *
 * There are two things a test wants. **A signed-in request**: mint a real local
 * session on the app's own accounts and replay its cookie, so the real guard
 * decides, exactly as for a browser (`signInCookie`). **A Ward**: a real
 * `createWardClient` whose `fetch` is this file's fake, so the library's real
 * flow, 30-second check and fail-closed paths run against answers the test
 * chooses (`createFakeWard`). Nothing here stubs the guard, which is what makes
 * the guard's own tests worth having.
 *
 * Not imported by production code, and not part of any tsc build (tests are
 * excluded), but it lives beside the code it fakes so the two drift loudly.
 */
import { generateKeyPairSync } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

import { createWardClient, type WardClient } from '../../vendor/ward/ward-auth.js';
import { SESSION_COOKIE } from './config.js';

export const TEST_ISSUER = 'http://localhost:8792/ward-api/oidc';
export const TEST_REDIRECT = 'http://localhost:4321/newspapper/api/auth/ward/callback';

let counter = 0;

/**
 * A user and a live local session on `app`'s accounts. Returns the cookies to
 * pass to `app.inject`, plus the user.
 */
export async function signInCookie(
  app: FastifyInstance,
  options: { username?: string; role?: string; password?: string | null } = {},
) {
  counter += 1;
  const user = await app.accounts.createUser({
    username: options.username ?? `tester${counter}`,
    password: options.password === undefined ? 'a long enough password' : options.password,
    role: options.role ?? 'editor',
  });
  const { token } = await app.accounts.startSession(user.id);
  return { cookies: { [SESSION_COOKIE]: token }, token, user };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** What the fake Ward answers `POST /session-status` with. */
export type SessionStatusAnswer = 'active' | 'ended' | 'down' | 'refused';

export interface FakeWard {
  client: WardClient;
  /** Choose the next answers. Takes effect once the 30-second cache has expired. */
  setStatus(answer: SessionStatusAnswer): void;
  /** Move the client's clock, in milliseconds, so the 30-second cache can be crossed. */
  advance(ms: number): void;
  /** The URLs the client asked for, in order. */
  calls: string[];
}

/**
 * A Ward client with Ward's answers faked. Discovery returns a minimal
 * provider document and `/session-status` returns what `setStatus` says.
 */
export async function createFakeWard(): Promise<FakeWard> {
  const { privateKey } = generateKeyPairSync('ed25519');
  const jwk = privateKey.export({ format: 'jwk' }) as Record<string, string>;
  const clientKey = Buffer.from(
    JSON.stringify({ kty: 'OKP', crv: 'Ed25519', x: jwk['x'], d: jwk['d'], kid: 'k1', use: 'sig' }),
  ).toString('base64url');

  let status: SessionStatusAnswer = 'active';
  let clock = 1_000_000;
  const calls: string[] = [];

  const fake = async (input: string | URL | Request): Promise<Response> => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push(url);
    if (url.endsWith('/.well-known/openid-configuration')) {
      return json(200, {
        issuer: TEST_ISSUER,
        authorization_endpoint: `${TEST_ISSUER}/auth`,
        token_endpoint: `${TEST_ISSUER}/token`,
        jwks_uri: `${TEST_ISSUER}/jwks`,
        end_session_endpoint: `${TEST_ISSUER}/session/end`,
        id_token_signing_alg_values_supported: ['EdDSA'],
      });
    }
    if (url.endsWith('/session-status')) {
      if (status === 'down') throw new TypeError('fetch failed');
      if (status === 'refused') return json(401, { error: 'invalid_client' });
      return json(200, status === 'active' ? { active: true, role: 'editor' } : { active: false });
    }
    return json(404, { error: 'not_found' });
  };

  const client = await createWardClient({
    issuer: TEST_ISSUER,
    clientId: 'newspapper',
    clientKey,
    redirectUri: TEST_REDIRECT,
    fetch: fake as typeof fetch,
    now: () => clock,
  });

  return {
    client,
    calls,
    setStatus: (answer) => {
      status = answer;
    },
    advance: (ms) => {
      clock += ms;
    },
  };
}
