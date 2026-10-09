/**
 * Brief 105: the Reader's routes, driven through the real app (guard included)
 * against a throwaway DB. Items are seeded with `insertFeedItems`; the one
 * route that fetches, the refresh, is handed an injected fetch and DNS, so no
 * test here reaches the network.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { insertFeedItems, saveSources } from '@newspapper/core';
import type { FeedItem, FeedItemPage, ReaderCounts, Article } from '@newspapper/core';

import { buildApp, bootOptions } from '../server.js';
import { db, resetDb } from '../lib/db.js';
import { createFakeWard } from '../ward/fake-ward.js';

const TOKEN = 'reader-test-session';

const ALPHA_FEED = 'https://feeds.example/alpha';
const BETA_FEED = 'https://feeds.example/beta';
const GAMMA_FEED = 'https://feeds.example/gamma';

/** alpha and gamma share a category; beta has none. gamma is disabled, so a
 * refresh never fetches it. */
const SOURCES = [
  { id: 'alpha', name: 'Alpha', rss: ALPHA_FEED, enabled: true, category: 'News' },
  { id: 'beta', name: 'Beta', rss: BETA_FEED, enabled: true, category: null },
  { id: 'gamma', name: 'Gamma', rss: GAMMA_FEED, enabled: false, category: 'News' },
];

const ALPHA_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Alpha</title>
  <item><title>Fresh one</title><link>https://alpha.example/fresh-1</link>
    <pubDate>Thu, 01 Oct 2026 10:00:00 GMT</pubDate><description>First.</description></item>
  <item><title>Fresh two</title><link>https://alpha.example/fresh-2</link>
    <pubDate>Thu, 01 Oct 2026 11:00:00 GMT</pubDate><description>Second.</description></item>
</channel></rss>`;

const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url === ALPHA_FEED) return new Response(ALPHA_XML);
  if (url === BETA_FEED) throw new Error('connect ECONNREFUSED');
  throw new Error(`unexpected fetch ${url}`);
});
const deps = {
  fetch: fetchSpy as unknown as typeof fetch,
  lookup: async () => ['93.184.216.34'],
};

let tmp: string;
let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'np-reader-route-'));
  process.env['NEWSPAPPER_DB_PATH'] = join(tmp, 'test.db');
});

afterAll(() => {
  resetDb();
  delete process.env['NEWSPAPPER_DB_PATH'];
  rmSync(tmp, { recursive: true, force: true });
});

beforeEach(async () => {
  // Replacing the sources cascades their items away; the library goes too.
  db().exec('DELETE FROM articles');
  saveSources(SOURCES, db());
  fetchSpy.mockClear();
  const ward = createFakeWard();
  ward.signIn(TOKEN, 'subject_reader', { newspapper: ['editor'] });
  app = await buildApp({ ward, readerRefresh: { deps } });
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

type Method = 'GET' | 'POST' | 'PATCH';
const call = (method: Method, url: string, payload?: unknown) =>
  app.inject({ method, url, payload: payload as object, cookies: { ward_session: TOKEN } });

interface Seed {
  slug: string;
  title?: string;
  html?: string;
  /** Minutes past 2026-10-01T00:00Z, so order is deterministic. */
  at: number;
}

/** Store items for a source, as a refresh would. Returns their ids by slug. */
function seed(sourceId: string, items: Seed[]): Record<string, number> {
  insertFeedItems(
    db(),
    sourceId,
    items.map((i) => ({
      title: i.title ?? i.slug,
      url: `https://${sourceId}.example/${i.slug}`,
      contentHtml: i.html ?? `<p>${i.slug} body</p>`,
      publishedAt: new Date(Date.parse('2026-10-01T00:00:00.000Z') + i.at * 60_000).toISOString(),
    })),
    '2026-10-05T12:00:00.000Z',
  );
  const ids: Record<string, number> = {};
  for (const i of items) {
    const row = db()
      .prepare('SELECT id FROM feed_items WHERE url = ?')
      .get(`https://${sourceId}.example/${i.slug}`) as { id: number };
    ids[i.slug] = row.id;
  }
  return ids;
}

async function list(query = ''): Promise<FeedItemPage> {
  const res = await call('GET', `/api/reader/items${query}`);
  expect(res.statusCode).toBe(200);
  return res.json() as FeedItemPage;
}

const titles = (page: FeedItemPage) => page.items.map((i) => i.title);

/** The SSE frames of a finished stream, in order. */
function events(body: string): { event: string; data: unknown }[] {
  return body
    .split('\n\n')
    .filter((block) => block.trim())
    .map((block) => {
      const event = /^event: (.*)$/m.exec(block)?.[1] ?? 'message';
      const raw = /^data: (.*)$/m.exec(block)?.[1] ?? '';
      return { event, data: JSON.parse(raw) as unknown };
    });
}

describe('GET /api/reader/items', () => {
  it('is behind the guard', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/reader/items' });
    expect(res.statusCode).toBe(401);
    const refresh = await app.inject({ method: 'POST', url: '/api/reader/refresh', payload: {} });
    expect(refresh.statusCode).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('carries no item HTML in the list, while the full item does', async () => {
    seed('alpha', [{ slug: 'marked', html: '<p class="np-marker">Body <em>html</em></p>', at: 1 }]);
    const res = await call('GET', '/api/reader/items');
    expect(res.statusCode).toBe(200);
    // On the raw text: neither spelling of the field, nor the markup itself.
    expect(res.body).not.toContain('content_html');
    expect(res.body).not.toContain('contentHtml');
    expect(res.body).not.toContain('np-marker');
    expect(res.body).not.toContain('<em>');
    const [summary] = (res.json() as FeedItemPage).items;
    expect(summary).toMatchObject({ title: 'marked', excerpt: 'Body html', read: false });

    // The control: the same item in full does carry it, so the assertions
    // above are looking at the field's real name.
    const full = await call('GET', `/api/reader/items/${summary!.id}`);
    expect(full.body).toContain('contentHtml');
    expect((full.json() as FeedItem).contentHtml).toBe(
      '<p class="np-marker">Body <em>html</em></p>',
    );
  });

  it('scope=unread leaves out read items; scope=all and no scope keep them', async () => {
    const ids = seed('alpha', [
      { slug: 'one', at: 1 },
      { slug: 'two', at: 2 },
    ]);
    await call('PATCH', `/api/reader/items/${ids['one']}`, { read: true });
    expect(titles(await list('?scope=unread'))).toEqual(['two']);
    expect(titles(await list('?scope=all'))).toEqual(['two', 'one']);
    expect(titles(await list())).toEqual(['two', 'one']);
    expect(titles(await list('?scope='))).toEqual(['two', 'one']);
    const bad = await call('GET', '/api/reader/items?scope=starred');
    expect(bad.statusCode).toBe(400);
  });

  it('filters by sourceId', async () => {
    seed('alpha', [{ slug: 'a', at: 1 }]);
    seed('beta', [{ slug: 'b', at: 2 }]);
    expect(titles(await list('?sourceId=beta'))).toEqual(['b']);
    expect(titles(await list('?sourceId='))).toEqual(['b', 'a']);
  });

  it('filters by category: absent is every source, blank is uncategorized', async () => {
    seed('alpha', [{ slug: 'a', at: 1 }]);
    seed('beta', [{ slug: 'b', at: 2 }]);
    seed('gamma', [{ slug: 'g', at: 3 }]);
    expect(titles(await list())).toEqual(['g', 'b', 'a']);
    expect(titles(await list('?category=News'))).toEqual(['g', 'a']);
    expect(titles(await list('?category='))).toEqual(['b']);
    expect(titles(await list('?category=Nothing'))).toEqual([]);
  });

  it('q follows the keyword rule: comma-separated, OR, case-insensitive, title or text', async () => {
    seed('alpha', [
      { slug: 'budget', title: 'Budget day', at: 1 },
      { slug: 'weather', title: 'Rain', html: '<p>Ploaie în Ștefănești</p>', at: 2 },
      { slug: 'other', title: 'Unrelated', at: 3 },
    ]);
    expect(titles(await list('?q=BUDGET'))).toEqual(['Budget day']);
    expect(titles(await list(`?q=${encodeURIComponent('ștefănești')}`))).toEqual(['Rain']);
    expect(titles(await list(`?q=${encodeURIComponent('budget, ploaie')}`))).toEqual([
      'Rain',
      'Budget day',
    ]);
  });

  it('pages with a cursor, and refuses a cursor it did not issue', async () => {
    seed(
      'alpha',
      [1, 2, 3, 4, 5].map((n) => ({ slug: `n${n}`, at: n })),
    );
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = await list(`?limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      seen.push(...titles(page));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor !== null && pages < 10);
    expect(pages).toBe(3);
    expect(seen).toEqual(['n5', 'n4', 'n3', 'n2', 'n1']);

    const forged = await call('GET', '/api/reader/items?cursor=not-a-cursor');
    expect(forged.statusCode).toBe(400);
    expect(forged.json()).toEqual({ error: 'Invalid cursor' });
    const badLimit = await call('GET', '/api/reader/items?limit=many');
    expect(badLimit.statusCode).toBe(400);
  });
});

describe('GET /api/reader/items/:id', () => {
  it('returns the full item and has no side effect', async () => {
    const ids = seed('alpha', [{ slug: 'one', at: 1 }]);
    const res = await call('GET', `/api/reader/items/${ids['one']}`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      id: ids['one'],
      sourceId: 'alpha',
      sourceName: 'Alpha',
      guid: 'https://alpha.example/one',
      url: 'https://alpha.example/one',
      read: false,
      saved: false,
      articleId: null,
    });
    expect((await list()).items[0]!.read).toBe(false);
  });

  it('404 for an unknown id, 400 for a malformed one', async () => {
    expect((await call('GET', '/api/reader/items/999999')).statusCode).toBe(404);
    expect((await call('GET', '/api/reader/items/abc')).statusCode).toBe(400);
  });
});

describe('PATCH /api/reader/items/:id', () => {
  it('marks an item read and unread', async () => {
    const ids = seed('alpha', [{ slug: 'one', at: 1 }]);
    const read = await call('PATCH', `/api/reader/items/${ids['one']}`, { read: true });
    expect(read.statusCode).toBe(200);
    expect(read.json()).toEqual({ id: ids['one'], read: true });
    expect((await list()).items[0]!.read).toBe(true);

    await call('PATCH', `/api/reader/items/${ids['one']}`, { read: false });
    expect((await list()).items[0]!.read).toBe(false);
  });

  it('404 for an unknown id, 400 without a boolean', async () => {
    const ids = seed('alpha', [{ slug: 'one', at: 1 }]);
    const missing = await call('PATCH', '/api/reader/items/999999', { read: true });
    expect(missing.statusCode).toBe(404);
    const bad = await call('PATCH', `/api/reader/items/${ids['one']}`, { read: 'yes' });
    expect(bad.statusCode).toBe(400);
  });
});

describe('POST /api/reader/mark-read', () => {
  it('marks only items up to upToId: one inserted after the list loaded stays unread', async () => {
    seed('alpha', [
      { slug: 'one', at: 1 },
      { slug: 'two', at: 2 },
    ]);
    const loaded = await list();
    const upToId = Math.max(...loaded.items.map((i) => i.id));
    // A refresh lands between loading the list and pressing "Mark all read".
    seed('alpha', [{ slug: 'late', at: 0 }]);

    const res = await call('POST', '/api/reader/mark-read', { upToId });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ marked: 2 });
    expect(titles(await list('?scope=unread'))).toEqual(['late']);
  });

  it('narrows to a source, or to a category (null = uncategorized)', async () => {
    seed('alpha', [{ slug: 'a', at: 1 }]);
    seed('beta', [{ slug: 'b', at: 2 }]);
    seed('gamma', [{ slug: 'g', at: 3 }]);
    const upToId = Math.max(...(await list()).items.map((i) => i.id));

    const bySource = await call('POST', '/api/reader/mark-read', { upToId, sourceId: 'gamma' });
    expect(bySource.json()).toEqual({ marked: 1 });
    const uncategorized = await call('POST', '/api/reader/mark-read', { upToId, category: null });
    expect(uncategorized.json()).toEqual({ marked: 1 });
    expect(titles(await list('?scope=unread'))).toEqual(['a']);
    const byCategory = await call('POST', '/api/reader/mark-read', { upToId, category: 'News' });
    expect(byCategory.json()).toEqual({ marked: 1 });
    expect(titles(await list('?scope=unread'))).toEqual([]);
  });

  it('400 without an integer upToId, or with both a source and a category', async () => {
    expect((await call('POST', '/api/reader/mark-read', {})).statusCode).toBe(400);
    expect((await call('POST', '/api/reader/mark-read', { upToId: '5' })).statusCode).toBe(400);
    const both = await call('POST', '/api/reader/mark-read', {
      upToId: 5,
      sourceId: 'alpha',
      category: 'News',
    });
    expect(both.statusCode).toBe(400);
  });
});

describe('GET /api/reader/counts', () => {
  it('counts unread per source, every source present, and in total', async () => {
    const ids = seed('alpha', [
      { slug: 'one', at: 1 },
      { slug: 'two', at: 2 },
    ]);
    seed('beta', [{ slug: 'b', at: 3 }]);
    await call('PATCH', `/api/reader/items/${ids['one']}`, { read: true });

    const res = await call('GET', '/api/reader/counts');
    expect(res.statusCode).toBe(200);
    expect(res.json() as ReaderCounts).toEqual({
      unread: 2,
      all: 3,
      unreadBySource: { alpha: 1, beta: 1, gamma: 0 },
    });
  });
});

describe('POST /api/reader/items/:id/save', () => {
  it('saves with guid = url, lists as saved, and saving twice leaves one row', async () => {
    const ids = seed('alpha', [{ slug: 'keep', title: 'Worth keeping', at: 1 }]);
    const first = await call('POST', `/api/reader/items/${ids['keep']}/save`, {
      note: 'for the budget post',
    });
    expect(first.statusCode).toBe(201);
    const article = first.json() as Article;
    expect(article).toMatchObject({
      sourceId: 'alpha',
      sourceName: 'Alpha',
      title: 'Worth keeping',
      url: 'https://alpha.example/keep',
      guid: 'https://alpha.example/keep',
      note: 'for the budget post',
    });

    expect((await list()).items[0]!.saved).toBe(true);
    const item = (await call('GET', `/api/reader/items/${ids['keep']}`)).json() as FeedItem;
    expect(item.saved).toBe(true);
    expect(item.articleId).toBe(article.id);

    // A second save returns the same article, note untouched.
    const second = await call('POST', `/api/reader/items/${ids['keep']}/save`, { note: 'other' });
    expect((second.json() as Article).id).toBe(article.id);
    expect((second.json() as Article).note).toBe('for the budget post');
    const library = (await call('GET', '/api/articles?sourceId=alpha')).json() as Article[];
    expect(library).toHaveLength(1);

    // The note is edited on the article, and the library shows the edit.
    const patched = await call('PATCH', `/api/articles/${article.id}`, { note: 'changed my mind' });
    expect(patched.statusCode).toBe(200);
    expect((patched.json() as Article).note).toBe('changed my mind');
    const after = (await call('GET', '/api/articles?sourceId=alpha')).json() as Article[];
    expect(after[0]!.note).toBe('changed my mind');
  });

  it('saves without a body', async () => {
    const ids = seed('alpha', [{ slug: 'bare', at: 1 }]);
    const res = await call('POST', `/api/reader/items/${ids['bare']}/save`);
    expect(res.statusCode).toBe(201);
    expect((res.json() as Article).note).toBe('');
  });

  it('404 for an unknown item, 400 for a note that is not text', async () => {
    const ids = seed('alpha', [{ slug: 'one', at: 1 }]);
    expect((await call('POST', '/api/reader/items/999999/save', {})).statusCode).toBe(404);
    const bad = await call('POST', `/api/reader/items/${ids['one']}/save`, { note: 42 });
    expect(bad.statusCode).toBe(400);
  });
});

describe('POST /api/reader/refresh (SSE)', () => {
  it('streams per-source progress, then done with the new count and errors', async () => {
    const res = await call('POST', '/api/reader/refresh', {});
    expect(res.headers['content-type']).toBe('text/event-stream');
    const stream = events(res.body);

    expect(stream.at(-1)).toEqual({
      event: 'done',
      data: { newCount: 2, errors: [{ sourceId: 'beta', error: 'connect ECONNREFUSED' }] },
    });
    const progress = stream.slice(0, -1);
    expect(progress.every((e) => e.event === 'progress')).toBe(true);
    // Sources run concurrently, so only each source's own order is fixed.
    expect(progress.map((e) => e.data)).toEqual(
      expect.arrayContaining([
        { sourceId: 'alpha', status: 'fetching' },
        { sourceId: 'alpha', status: 'done', count: 2 },
        { sourceId: 'beta', status: 'fetching' },
        { sourceId: 'beta', status: 'error', error: 'connect ECONNREFUSED' },
      ]),
    );
    expect(progress).toHaveLength(4);
    // The disabled source is never fetched.
    expect(fetchSpy.mock.calls.map(([url]) => String(url)).sort()).toEqual(
      [ALPHA_FEED, BETA_FEED].sort(),
    );
    expect(titles(await list())).toEqual(['Fresh two', 'Fresh one']);

    // The failing source is marked on its row, for the rail.
    const sources = (await call('GET', '/api/sources')).json() as Array<{
      id: string;
      lastError: string | null;
    }>;
    expect(sources.find((s) => s.id === 'beta')!.lastError).toBe('connect ECONNREFUSED');
    expect(sources.find((s) => s.id === 'alpha')!.lastError).toBeNull();
  });

  it('refreshes one source when given a sourceId', async () => {
    const stream = events((await call('POST', '/api/reader/refresh', { sourceId: 'alpha' })).body);
    expect(stream.at(-1)).toEqual({ event: 'done', data: { newCount: 2, errors: [] } });
    expect(fetchSpy.mock.calls.map(([url]) => String(url))).toEqual([ALPHA_FEED]);
  });

  it('an unknown source is an SSE error, and nothing is fetched', async () => {
    const stream = events((await call('POST', '/api/reader/refresh', { sourceId: 'nope' })).body);
    expect(stream).toEqual([{ event: 'error', data: { message: 'Source "nope" not found' } }]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('the background loop', () => {
  it('is off unless asked for, which is how every test builds the app', () => {
    expect(app.readerSchedule.active).toBe(false);
  });

  it('boots from READER_REFRESH_MINUTES: 30 by default, 0 for off', () => {
    expect(bootOptions({}).readerRefreshMinutes).toBe(30);
    expect(bootOptions({ READER_REFRESH_MINUTES: '0' }).readerRefreshMinutes).toBe(0);
    expect(bootOptions({ READER_REFRESH_MINUTES: '5' }).readerRefreshMinutes).toBe(5);
  });

  it('refreshes after its first delay, and closing the server stops it with no timer left', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const looped = await buildApp({
        ward: createFakeWard(),
        ...bootOptions({}),
        readerRefresh: { deps },
      });
      await looped.ready();
      expect(looped.readerSchedule.active).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();

      // The first run waits 15 s after boot, then fetches the enabled feeds.
      await vi.advanceTimersByTimeAsync(15_000);
      await vi.waitFor(() =>
        expect(db().prepare('SELECT COUNT(*) AS n FROM feed_items').get()).toEqual({ n: 2 }),
      );
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      // The next run's timer is pending: the control for the count below.
      await vi.waitFor(() => expect(vi.getTimerCount()).toBeGreaterThan(0));

      await looped.close();
      expect(vi.getTimerCount()).toBe(0);
      // Nothing runs again, however long the process lives.
      await vi.advanceTimersByTimeAsync(2 * 60 * 60_000);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
