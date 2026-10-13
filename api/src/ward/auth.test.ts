import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

import { buildApp } from '../server.js';
import { db, resetDb } from '../lib/db.js';
import {
  createWardIdentities,
  hashSessionToken,
  LOCKOUT_MAX_FAILURES,
  type WardAuthStore,
} from '../../vendor/ward/ward-auth.js';
import { SESSION_COOKIE } from './config.js';
import { createAppAccounts, seedFromEnv } from './auth.js';
import { createFakeWard, signInCookie, TEST_ISSUER, type FakeWard } from './test-support.js';

/**
 * Accounts, the guard and the Ward routes, end to end through a real Fastify
 * app. Ward itself is a fake `fetch` under the library's real client.
 */

let tmpDir: string;
let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'newspapper-auth-'));
  process.env['NEWSPAPPER_DB_PATH'] = join(tmpDir, 'test.db');
  // The deploy's layout: the app lives under a base that the proxy strips.
  process.env['NEWSPAPPER_BASE'] = '/newspapper/';
});

afterAll(() => {
  resetDb();
  delete process.env['NEWSPAPPER_DB_PATH'];
  delete process.env['NEWSPAPPER_BASE'];
  rmSync(tmpDir, { recursive: true, force: true });
});

afterEach(async () => {
  await app.close();
});

const PASSWORD = 'correct horse battery';

async function boot(options: Parameters<typeof buildApp>[0] = { wardClient: null }) {
  app = await buildApp(options);
  await app.ready();
  return app;
}

describe('local sign-in', () => {
  beforeEach(async () => {
    await boot();
    // The database lives for the whole file, so the second test finds her already there.
    if (!(await app.accounts.findUserByUsername('ada'))) {
      await app.accounts.createUser({ username: 'ada', password: PASSWORD, role: 'editor' });
    }
  });

  it('signs a seeded user in, sets a session cookie scoped to the app base, and opens the API', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'ada', password: PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json()).toMatchObject({
      user: { username: 'ada', role: 'editor', hasPassword: true },
      session: { origin: 'local' },
      ward: { enabled: false, linked: false },
    });

    const cookie = login.cookies.find((c) => c.name === SESSION_COOKIE);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/newspapper' });

    const posts = await app.inject({
      method: 'GET',
      url: '/api/posts',
      cookies: { [SESSION_COOKIE]: cookie!.value },
    });
    expect(posts.statusCode).toBe(200);
  });

  it('refuses a wrong password and an unknown user with the same answer', async () => {
    for (const username of ['ada', 'nobody']) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username, password: 'wrong wrong wrong' },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ error: 'invalid_credentials' });
    }
  });

  it('locks an address out after repeated failures, and keys on the address, not the account', async () => {
    const attempt = (remoteAddress: string, username: string, password: string) =>
      app.inject({
        method: 'POST',
        url: '/api/auth/login',
        remoteAddress,
        payload: { username, password },
      });

    for (let i = 0; i < LOCKOUT_MAX_FAILURES; i += 1) {
      expect((await attempt('203.0.113.7', 'ada', 'wrong wrong wrong')).statusCode).toBe(401);
    }
    const locked = await attempt('203.0.113.7', 'ada', PASSWORD);
    expect(locked.statusCode).toBe(429);
    expect(locked.json()).toMatchObject({ error: 'too_many_attempts' });

    // The owner, from their own address, is not locked out by a stranger's guesses.
    expect((await attempt('203.0.113.99', 'ada', PASSWORD)).statusCode).toBe(200);
  });

  it('signs out: the cookie stops opening the API', async () => {
    const { cookies } = await signInCookie(app);
    const out = await app.inject({ method: 'POST', url: '/api/auth/logout', cookies });
    expect(out.statusCode).toBe(204);
    const after = await app.inject({ method: 'GET', url: '/api/posts', cookies });
    expect(after.statusCode).toBe(401);
  });

  it('refuses a cross-site login post', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { origin: 'https://example.org' },
      payload: { username: 'ada', password: PASSWORD },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'cross_site' });
  });
});

describe('the guard', () => {
  beforeEach(async () => {
    await boot();
  });

  it('401s the API, rendered output and uploads with no session', async () => {
    for (const url of [
      '/api/posts',
      '/api/settings',
      '/api/nothing-here',
      '/output/1999-01-01-1/slide-01.jpg',
      '/uploads/some-ref',
      '/uploads/some-ref/original',
      '/%61pi/posts',
      '/%75ploads/some-ref',
    ]) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode, url).toBe(401);
    }
  });

  it('leaves health, the session probe and the UI public', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(200);
    const session = await app.inject({ method: 'GET', url: '/api/auth/session' });
    expect(session.statusCode).toBe(200);
    expect(session.json()).toMatchObject({ user: null, ward: { enabled: false } });
    // The login page is a client route: whatever answers `/login` is not a 401.
    expect((await app.inject({ method: 'GET', url: '/login' })).statusCode).not.toBe(401);
  });

  it('opens uploads to a signed-in session', async () => {
    const { cookies } = await signInCookie(app);
    // Past the guard, the handler finds no such upload.
    expect(
      (await app.inject({ method: 'GET', url: '/uploads/some-ref', cookies })).statusCode,
    ).toBe(404);
  });

  it('serves the session probe to a signed-in user with their role', async () => {
    const { cookies } = await signInCookie(app, { role: 'admin' });
    const res = await app.inject({ method: 'GET', url: '/api/auth/session', cookies });
    expect(res.json()).toMatchObject({ user: { role: 'admin' }, session: { origin: 'local' } });
  });
});

describe('the database', () => {
  it('migrates the auth tables beside the app, and a second boot changes nothing', async () => {
    await boot();
    const before = db().prepare('SELECT COUNT(*) AS n FROM auth_migrations').get() as { n: number };
    expect(before.n).toBeGreaterThan(0);
    await app.close();

    await boot();
    const after = db().prepare('SELECT COUNT(*) AS n FROM auth_migrations').get() as { n: number };
    expect(after.n).toBe(before.n);
    // The app's own tables were never part of the library's migrations.
    const tables = (
      db().prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{
        name: string;
      }>
    ).map((t) => t.name);
    expect(tables).toEqual(expect.arrayContaining(['auth_users', 'auth_sessions', 'posts']));
  });
});

describe('Ward routes', () => {
  it('are absent, and the button off, when Ward is not configured', async () => {
    await boot({ wardClient: null });
    const { cookies } = await signInCookie(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/ward/start',
      payload: {},
      cookies,
    });
    expect(res.statusCode).toBe(404);
    const session = await app.inject({ method: 'GET', url: '/api/auth/session' });
    expect(session.json()).toMatchObject({ ward: { enabled: false } });
  });

  describe('with Ward configured', () => {
    let ward: FakeWard;

    beforeEach(async () => {
      ward = await createFakeWard();
      await boot({ wardClient: ward.client });
    });

    it('reports the button as enabled to a signed-out browser', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/auth/session' });
      expect(res.json()).toMatchObject({ user: null, ward: { enabled: true } });
    });

    it('starts a sign-in at Ward, with the flow cookie on the callback path', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/auth/ward/start', payload: {} });
      expect(res.statusCode).toBe(200);
      const { url } = res.json() as { url: string };
      expect(url.startsWith(`${TEST_ISSUER}/auth?`)).toBe(true);
      expect(new URL(url).searchParams.get('client_id')).toBe('newspapper');
      const flow = res.cookies.find((c) => c.name === `${SESSION_COOKIE}_ward`);
      expect(flow?.path).toBe('/newspapper/api/auth/ward/callback');
    });

    it('sends a failed round trip back to the app login page, not to a JSON error', async () => {
      // No flow cookie: the round trip never started in this browser.
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/ward/callback?error=access_denied',
      });
      expect(res.statusCode).toBe(303);
      const location = new URL(String(res.headers['location']));
      expect(location.pathname).toBe('/newspapper/login');
      expect(location.searchParams.get('ward_error')).toBe('invalid_callback');
    });

    /** A Ward-originated session for a user linked to subject `sub-1`. */
    async function wardSession(username: string) {
      const accounts = app.accounts;
      const identities = createWardIdentities({ accounts });
      const user = await identities.createLinkedUser({
        subject: `sub-${username}`,
        username,
        role: 'editor',
      });
      const { token } = await accounts.startSession(user.id, { origin: 'ward', wardSid: 'fam-1' });
      return { [SESSION_COOKIE]: token };
    }

    it('lets Settings link Ward: a signed-in local user gets Ward’s URL back', async () => {
      const { cookies } = await signInCookie(app);
      const res = await app.inject({ method: 'POST', url: '/api/auth/ward/link', cookies });
      expect(res.statusCode).toBe(200);
      expect((res.json() as { url: string }).url.startsWith(`${TEST_ISSUER}/auth?`)).toBe(true);

      // Linking is for a signed-in user: with no session it is a 401, not a Ward redirect.
      const anon = await app.inject({ method: 'POST', url: '/api/auth/ward/link' });
      expect(anon.statusCode).toBe(401);
    });

    it('lets Settings set a local password for a Ward-only user, then unlink Ward', async () => {
      const cookies = await wardSession('hedy');

      // Refused while there is no local password.
      const early = await app.inject({ method: 'POST', url: '/api/auth/ward/unlink', cookies });
      expect(early.statusCode).toBeGreaterThanOrEqual(400);
      expect(early.json()).toEqual({ error: 'no_local_password' });

      // A Ward session alone is not enough for a first password: it could be a
      // silent sign-in on a shared machine. Settings must reauthenticate first.
      const unstamped = await app.inject({
        method: 'POST',
        url: '/api/auth/ward/set-password',
        cookies,
        payload: { newPassword: 'a brand new password' },
      });
      expect(unstamped.statusCode).toBe(403);
      expect(unstamped.json()).toMatchObject({ error: 'reauthentication_required' });

      // What a successful reauthentication with Ward leaves on the session.
      const store = app.accounts.store as WardAuthStore;
      await store.setSessionReauthenticatedAt(
        hashSessionToken(cookies[SESSION_COOKIE]),
        Date.now(),
      );
      const set = await app.inject({
        method: 'POST',
        url: '/api/auth/ward/set-password',
        cookies,
        payload: { newPassword: 'a brand new password' },
      });
      expect(set.statusCode).toBe(204);
      expect(await app.accounts.verifyCredentials('hedy', 'a brand new password')).toBeDefined();

      // Now Ward can be unlinked; the session that began with Ward ends with it.
      const unlink = await app.inject({ method: 'POST', url: '/api/auth/ward/unlink', cookies });
      expect(unlink.statusCode).toBe(200);
      expect(unlink.json()).toEqual({ signedOut: true });
      const after = await app.inject({ method: 'GET', url: '/api/posts', cookies });
      expect(after.statusCode).toBe(401);
      // …and the password still signs her in locally, with Ward gone from the picture.
      const login = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'hedy', password: 'a brand new password' },
      });
      expect(login.statusCode).toBe(200);
      expect(login.json()).toMatchObject({ ward: { enabled: true, linked: false } });
    });

    it('ends a Ward session once Ward revokes it, and a local session never asks Ward', async () => {
      const cookies = await wardSession('grace');
      expect((await app.inject({ method: 'GET', url: '/api/posts', cookies })).statusCode).toBe(
        200,
      );

      ward.setStatus('ended');
      ward.advance(31_000);
      const ended = await app.inject({ method: 'GET', url: '/api/posts', cookies });
      expect(ended.statusCode).toBe(401);
      expect(ended.json()).toEqual({ error: 'unauthorized', reason: 'ward_session_ended' });
    });

    it('refuses Ward sessions with ward_unavailable while Ward is down, and keeps local ones working', async () => {
      const wardCookies = await wardSession('linus');
      const local = (await signInCookie(app)).cookies;
      expect(
        (await app.inject({ method: 'GET', url: '/api/posts', cookies: wardCookies })).statusCode,
      ).toBe(200);

      ward.setStatus('down');
      ward.advance(31_000);
      const refused = await app.inject({ method: 'GET', url: '/api/posts', cookies: wardCookies });
      expect(refused.statusCode).toBe(401);
      expect(refused.json()).toEqual({ error: 'unauthorized', reason: 'ward_unavailable' });
      expect(
        (await app.inject({ method: 'GET', url: '/api/posts', cookies: local })).statusCode,
      ).toBe(200);

      // Not a sign-out: the session row is kept and works again when Ward answers.
      ward.setStatus('active');
      ward.advance(31_000);
      expect(
        (await app.inject({ method: 'GET', url: '/api/posts', cookies: wardCookies })).statusCode,
      ).toBe(200);
    });
  });

  it('refuses Ward-originated sessions when the app has no Ward configured', async () => {
    await boot({ wardClient: null });
    const identities = createWardIdentities({ accounts: app.accounts });
    const user = await identities.createLinkedUser({
      subject: 'sub-orphan',
      username: 'orphan',
      role: 'editor',
    });
    const { token } = await app.accounts.startSession(user.id, { origin: 'ward', wardSid: 'f' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/posts',
      cookies: { [SESSION_COOKIE]: token },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ reason: 'ward_unavailable' });
  });
});

describe('seedFromEnv', () => {
  it('creates the named user, never resets an existing one, and demands the environment', async () => {
    await boot();
    const accounts = createAppAccounts(db());
    const env = { SEED_USERNAME: 'seeded', SEED_PASSWORD: PASSWORD, SEED_ROLE: 'admin' };

    expect((await seedFromEnv(accounts, env)).created).toEqual(['seeded']);
    // Run again with a different password: the account is left as it was.
    const again = await seedFromEnv(accounts, { ...env, SEED_PASSWORD: 'another long password' });
    expect(again).toEqual({ created: [], existing: ['seeded'] });
    expect(await accounts.verifyCredentials('seeded', PASSWORD)).toMatchObject({ role: 'admin' });
    expect(await accounts.verifyCredentials('seeded', 'another long password')).toBeUndefined();

    await expect(seedFromEnv(accounts, { SEED_USERNAME: 'x' })).rejects.toThrow(/SEED_PASSWORD/);
  });
});
