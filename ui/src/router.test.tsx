/**
 * Brief 90. The router's base-path call sites, the code that regresses only
 * under `/newspapper/` (`base.test.ts` covers the pure helpers). No DOM:
 * `window` is stubbed with just what the router touches, and the base is
 * stubbed before a fresh import.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const pushState = vi.fn();
const replaceState = vi.fn();

async function load(base: string, pathname: string) {
  vi.stubEnv('BASE_URL', base);
  vi.stubGlobal('window', {
    location: { pathname },
    history: { pushState, replaceState },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.resetModules();
  return import('./router');
}

afterEach(() => {
  pushState.mockReset();
  replaceState.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('under /newspapper/', () => {
  it('the current path is read with the base stripped', async () => {
    const { pathnameSnapshot } = await load('/newspapper/', '/newspapper/posts');
    expect(pathnameSnapshot()).toBe('/posts');
  });

  it('the bare base is the root', async () => {
    const { pathnameSnapshot } = await load('/newspapper/', '/newspapper/');
    expect(pathnameSnapshot()).toBe('/');
  });

  it('navigate writes the base back on', async () => {
    const { navigate } = await load('/newspapper/', '/newspapper/');
    navigate('/posts');
    expect(pushState).toHaveBeenCalledWith({}, '', '/newspapper/posts');
    navigate('/articles', { replace: true });
    expect(replaceState).toHaveBeenCalledWith({}, '', '/newspapper/articles');
  });

  it('Link renders a base-prefixed href', async () => {
    const { Link } = await load('/newspapper/', '/newspapper/');
    expect(renderToStaticMarkup(<Link href="/posts">Posts</Link>)).toContain(
      'href="/newspapper/posts"',
    );
  });
});

describe('at the root (dev)', () => {
  it('paths pass through unchanged', async () => {
    const { pathnameSnapshot, navigate } = await load('/', '/posts');
    expect(pathnameSnapshot()).toBe('/posts');
    navigate('/articles');
    expect(pushState).toHaveBeenCalledWith({}, '', '/articles');
  });
});
