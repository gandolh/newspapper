/**
 * Brief 90. `api()` and Ward's login URL, without a DOM: `fetch` and the bits
 * of `window` the module touches are stubbed. `BASE` is read from
 * `import.meta.env.BASE_URL` at module load, so each test stubs it and
 * re-imports.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const assign = vi.fn();

async function load(base = '/') {
  vi.stubEnv('BASE_URL', base);
  vi.stubGlobal('window', {
    location: { pathname: `${base}posts`, search: '?q=1', assign },
  });
  vi.resetModules();
  return import('./api');
}

function respond(status: number, body?: unknown) {
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) =>
    body === undefined
      ? new Response(null, { status })
      : new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

afterEach(() => {
  assign.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('api()', () => {
  it('a 401 sends the browser to Ward with the current page as next, and throws ApiError(401)', async () => {
    const { api, ApiError } = await load();
    respond(401, { error: 'Authentication required' });
    const err = await api('/api/posts').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as InstanceType<typeof ApiError>).status).toBe(401);
    expect(assign).toHaveBeenCalledWith(`/ward/login?next=${encodeURIComponent('/posts?q=1')}`);
  });

  it('skipAuthRedirect suppresses the redirect but still throws', async () => {
    const { api } = await load();
    respond(401, { error: 'Authentication required' });
    await expect(api('/api/me', { skipAuthRedirect: true })).rejects.toThrow(
      'Authentication required',
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it("a non-ok body's error becomes the message, and other statuses do not redirect", async () => {
    const { api } = await load();
    respond(409, { error: 'Post has not been rendered yet' });
    await expect(api('/api/posts/1/publish', { method: 'POST' })).rejects.toThrow(
      'Post has not been rendered yet',
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it('a 204 resolves to undefined, and json bodies are sent as JSON', async () => {
    const { api } = await load();
    const fetch = respond(204);
    await expect(
      api('/api/posts/1', { method: 'DELETE', json: { a: 1 } }),
    ).resolves.toBeUndefined();
    const init = fetch.mock.calls[0]![1]!;
    expect(new Headers(init.headers).get('content-type')).toBe('application/json');
    expect(init.body).toBe('{"a":1}');
  });
});

describe('under /newspapper/', () => {
  it('app requests carry the base', async () => {
    const { api } = await load('/newspapper/');
    const fetch = respond(200, []);
    await api('/api/posts');
    expect(fetch.mock.calls[0]![0]).toBe('/newspapper/api/posts');
  });

  it("Ward's login URL is origin-absolute, never under the base", async () => {
    const { wardLoginUrl, WARD_ACCOUNT_PATH } = await load('/newspapper/');
    // /newspapper/ward/login is nothing; Ward is a different app on the origin.
    expect(wardLoginUrl()).toBe(`/ward/login?next=${encodeURIComponent('/newspapper/')}`);
    expect(WARD_ACCOUNT_PATH).toBe('/ward/account');
  });
});
