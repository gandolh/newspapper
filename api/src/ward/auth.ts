import type { FastifyInstance } from 'fastify';

import {
  createAccounts,
  createSqliteStore,
  createWardClient,
  seedUsers,
  wardAuth,
  wardClientOptionsFromEnv,
  type Accounts,
  type WardClient,
} from '../../vendor/ward/ward-auth.js';
import type { DB } from '@newspapper/core';
import { AUTH_ROUTE_PREFIX, SESSION_COOKIE, authPaths, publicOrigin } from './config.js';
import { requiresSession } from './ward.guard.js';

/**
 * Newspapper's accounts: local users and sessions in the app's own SQLite
 * file, plus "Sign in with Ward" when the environment configures it.
 *
 * `createSqliteStore` migrates the library's `auth_*` tables on the handle it is
 * given, so this is also the step that creates them on a database that has
 * never held an account.
 */
export function createAppAccounts(db: DB): Accounts {
  return createAccounts({ store: createSqliteStore(db) });
}

/**
 * The Ward client the environment describes, or `undefined` when
 * `WARD_OIDC_ISSUER` is unset and the app runs with local accounts only. A set
 * issuer with another variable missing throws, naming it: that is a deploy
 * mistake and should stop the boot. Nothing here contacts Ward.
 */
export async function wardClientFromEnv(
  env: Record<string, string | undefined> = process.env,
): Promise<WardClient | undefined> {
  const options = wardClientOptionsFromEnv(env);
  return options === undefined ? undefined : createWardClient(options);
}

export interface RegisterAuthOptions {
  accounts: Accounts;
  /** Absent means no "Sign in with Ward" button: local accounts only. */
  wardClient?: WardClient;
  env?: Record<string, string | undefined>;
}

/**
 * Register the guard and the auth routes. **Call it before every route that is
 * not the plugin's own**: its guard is an `onRequest` hook, and Fastify copies
 * hooks into a child context when the child is created, so anything registered
 * earlier is unguarded.
 *
 * Who needs a session is `ward.guard.ts`'s answer, passed as `isPublic`. There is no
 * `registration` option: newspapper has no register page, so an account comes
 * from the seed script or from a Ward sign-in.
 */
export async function registerAuth(
  fastify: FastifyInstance,
  { accounts, wardClient, env = process.env }: RegisterAuthOptions,
): Promise<void> {
  const paths = authPaths(env);
  await fastify.register(wardAuth, {
    accounts,
    cookieName: SESSION_COOKIE,
    cookiePath: paths.cookiePath,
    publicOrigin: publicOrigin(env),
    routePrefix: AUTH_ROUTE_PREFIX,
    isPublic: (request) => !requiresSession(request.url, request.routeOptions?.url),
    ...(wardClient && {
      ward: {
        client: wardClient,
        loginPath: paths.loginPath,
        settingsPath: paths.settingsPath,
        afterSignInPath: paths.afterSignInPath,
      },
    }),
  });
}

export interface SeedEnv {
  SEED_USERNAME?: string;
  SEED_PASSWORD?: string;
  SEED_ROLE?: string;
}

/**
 * Create the one local account the environment names, if it does not exist.
 * Never resets a password or a role, so it is safe to run on every deploy.
 *
 * The password comes from the environment, never from a file in the repository.
 * Returns what `seedUsers` reports; throws when username or password is unset,
 * rather than creating nothing and exiting 0.
 */
export async function seedFromEnv(accounts: Accounts, env: SeedEnv = process.env) {
  const username = env.SEED_USERNAME?.trim();
  const password = env.SEED_PASSWORD;
  if (!username || !password) {
    throw new Error('SEED_USERNAME and SEED_PASSWORD must both be set in the environment.');
  }
  const role = env.SEED_ROLE?.trim() || 'editor';
  return seedUsers(accounts, [{ username, password, role }]);
}
