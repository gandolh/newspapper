import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fetchFeed, fetchFeedConditional } from './rss.js';

/** Brief 105: what the Reader takes from a feed, checked on real fixtures. */

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

/** Every test host resolves to one public address; nothing hits the network. */
const lookup = async () => ['93.184.216.34'];

function serve(body: string | null, init: ResponseInit = {}) {
  const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    return new Response(body, { status: 200, ...init });
  });
  return spy as unknown as typeof fetch & typeof spy;
}

const opts = { userAgent: 'ua', timeoutMs: 1000 };

describe('fetchFeedConditional — RSS 2.0', () => {
  async function items() {
    const result = await fetchFeedConditional('https://news.example/rss', opts, {
      fetch: serve(fixture('rss2.xml')),
      lookup,
    });
    if (result.status !== 'ok') throw new Error('expected a 200');
    return result.items;
  }

  it('prefers content:encoded over description for the HTML', async () => {
    const item = (await items()).find((i) => i.title === 'Encoded wins')!;
    expect(item.contentHtml).toBe(
      '<p>The <em>full</em> story, with an <img src="https://img.example/a.jpg" alt="A"> image.</p>',
    );
    // Search's plain-text summary is unchanged: rss-parser's snippet of `description`.
    expect(item.summary).toBe('Short teaser only.');
    expect(item.author).toBe('Ana Popescu');
  });

  it('falls back to description when there is no content:encoded', async () => {
    const item = (await items()).find((i) => i.title === 'Description only')!;
    expect(item.contentHtml).toBe(
      '<p>Just the <a href="https://news.example/x">description</a>.</p>',
    );
    expect(item.author).toBe('editor@news.example (Ion Ionescu)');
  });

  it('keeps an undated item, with publishedAt null', async () => {
    const item = (await items()).find((i) => i.title === 'No date at all')!;
    expect(item.publishedAt).toBeNull();
    expect(item.author).toBeNull();
  });

  it('dates items as ISO 8601, and still skips an untitled one', async () => {
    const all = await items();
    expect(all.find((i) => i.title === 'Encoded wins')?.publishedAt).toBe(
      '2026-10-01T10:00:00.000Z',
    );
    expect(all.map((i) => i.url)).not.toContain('https://news.example/untitled');
  });

  it('turns an unparseable date into null instead of failing the feed', async () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>
      <item><title>Bad date</title><link>https://news.example/b</link><pubDate>not a date</pubDate></item>
      </channel></rss>`;
    const items = await fetchFeed('https://news.example/rss', 'ua', 1000, {
      fetch: serve(xml),
      lookup,
    });
    expect(items).toHaveLength(1);
    expect(items[0]!.publishedAt).toBeNull();
  });
});

describe('fetchFeedConditional — Atom', () => {
  async function items() {
    const result = await fetchFeedConditional('https://atom.example/feed', opts, {
      fetch: serve(fixture('atom.xml')),
      lookup,
    });
    if (result.status !== 'ok') throw new Error('expected a 200');
    return result.items;
  }

  it('takes <content> as the HTML, and the author name', async () => {
    const item = (await items()).find((i) => i.title === 'Atom with content')!;
    expect(item.contentHtml).toBe('<p>Atom <strong>content</strong> body.</p>');
    expect(item.author).toBe('Maria Ionescu');
    expect(item.publishedAt).toBe('2026-10-02T09:00:00.000Z');
  });

  it('falls back to <summary> when there is no <content>', async () => {
    const item = (await items()).find((i) => i.title === 'Atom with summary only')!;
    expect(item.contentHtml).toBe('<p>Only a summary.</p>');
    expect(item.publishedAt).toBe('2026-10-01T09:00:00.000Z');
  });
});

describe('fetchFeedConditional — conditional GET', () => {
  it('sends the stored validators and returns the new ones from a 200', async () => {
    const fetch = serve(fixture('rss2.xml'), {
      headers: { etag: '"v2"', 'last-modified': 'Fri, 02 Oct 2026 10:00:00 GMT' },
    });
    const result = await fetchFeedConditional(
      'https://news.example/rss',
      { ...opts, etag: '"v1"', lastModified: 'Thu, 01 Oct 2026 10:00:00 GMT' },
      { fetch, lookup },
    );
    const headers = fetch.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers['If-None-Match']).toBe('"v1"');
    expect(headers['If-Modified-Since']).toBe('Thu, 01 Oct 2026 10:00:00 GMT');
    expect(result).toMatchObject({
      status: 'ok',
      etag: '"v2"',
      lastModified: 'Fri, 02 Oct 2026 10:00:00 GMT',
    });
  });

  it('sends no validators when none are stored', async () => {
    const fetch = serve(fixture('rss2.xml'));
    await fetchFeedConditional('https://news.example/rss', opts, { fetch, lookup });
    const headers = fetch.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers).not.toHaveProperty('If-None-Match');
    expect(headers).not.toHaveProperty('If-Modified-Since');
  });

  it('treats a 304 as "not modified", not an error, and keeps the validators', async () => {
    const fetch = serve(null, { status: 304 });
    const result = await fetchFeedConditional(
      'https://news.example/rss',
      { ...opts, etag: '"v1"', lastModified: 'Thu, 01 Oct 2026 10:00:00 GMT' },
      { fetch, lookup },
    );
    expect(result).toEqual({
      status: 'notModified',
      etag: '"v1"',
      lastModified: 'Thu, 01 Oct 2026 10:00:00 GMT',
    });
  });

  it('still throws on any other non-2xx', async () => {
    await expect(
      fetchFeedConditional('https://news.example/rss', opts, {
        fetch: serve('', { status: 500 }),
        lookup,
      }),
    ).rejects.toThrow(/status 500/);
  });
});
