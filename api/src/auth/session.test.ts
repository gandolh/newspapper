import { describe, it, expect } from 'vitest';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  clearedSessionCookie,
  createSessionToken,
  parseCookies,
  sessionCookie,
  shouldUseSecureCookie,
  signSession,
  verifySession,
} from './session.js';

const SECRET = 'test-secret-of-sufficient-length';
const OTHER = 'a-completely-different-secret-key';

describe('signSession / verifySession', () => {
  it('round-trips a payload', () => {
    const expiresAt = Date.now() + 1000;
    const token = signSession({ userId: 7, expiresAt }, SECRET);
    expect(verifySession(token, SECRET)).toEqual({ userId: 7, expiresAt });
  });

  it('rejects a token signed with a different secret', () => {
    const token = signSession({ userId: 1, expiresAt: Date.now() + 1000 }, OTHER);
    expect(verifySession(token, SECRET)).toBeNull();
  });

  it('rejects a tampered user id', () => {
    const token = signSession({ userId: 1, expiresAt: Date.now() + 1000 }, SECRET);
    const parts = token.split('.');
    parts[1] = '2';
    expect(verifySession(parts.join('.'), SECRET)).toBeNull();
  });

  it('rejects a tampered expiry', () => {
    const token = signSession({ userId: 1, expiresAt: Date.now() + 1000 }, SECRET);
    const parts = token.split('.');
    parts[2] = String(Date.now() + 10_000_000);
    expect(verifySession(parts.join('.'), SECRET)).toBeNull();
  });

  it('rejects a truncated or absent signature', () => {
    const token = signSession({ userId: 1, expiresAt: Date.now() + 1000 }, SECRET);
    const parts = token.split('.');
    expect(verifySession(`${parts[0]}.${parts[1]}.${parts[2]}.`, SECRET)).toBeNull();
    expect(verifySession(`${parts[0]}.${parts[1]}.${parts[2]}`, SECRET)).toBeNull();
    expect(verifySession((parts[3] as string).slice(0, -1), SECRET)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = signSession({ userId: 1, expiresAt: Date.now() - 1 }, SECRET);
    expect(verifySession(token, SECRET)).toBeNull();
  });

  it('rejects an unknown version prefix', () => {
    const token = signSession({ userId: 1, expiresAt: Date.now() + 1000 }, SECRET);
    expect(verifySession(token.replace(/^v1\./, 'v2.'), SECRET)).toBeNull();
  });

  it('rejects undefined and garbage', () => {
    expect(verifySession(undefined, SECRET)).toBeNull();
    expect(verifySession('', SECRET)).toBeNull();
    expect(verifySession('garbage', SECRET)).toBeNull();
  });

  it('rejects a non-positive user id', () => {
    const token = signSession({ userId: 0, expiresAt: Date.now() + 1000 }, SECRET);
    expect(verifySession(token, SECRET)).toBeNull();
  });
});

describe('createSessionToken', () => {
  it('expires 30 days out', () => {
    const now = 1_700_000_000_000;
    const { token, expiresAt } = createSessionToken(3, SECRET, now);
    expect(expiresAt).toBe(now + SESSION_MAX_AGE_SECONDS * 1000);
    expect(verifySession(token, SECRET, now)).toEqual({ userId: 3, expiresAt });
  });
});

describe('sessionCookie', () => {
  it('is httpOnly, lax and path-scoped with a 30-day max age', () => {
    const cookie = sessionCookie('abc', false);
    expect(cookie).toContain(`${SESSION_COOKIE}=abc`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain(`Max-Age=${SESSION_MAX_AGE_SECONDS}`);
    expect(cookie).not.toContain('Secure');
  });

  it('adds Secure when asked', () => {
    expect(sessionCookie('abc', true)).toContain('Secure');
  });

  it('clears with Max-Age=0', () => {
    expect(clearedSessionCookie(false)).toContain('Max-Age=0');
  });
});

describe('shouldUseSecureCookie', () => {
  it('is off for plain http on loopback', () => {
    expect(shouldUseSecureCookie('http', 'localhost:3001')).toBe(false);
    expect(shouldUseSecureCookie('http', '127.0.0.1:4321')).toBe(false);
  });

  it('is on for https anywhere', () => {
    expect(shouldUseSecureCookie('https', 'localhost:3001')).toBe(true);
    expect(shouldUseSecureCookie('https', 'news.example.com')).toBe(true);
  });

  it('is on for plain http off-loopback', () => {
    expect(shouldUseSecureCookie('http', 'news.example.com')).toBe(true);
    expect(shouldUseSecureCookie('http', undefined)).toBe(true);
  });
});

describe('parseCookies', () => {
  it('parses a cookie header', () => {
    expect(parseCookies('a=1; b=two; c=%20spaced%20')).toEqual({
      a: '1',
      b: 'two',
      c: ' spaced ',
    });
  });

  it('returns an empty object for no header', () => {
    expect(parseCookies(undefined)).toEqual({});
  });

  it('ignores malformed pairs and keeps the first of a duplicate', () => {
    expect(parseCookies('=novalue; onlyname; a=1; a=2')).toEqual({ a: '1' });
  });
});
