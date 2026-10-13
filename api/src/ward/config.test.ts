import { describe, it, expect } from 'vitest';
import { authPaths, publicOrigin, trimBase } from './config.js';

describe('trimBase', () => {
  it('normalises the spellings of one base', () => {
    expect(trimBase('/newspapper/')).toBe('/newspapper');
    expect(trimBase('newspapper')).toBe('/newspapper');
    expect(trimBase('/')).toBe('');
    expect(trimBase(undefined)).toBe('');
  });
});

describe('authPaths', () => {
  it('scopes the cookie to the app base, not to <base>/api', () => {
    // <img src="/newspapper/output/..."> must carry the session; see config.ts.
    const paths = authPaths({ NEWSPAPPER_BASE: '/newspapper/' });
    expect(paths).toEqual({
      base: '/newspapper',
      cookiePath: '/newspapper',
      loginPath: '/newspapper/login',
      settingsPath: '/newspapper/settings',
      afterSignInPath: '/newspapper/',
    });
  });

  it('uses the origin root for a standalone run', () => {
    expect(authPaths({ NEWSPAPPER_BASE: '/' })).toMatchObject({
      cookiePath: '/',
      loginPath: '/login',
      afterSignInPath: '/',
    });
    expect(authPaths({})).toMatchObject({ cookiePath: '/', loginPath: '/login' });
  });

  it('reads the base back out of the Ward callback when NEWSPAPPER_BASE is unset', () => {
    const paths = authPaths({
      WARD_OIDC_REDIRECT_URI: 'https://example.com/newspapper/api/auth/ward/callback',
    });
    expect(paths.cookiePath).toBe('/newspapper');
  });

  it('lets an explicit NEWSPAPPER_BASE win over the callback', () => {
    const paths = authPaths({
      NEWSPAPPER_BASE: '/',
      WARD_OIDC_REDIRECT_URI: 'https://example.com/newspapper/api/auth/ward/callback',
    });
    expect(paths.cookiePath).toBe('/');
  });
});

describe('publicOrigin', () => {
  it('prefers PUBLIC_ORIGIN, then the callback origin, then the dev server', () => {
    expect(publicOrigin({ PUBLIC_ORIGIN: 'https://example.com/' })).toBe('https://example.com');
    expect(
      publicOrigin({ WARD_OIDC_REDIRECT_URI: 'https://example.org/x/api/auth/ward/callback' }),
    ).toBe('https://example.org');
    expect(publicOrigin({})).toBe('http://localhost:4321');
  });
});
