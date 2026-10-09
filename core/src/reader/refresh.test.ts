import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Parser from 'rss-parser';
import { getDb, type DB } from '../storage/db.js';
import { getSource, saveSources } from '../storage/sources.js';
import { getFeedItem, insertFeedItems, listFeedItems } from '../storage/feed-items.js';
import { isRefreshing, refreshSources, type RefreshProgressEvent } from './refresh.js';

/**
 * Brief 105: refresh against local fixtures. `safeFetch` refuses loopback, so
 * there is no local HTTP server: fetch and DNS are injected the way
 * `safe-url.test.ts` does it, and the guard itself still runs on every URL.
 */

const fixture = (name: string) =>
  readFileSync(new URL(`../scrape/fixtures/${name}`, import.meta.url), 'utf8');

const lookup = async () => ['93.184.216.34'];

type Route = (headers: Record<string, string>) => Response | Promise<Response>;

let routes: Record<string, Route>;
let calls: Array<{ url: string; headers: Record<string, string> }>;

const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  const headers = (init?.headers ?? {}) as Record<string, string>;
  calls.push({ url, headers });
  const route = routes[url];
  if (!route) throw new Error(`unexpected fetch ${url}`);
  return route(headers);
});
const deps = { fetch: fetchSpy as unknown as typeof fetch, lookup };

const RSS = 'https://feeds.example/rss2';
const ATOM = 'https://feeds.example/atom';
const DOWN = 'https://down.example/rss';
const OFF = 'https://feeds.example/off';

let clock = new Date('2026-10-05T12:00:00.000Z');
const now = () => clock;

let tmp: string;
let db: DB;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'np-reader-'));
  db = getDb(join(tmp, 'test.db'));
  saveSources(
    [
      { id: 'rss', name: 'RSS 2.0', rss: RSS, enabled: true },
      { id: 'atom', name: 'Atom', rss: ATOM, enabled: true },
      { id: 'down', name: 'Down', rss: DOWN, enabled: true },
      { id: 'off', name: 'Off', rss: OFF, enabled: false },
    ],
    db,
  );
  clock = new Date('2026-10-05T12:00:00.000Z');
  calls = [];
  fetchSpy.mockClear();
  routes = {
    [RSS]: () => new Response(fixture('rss2.xml')),
    [ATOM]: () => new Response(fixture('atom.xml')),
    [DOWN]: () => {
      throw new Error('connect ECONNREFUSED');
    },
    [OFF]: () => new Response(fixture('rss2.xml')),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  db.close();
  rmSync(tmp, { recursive: true, force: true });
});

function itemByUrl(url: string) {
  const row = db.prepare('SELECT id FROM feed_items WHERE url = ?').get(url) as
    | { id: number }
    | undefined;
  return row ? getFeedItem(db, row.id) : undefined;
}

describe('refreshSources', () => {
  it('stores RSS 2.0 and Atom items, and a second refresh inserts 0', async () => {
    const first = await refreshSources(db, { deps, now });
    // RSS: 4 kept (hostile link and untitled skipped); Atom: 2.
    expect(first.newCount).toBe(6);
    expect(listFeedItems(db).items).toHaveLength(6);
    expect(itemByUrl('https://news.example/encoded')?.contentHtml).toContain('<em>full</em>');
    expect(itemByUrl('https://atom.example/content')?.author).toBe('Maria Ionescu');

    clock = new Date('2026-10-05T12:30:00.000Z');
    const second = await refreshSources(db, { deps, now });
    expect(second.newCount).toBe(0);
    expect(listFeedItems(db).items).toHaveLength(6);
  });

  it('keeps undated items, and sorts a future-dated item at its fetch time', async () => {
    await refreshSources(db, { deps, now });
    const undated = itemByUrl('https://news.example/undated')!;
    expect(undated.publishedAt).toBeNull();
    expect(undated.sortAt).toBe('2026-10-05T12:00:00.000Z');

    const future = itemByUrl('https://news.example/future')!;
    expect(future.publishedAt).toBe('2100-01-01T00:00:00.000Z');
    expect(future.sortAt).toBe('2026-10-05T12:00:00.000Z');
    expect(future.fetchedAt).toBe('2026-10-05T12:00:00.000Z');

    // So the future item does not pin itself above everything fetched later.
    clock = new Date('2026-10-05T13:00:00.000Z');
    routes[ATOM] = () =>
      new Response(
        fixture('atom.xml').replace(
          '</feed>',
          `<entry><title>Later</title><id>urn:later</id><link href="https://atom.example/later"/>
           <updated>2026-10-05T12:45:00Z</updated></entry></feed>`,
        ),
      );
    await refreshSources(db, { deps, now });
    expect(listFeedItems(db).items[0]!.url).toBe('https://atom.example/later');
  });

  it('a 304 parses nothing and updates last_fetched_at', async () => {
    routes[RSS] = (headers) =>
      headers['If-None-Match'] === '"v1"'
        ? new Response(null, { status: 304 })
        : new Response(fixture('rss2.xml'), {
            headers: { etag: '"v1"', 'last-modified': 'Mon, 05 Oct 2026 11:00:00 GMT' },
          });
    await refreshSources(db, { deps, now });
    expect(getSource('rss', db)?.lastFetchedAt).toBe('2026-10-05T12:00:00.000Z');

    const parse = vi.spyOn(Parser.prototype, 'parseString');
    calls = [];
    clock = new Date('2026-10-05T12:30:00.000Z');
    const events: RefreshProgressEvent[] = [];
    const result = await refreshSources(db, { deps, now, onProgress: (e) => events.push(e) });

    const rssCall = calls.find((c) => c.url === RSS)!;
    expect(rssCall.headers['If-None-Match']).toBe('"v1"');
    expect(rssCall.headers['If-Modified-Since']).toBe('Mon, 05 Oct 2026 11:00:00 GMT');
    // Only the Atom feed (which sent no validators) was parsed.
    expect(parse).toHaveBeenCalledTimes(1);
    expect(result.newCount).toBe(0);
    expect(result.errors.map((e) => e.sourceId)).toEqual(['down']);
    expect(events).toContainEqual({ sourceId: 'rss', status: 'done', count: 0 });
    const rss = getSource('rss', db)!;
    expect(rss.lastFetchedAt).toBe('2026-10-05T12:30:00.000Z');
    expect(rss.lastError).toBeNull();
    // The validators are kept for the next round.
    expect(db.prepare(`SELECT etag, last_modified FROM sources WHERE id = 'rss'`).get()).toEqual({
      etag: '"v1"',
      last_modified: 'Mon, 05 Oct 2026 11:00:00 GMT',
    });
  });

  it('one failing source sets last_error and does not stop the others', async () => {
    routes[ATOM] = () => new Response('nope', { status: 503 });
    const events: RefreshProgressEvent[] = [];
    const result = await refreshSources(db, { deps, now, onProgress: (e) => events.push(e) });

    expect([...result.errors].sort((x, y) => x.sourceId.localeCompare(y.sourceId))).toEqual([
      { sourceId: 'atom', error: 'Feed request failed with status 503' },
      { sourceId: 'down', error: 'connect ECONNREFUSED' },
    ]);
    expect(getSource('down', db)?.lastError).toBe('connect ECONNREFUSED');
    expect(getSource('down', db)?.lastFetchedAt).toBeNull();
    expect(getSource('atom', db)?.lastError).toMatch(/503/);
    expect(result.newCount).toBe(4);
    expect(getSource('rss', db)?.lastError).toBeNull();
    expect(events).toContainEqual({
      sourceId: 'down',
      status: 'error',
      error: 'connect ECONNREFUSED',
    });

    // Once it answers, the error clears.
    routes[DOWN] = () =>
      new Response(fixture('atom.xml').replaceAll('atom.example', 'down.example'));
    await refreshSources(db, { deps, now });
    expect(getSource('down', db)?.lastError).toBeNull();
    expect(getSource('down', db)?.lastFetchedAt).toBe('2026-10-05T12:00:00.000Z');
  });

  it('two concurrent refresh calls perform one run', async () => {
    const late: RefreshProgressEvent[] = [];
    const first = refreshSources(db, { deps, now });
    const second = refreshSources(db, { deps, now, onProgress: (e) => late.push(e) });
    expect(second).toBe(first);
    expect(isRefreshing(db)).toBe(true);

    const [a, b] = await Promise.all([first, second]);
    expect(b).toBe(a);
    // One fetch per enabled source, not two.
    expect(calls.map((c) => c.url).sort()).toEqual([ATOM, DOWN, RSS].sort());
    // The joiner hears the run's events from the moment it joined.
    expect(
      late
        .filter((e) => e.status !== 'fetching')
        .map((e) => e.sourceId)
        .sort(),
    ).toEqual(['atom', 'down', 'rss']);
    expect(isRefreshing(db)).toBe(false);

    // Afterwards a new call starts a new run.
    await refreshSources(db, { deps, now });
    expect(calls).toHaveLength(6);
  });

  it('reports per-source progress in the Search event shape', async () => {
    const events: RefreshProgressEvent[] = [];
    await refreshSources(db, { deps, now, onProgress: (e) => events.push(e) });
    const forRss = events.filter((e) => e.sourceId === 'rss');
    expect(forRss).toEqual([
      { sourceId: 'rss', status: 'fetching' },
      { sourceId: 'rss', status: 'done', count: 4 },
    ]);
  });

  it('never fetches a disabled source, and can refresh just one', async () => {
    await refreshSources(db, { deps, now });
    expect(calls.map((c) => c.url)).not.toContain(OFF);

    calls = [];
    const one = await refreshSources(db, { deps, now, sourceId: 'atom' });
    expect(calls.map((c) => c.url)).toEqual([ATOM]);
    expect(one.errors).toEqual([]);

    calls = [];
    await refreshSources(db, { deps, now, sourceId: 'off' });
    expect(calls).toEqual([]);
  });

  it('purges after each refresh', async () => {
    const old = Array.from({ length: 55 }, (_, i) => ({
      title: `old ${i}`,
      url: `https://feeds.example/old/${i}`,
      publishedAt: new Date(Date.parse('2026-07-01T00:00:00.000Z') + i * 60_000).toISOString(),
    }));
    insertFeedItems(db, 'off', old, '2026-07-01T00:00:00.000Z');
    const result = await refreshSources(db, { deps, now, retentionDays: 30 });
    expect(result.purged).toBe(5);
    expect(
      db.prepare(`SELECT COUNT(*) AS n FROM feed_items WHERE source_id = 'off'`).get(),
    ).toEqual({ n: 50 });
  });

  it('an aborted run starts nothing and records no errors', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await refreshSources(db, { deps, now, signal: controller.signal });
    expect(calls).toEqual([]);
    expect(result).toEqual({ newCount: 0, errors: [], purged: 0 });
    expect(getSource('down', db)?.lastError).toBeNull();
  });

  it('keeps every fetch on safeFetch: a feed pointing inside the box is refused unfetched', async () => {
    saveSources(
      [{ id: 'inside', name: 'Inside', rss: 'http://127.0.0.1:3001/api', enabled: true }],
      db,
    );
    const result = await refreshSources(db, { deps, now });
    expect(calls).toEqual([]);
    expect(result.errors[0]?.error).toMatch(/not a public/);
  });
});
