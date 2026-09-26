import { describe, expect, it } from 'vitest';
import { joinBase, normalizeBase, stripPrefix } from './base';

/*
 * The pure two-argument forms are what is tested. `withBase`/`stripBase` are
 * these bound to `import.meta.env.BASE_URL`, which is fixed at `/` under
 * vitest — testing them would only ever exercise the root case, which is the
 * one case that cannot break.
 */

describe('normalizeBase', () => {
  it('treats empty, undefined and "/" as the root', () => {
    expect(normalizeBase(undefined)).toBe('/');
    expect(normalizeBase('')).toBe('/');
    expect(normalizeBase('/')).toBe('/');
  });

  it('adds the slashes a hand-written value tends to miss', () => {
    expect(normalizeBase('/newspapper')).toBe('/newspapper/');
    expect(normalizeBase('newspapper')).toBe('/newspapper/');
    expect(normalizeBase('/newspapper/')).toBe('/newspapper/');
  });
});

describe('joinBase', () => {
  it('is the identity at the root', () => {
    expect(joinBase('/', '/api/health')).toBe('/api/health');
    expect(joinBase('/', '/')).toBe('/');
  });

  it('prefixes app paths under a sub-path', () => {
    expect(joinBase('/newspapper/', '/api/health')).toBe('/newspapper/api/health');
    expect(joinBase('/newspapper/', '/posts')).toBe('/newspapper/posts');
  });

  it('does not double the slash on the app root', () => {
    expect(joinBase('/newspapper/', '/')).toBe('/newspapper/');
  });

  it('keeps the query string attached to the root', () => {
    expect(joinBase('/newspapper/', '/?post=3')).toBe('/newspapper/?post=3');
  });

  it('tolerates a path given without its leading slash', () => {
    expect(joinBase('/newspapper/', 'posts')).toBe('/newspapper/posts');
  });
});

describe('stripPrefix', () => {
  it('is the identity at the root', () => {
    expect(stripPrefix('/', '/posts')).toBe('/posts');
    expect(stripPrefix('/', '/')).toBe('/');
  });

  it('removes the sub-path', () => {
    expect(stripPrefix('/newspapper/', '/newspapper/posts')).toBe('/posts');
    expect(stripPrefix('/newspapper/', '/newspapper/')).toBe('/');
  });

  it('maps the bare prefix to the app root', () => {
    // Caddy's redirectBare normally adds the slash first; the router should not
    // be the thing that depends on it.
    expect(stripPrefix('/newspapper/', '/newspapper')).toBe('/');
  });

  it('leaves a pathname outside the base alone', () => {
    expect(stripPrefix('/newspapper/', '/ward/login')).toBe('/ward/login');
  });

  it('does not mistake a sibling prefix for the base', () => {
    expect(stripPrefix('/newspapper/', '/newspapper-docs/x')).toBe('/newspapper-docs/x');
  });

  it('round-trips with joinBase', () => {
    for (const path of ['/', '/posts', '/articles', '/settings']) {
      expect(stripPrefix('/newspapper/', joinBase('/newspapper/', path))).toBe(path);
    }
  });
});
