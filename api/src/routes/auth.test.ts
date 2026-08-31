import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { buildApp } from '../server.js';
import { resetDb } from '../lib/db.js';
import { resetLoginAttempts, MAX_FAILED_ATTEMPTS } from '../auth/rateLimit.js';
import { resetSessionSecret } from '../auth/secret.js';
import { SESSION_COOKIE, signSession } from '../auth/session.js';

const SECRET = 'integration-test-session-secret';
const USERNAME = 'tester';
const PASSWORD = 'correct-horse-9';

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'newspapper-auth-'));
  process.env['NEWSPAPPER_DB_PATH'] = join(tmpDir, 'auth.db');
  process.env['SESSION_SECRET'] = SECRET;
  process.env['ADMIN_USERNAME'] = USERNAME;
  process.env['ADMIN_PASSWORD'] = PASSWORD;
});

afterAll(() => {
  resetDb();
  resetSessionSecret();
  delete process.env['NEWSPAPPER_DB_PATH'];
  delete process.env['SESSION_SECRET'];
  delete process.env['ADMIN_USERNAME'];
  delete process.env['ADMIN_PASSWORD'];
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('authentication', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    resetLoginAttempts();
    app = await buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  async function login(username = USERNAME, password = PASSWORD) {
    return app.inject({ method: 'POST', url: '/api/login', payload: { username, password } });
  }

  async function sessionCookieValue(): Promise<string> {
    const res = await login();
    const cookie = res.cookies.find((c) => c.name === SESSION_COOKIE);
    return cookie?.value ?? '';
  }

  // =========================================================================
  // Seeding
  // =========================================================================
  describe('seeding', () => {
    it('creates the account from ADMIN_USERNAME / ADMIN_PASSWORD on first boot', async () => {
      const res = await login();
      expect(res.statusCode).toBe(200);
      expect(res.json().user.username).toBe(USERNAME);
    });

    it('never returns the password hash', async () => {
      const res = await login();
      expect(JSON.stringify(res.json())).not.toContain('scrypt');
      expect(res.json().user).not.toHaveProperty('passwordHash');
    });
  });

  // =========================================================================
  // POST /api/login
  // =========================================================================
  describe('POST /api/login', () => {
    it('sets an httpOnly, lax, path-scoped cookie on success', async () => {
      const res = await login();
      expect(res.statusCode).toBe(200);
      const raw = res.headers['set-cookie'];
      const header = Array.isArray(raw) ? raw.join(';') : String(raw);
      expect(header).toContain('HttpOnly');
      expect(header).toContain('SameSite=Lax');
      expect(header).toContain('Path=/');
      expect(header).not.toContain('Secure');
    });

    it('401s on a wrong password', async () => {
      const res = await login(USERNAME, 'wrong-password');
      expect(res.statusCode).toBe(401);
      expect(res.cookies.find((c) => c.name === SESSION_COOKIE)?.value).toBeFalsy();
    });

    it('gives an identical response for an unknown username and a wrong password', async () => {
      const unknown = await login('nobody-here', PASSWORD);
      resetLoginAttempts();
      const wrong = await login(USERNAME, 'wrong-password');
      expect(unknown.statusCode).toBe(401);
      expect(wrong.statusCode).toBe(401);
      expect(unknown.json()).toEqual(wrong.json());
      expect(unknown.json().error).toBe('Invalid username or password');
      expect(unknown.json().error).not.toMatch(
        /no such|not found|unknown user|incorrect password/i,
      );
    });

    it('401s on a missing or malformed body', async () => {
      for (const payload of [
        {},
        { username: USERNAME },
        { password: PASSWORD },
        { username: 1, password: 2 },
      ]) {
        resetLoginAttempts();
        const res = await app.inject({ method: 'POST', url: '/api/login', payload });
        expect(res.statusCode).toBe(401);
      }
    });

    it('429s after repeated failures from one address', async () => {
      for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i += 1) {
        expect((await login(USERNAME, 'nope')).statusCode).toBe(401);
      }
      const locked = await login(USERNAME, 'nope');
      expect(locked.statusCode).toBe(429);
      expect(locked.headers['retry-after']).toBeDefined();

      const stillLocked = await login();
      expect(stillLocked.statusCode).toBe(429);
    });

    it('clears the failure counter after a success', async () => {
      for (let i = 0; i < MAX_FAILED_ATTEMPTS - 2; i += 1) await login(USERNAME, 'nope');
      expect((await login()).statusCode).toBe(200);
      for (let i = 0; i < MAX_FAILED_ATTEMPTS - 2; i += 1) {
        expect((await login(USERNAME, 'nope')).statusCode).toBe(401);
      }
    });
  });

  // =========================================================================
  // Guard
  // =========================================================================
  describe('the session guard', () => {
    it('lets an unauthenticated request reach /api/health', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });
    });

    it('401s an unauthenticated request to a guarded route without leaking data', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/articles' });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ error: 'Authentication required' });
    });

    it('401s guarded writes too', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/settings',
        payload: { defaultTheme: 'warm-industrial-1' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('401s unauthenticated access to rendered output', async () => {
      const res = await app.inject({ method: 'GET', url: '/output/anything/1.png' });
      expect(res.statusCode).toBe(401);
    });

    it('lets an authenticated request through', async () => {
      const value = await sessionCookieValue();
      const res = await app.inject({
        method: 'GET',
        url: '/api/articles',
        cookies: { [SESSION_COOKIE]: value },
      });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.json())).toBe(true);
    });

    it('401s a tampered cookie', async () => {
      const value = await sessionCookieValue();
      const parts = value.split('.');
      parts[1] = '999';
      const res = await app.inject({
        method: 'GET',
        url: '/api/articles',
        cookies: { [SESSION_COOKIE]: parts.join('.') },
      });
      expect(res.statusCode).toBe(401);
    });

    it('401s a cookie signed with the wrong secret', async () => {
      const forged = signSession(
        { userId: 1, expiresAt: Date.now() + 60_000 },
        'not-the-real-secret',
      );
      const res = await app.inject({
        method: 'GET',
        url: '/api/articles',
        cookies: { [SESSION_COOKIE]: forged },
      });
      expect(res.statusCode).toBe(401);
    });

    it('401s an expired cookie', async () => {
      const expired = signSession({ userId: 1, expiresAt: Date.now() - 1 }, SECRET);
      const res = await app.inject({
        method: 'GET',
        url: '/api/articles',
        cookies: { [SESSION_COOKIE]: expired },
      });
      expect(res.statusCode).toBe(401);
    });

    it('401s a validly signed cookie for a user that no longer exists', async () => {
      const ghost = signSession({ userId: 4242, expiresAt: Date.now() + 60_000 }, SECRET);
      const res = await app.inject({
        method: 'GET',
        url: '/api/articles',
        cookies: { [SESSION_COOKIE]: ghost },
      });
      expect(res.statusCode).toBe(401);
    });

    it('401s an unknown /api path rather than 404ing it', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/does-not-exist' });
      expect(res.statusCode).toBe(401);
    });
  });

  // =========================================================================
  // GET /api/me · POST /api/logout
  // =========================================================================
  describe('GET /api/me', () => {
    it('401s without a session', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/me' });
      expect(res.statusCode).toBe(401);
    });

    it('returns the account with a session', async () => {
      const value = await sessionCookieValue();
      const res = await app.inject({
        method: 'GET',
        url: '/api/me',
        cookies: { [SESSION_COOKIE]: value },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().user.username).toBe(USERNAME);
      expect(res.json().user).not.toHaveProperty('passwordHash');
    });
  });

  describe('POST /api/logout', () => {
    it('expires the cookie and works without a session', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/logout' });
      expect(res.statusCode).toBe(200);
      const raw = res.headers['set-cookie'];
      const header = Array.isArray(raw) ? raw.join(';') : String(raw);
      expect(header).toContain('Max-Age=0');
    });
  });

  // =========================================================================
  // POST /api/password
  // =========================================================================
  describe('POST /api/password', () => {
    it('401s without a session', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/password',
        payload: { currentPassword: PASSWORD, newPassword: 'another-good-one' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('401s when the current password is wrong', async () => {
      const value = await sessionCookieValue();
      const res = await app.inject({
        method: 'POST',
        url: '/api/password',
        cookies: { [SESSION_COOKIE]: value },
        payload: { currentPassword: 'not-it', newPassword: 'another-good-one' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('400s when the new password is too short', async () => {
      const value = await sessionCookieValue();
      const res = await app.inject({
        method: 'POST',
        url: '/api/password',
        cookies: { [SESSION_COOKIE]: value },
        payload: { currentPassword: PASSWORD, newPassword: 'short' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('changes the password and invalidates the old one', async () => {
      const next = 'a-brand-new-passphrase';
      const value = await sessionCookieValue();
      const res = await app.inject({
        method: 'POST',
        url: '/api/password',
        cookies: { [SESSION_COOKIE]: value },
        payload: { currentPassword: PASSWORD, newPassword: next },
      });
      expect(res.statusCode).toBe(200);

      resetLoginAttempts();
      expect((await login(USERNAME, PASSWORD)).statusCode).toBe(401);
      resetLoginAttempts();
      expect((await login(USERNAME, next)).statusCode).toBe(200);

      const back = await app.inject({
        method: 'POST',
        url: '/api/password',
        cookies: { [SESSION_COOKIE]: await sessionCookieValue2(app, USERNAME, next) },
        payload: { currentPassword: next, newPassword: PASSWORD },
      });
      expect(back.statusCode).toBe(200);
    });
  });
});

async function sessionCookieValue2(
  app: Awaited<ReturnType<typeof buildApp>>,
  username: string,
  password: string,
): Promise<string> {
  resetLoginAttempts();
  const res = await app.inject({
    method: 'POST',
    url: '/api/login',
    payload: { username, password },
  });
  return res.cookies.find((c) => c.name === SESSION_COOKIE)?.value ?? '';
}

// ===========================================================================
// Strict-mode startup
// ===========================================================================
describe('startup outside development', () => {
  let dir: string;
  let previousNodeEnv: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'newspapper-strict-'));
    resetDb();
    resetSessionSecret();
    previousNodeEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    process.env['NEWSPAPPER_DB_PATH'] = join(dir, 'strict.db');
  });

  afterEach(() => {
    resetDb();
    resetSessionSecret();
    if (previousNodeEnv === undefined) delete process.env['NODE_ENV'];
    else process.env['NODE_ENV'] = previousNodeEnv;
    process.env['SESSION_SECRET'] = SECRET;
    process.env['ADMIN_USERNAME'] = USERNAME;
    process.env['ADMIN_PASSWORD'] = PASSWORD;
    process.env['NEWSPAPPER_DB_PATH'] = join(tmpDir, 'auth.db');
    rmSync(dir, { recursive: true, force: true });
  });

  it('refuses to boot without SESSION_SECRET', async () => {
    delete process.env['SESSION_SECRET'];
    await expect(buildApp()).rejects.toThrow(/SESSION_SECRET/);
  });

  it('refuses to boot without ADMIN_USERNAME / ADMIN_PASSWORD', async () => {
    delete process.env['ADMIN_USERNAME'];
    delete process.env['ADMIN_PASSWORD'];
    await expect(buildApp()).rejects.toThrow(/ADMIN_USERNAME/);
  });

  it('rejects a too-short SESSION_SECRET', async () => {
    process.env['SESSION_SECRET'] = 'short';
    await expect(buildApp()).rejects.toThrow(/at least/);
  });
});
