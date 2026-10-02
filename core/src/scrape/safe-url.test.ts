import { describe, expect, it, vi } from 'vitest';
import { fetchBody } from './body.js';
import { fetchFeed } from './rss.js';
import { isPublicAddress, readCapped, vetUrl } from './safe-url.js';

/** DNS for the tests: names map to fixed addresses, nothing hits the network. */
const DNS: Record<string, string[]> = {
  'news.example': ['93.184.216.34'],
  'evil.example': ['93.184.216.35'],
  'rebound.example': ['10.0.0.5'],
  'mixed.example': ['93.184.216.36', '127.0.0.1'],
};
const lookup = async (host: string) => DNS[host] ?? [];

function html(body: string, init: ResponseInit = {}) {
  return new Response(body, { status: 200, headers: { 'content-type': 'text/html' }, ...init });
}

/** A fetch spy that answers from a URL → response table and records every URL. */
function fakeFetch(routes: Record<string, () => Response>) {
  const spy = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const route = routes[url];
    if (!route) throw new Error(`unexpected fetch ${url}`);
    return route();
  });
  return spy as unknown as typeof fetch & typeof spy;
}

describe('isPublicAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    '::',
    'fc00::1',
    'fd12::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ])('refuses %s', (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each(['93.184.216.34', '1.1.1.1', '172.32.0.1', '2606:4700::1111'])('allows %s', (address) => {
    expect(isPublicAddress(address)).toBe(true);
  });
});

describe('vetUrl', () => {
  it('requires http or https', async () => {
    expect(await vetUrl('file:///etc/passwd', lookup)).toBeNull();
    expect(await vetUrl('gopher://news.example/', lookup)).toBeNull();
    expect(await vetUrl('not a url', lookup)).toBeNull();
  });

  it('refuses a host that resolves to any private address', async () => {
    expect(await vetUrl('https://rebound.example/x', lookup)).toBeNull();
    expect(await vetUrl('https://mixed.example/x', lookup)).toBeNull();
    expect(await vetUrl('https://unknown.example/x', lookup)).toBeNull();
    expect(await vetUrl('http://[::1]:8080/', lookup)).toBeNull();
  });

  it('accepts a public host', async () => {
    expect((await vetUrl('https://news.example/a', lookup))?.href).toBe('https://news.example/a');
  });
});

describe('fetchBody refuses internal targets without ever requesting them', () => {
  it.each([
    'http://127.0.0.1:9999/',
    'http://169.254.169.254/latest/meta-data/',
    'http://rebound.example/',
  ])('%s → empty, no request', async (url) => {
    const fetch = fakeFetch({});
    expect(await fetchBody(url, 'ua', 1000, { fetch, lookup })).toBe('');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('a public page that redirects inward is refused at the redirect, before the inner request', async () => {
    const fetch = fakeFetch({
      'https://evil.example/story': () =>
        new Response(null, {
          status: 302,
          headers: { location: 'http://127.0.0.1:3001/api/settings' },
        }),
    });
    expect(await fetchBody('https://evil.example/story', 'ua', 1000, { fetch, lookup })).toBe('');
    expect(fetch.mock.calls.map(([u]) => String(u))).toEqual(['https://evil.example/story']);
  });

  it('a redirect between public hosts is followed', async () => {
    const fetch = fakeFetch({
      'https://evil.example/old': () =>
        new Response(null, { status: 301, headers: { location: 'https://news.example/new' } }),
      'https://news.example/new': () => html('<p>Moved here</p>'),
    });
    expect(await fetchBody('https://evil.example/old', 'ua', 1000, { fetch, lookup })).toBe(
      'Moved here',
    );
  });

  it('a normal public article still returns its stripped text', async () => {
    const fetch = fakeFetch({
      'https://news.example/a': () => html('<h1>Title</h1><p>Body &amp; more</p>'),
    });
    expect(await fetchBody('https://news.example/a', 'ua', 1000, { fetch, lookup })).toBe(
      'Title Body & more',
    );
  });
});

describe('bodies are capped', () => {
  it('stops reading past the cap instead of buffering the whole body', async () => {
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        if (pulled > 1000) controller.close();
        else controller.enqueue(new TextEncoder().encode('x'.repeat(64 * 1024)));
      },
    });
    const text = await readCapped(new Response(stream), 256 * 1024);
    expect(text.length).toBe(256 * 1024);
    expect(pulled).toBeLessThan(10); // ~4 chunks read, not 1000 (64 MB)
  });

  it('fetchBody applies the cap', async () => {
    const big = `<p>${'a'.repeat(3 * 1024 * 1024)}</p>`;
    const fetch = fakeFetch({ 'https://news.example/big': () => html(big) });
    const text = await fetchBody('https://news.example/big', 'ua', 1000, { fetch, lookup });
    expect(text.length).toBeLessThanOrEqual(2 * 1024 * 1024);
    expect(text.length).toBeGreaterThan(1024 * 1024);
  });
});

describe('fetchFeed uses the same guard', () => {
  it('refuses an internal feed URL without requesting it', async () => {
    const fetch = fakeFetch({});
    await expect(
      fetchFeed('http://127.0.0.1:9999/rss', 'ua', 1000, { fetch, lookup }),
    ).rejects.toThrow(/public/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('parses a public feed', async () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>
      <item><title>Hello</title><link>https://news.example/a</link><pubDate>Thu, 01 Oct 2026 10:00:00 GMT</pubDate></item>
      </channel></rss>`;
    const fetch = fakeFetch({
      'https://news.example/rss': () =>
        new Response(xml, { headers: { 'content-type': 'application/rss+xml' } }),
    });
    const items = await fetchFeed('https://news.example/rss', 'ua', 1000, { fetch, lookup });
    expect(items.map((i) => i.title)).toEqual(['Hello']);
  });
});
