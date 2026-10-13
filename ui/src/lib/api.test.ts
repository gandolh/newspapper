/**
 * Brief 90. `api()` and the login URL, without a DOM: `fetch` and the bits
 * of `window` the module touches are stubbed. `BASE` is read from
 * `import.meta.env.BASE_URL` at module load, so each test stubs it and
 * re-imports.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const assign = vi.fn();

async function load(base = '/', path = 'posts') {
  vi.stubEnv('BASE_URL', base);
  vi.stubGlobal('window', {
    location: { pathname: `${base}${path}`, search: '?q=1', assign },
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
  it('a 401 sends the browser to the login page with the current page as next, and throws ApiError(401)', async () => {
    const { api, ApiError } = await load();
    respond(401, { error: 'unauthorized' });
    const err = await api('/api/posts').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as InstanceType<typeof ApiError>).status).toBe(401);
    expect(assign).toHaveBeenCalledWith(`/login?next=${encodeURIComponent('/posts?q=1')}`);
  });

  it("carries the session check's reason to the login page, and drops one that is not a code", async () => {
    const { api } = await load();
    respond(401, { error: 'unauthorized', reason: 'ward_session_ended' });
    await api('/api/posts').catch(() => undefined);
    expect(assign).toHaveBeenLastCalledWith(
      `/login?next=${encodeURIComponent('/posts?q=1')}&reason=ward_session_ended`,
    );

    respond(401, { error: 'unauthorized', reason: '<script>' });
    await api('/api/posts').catch(() => undefined);
    expect(assign).toHaveBeenLastCalledWith(`/login?next=${encodeURIComponent('/posts?q=1')}`);
  });

  it('a 401 on the login page itself does not redirect again', async () => {
    const { api } = await load('/', 'login');
    respond(401, { error: 'unauthorized' });
    await api('/api/anything').catch(() => undefined);
    expect(assign).not.toHaveBeenCalled();
  });

  it('skipAuthRedirect suppresses the redirect but still throws', async () => {
    const { api } = await load();
    respond(401, { error: 'unauthorized' });
    await expect(api('/api/posts', { skipAuthRedirect: true })).rejects.toThrow('unauthorized');
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

  it('the login URL carries the base, and next stays an origin path', async () => {
    const { loginUrl } = await load('/newspapper/');
    expect(loginUrl()).toBe('/newspapper/login');
    expect(loginUrl('/newspapper/posts?q=1')).toBe(
      `/newspapper/login?next=${encodeURIComponent('/newspapper/posts?q=1')}`,
    );
  });
});
