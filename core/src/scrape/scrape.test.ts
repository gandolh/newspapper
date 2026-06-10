import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scrape, pingSource } from './index.js';
import type { SourceConfig } from '../types.js';

// Mock rss-parser and fetchBody so we don't hit the network
vi.mock('./rss.js', () => ({
  fetchFeed: vi.fn(),
}));

vi.mock('./body.js', () => ({
  fetchBody: vi.fn().mockResolvedValue('article body text'),
  stripHtml: (html: string) => html,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-scrape-test-'));
  vi.clearAllMocks();
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

const TODAY = '2026-06-10';

const sources: SourceConfig[] = [
  { id: 'bbc', name: 'BBC News', rss: 'https://bbc.co.uk/rss', enabled: true },
  { id: 'cnn', name: 'CNN', rss: 'https://cnn.com/rss', enabled: false },
  { id: 'rt', name: 'Reuters', rss: 'https://reuters.com/rss', enabled: true },
];

function makeItem(title: string, url: string, date = TODAY) {
  return { title, url, summary: `Summary of ${title}`, publishedAt: `${date}T10:00:00.000Z` };
}

describe('scrape', () => {
  it('only scrapes enabled sources', async () => {
    const { fetchFeed } = await import('./rss.js');
    const mockFetch = vi.mocked(fetchFeed);
    mockFetch.mockResolvedValue([makeItem('BBC Article', 'https://bbc.co.uk/1')]);

    const result = await scrape(sources, { date: TODAY, dbPath: join(tmpDir, 'test.db') });
    // CNN is disabled, so fetchFeed should only be called for bbc and rt
    const calledUrls = mockFetch.mock.calls.map((c) => c[0]);
    expect(calledUrls).toContain('https://bbc.co.uk/rss');
    expect(calledUrls).not.toContain('https://cnn.com/rss');
    expect(calledUrls).toContain('https://reuters.com/rss');
  });

  it('filters items to the given date', async () => {
    const { fetchFeed } = await import('./rss.js');
    vi.mocked(fetchFeed).mockImplementation(async (url) => {
      if (url.includes('bbc')) {
        return [
          makeItem('Today Article', 'https://bbc.co.uk/today', TODAY),
          makeItem('Old Article', 'https://bbc.co.uk/old', '2026-06-09'),
        ];
      }
      return [];
    });

    const result = await scrape(sources, { date: TODAY, dbPath: join(tmpDir, 'test.db') });
    // Only today's article should be in the result
    const titles = result.articles.map((a) => a.title);
    expect(titles).toContain('Today Article');
    expect(titles).not.toContain('Old Article');
  });

  it('per-source failures are collected in errors without aborting', async () => {
    const { fetchFeed } = await import('./rss.js');
    vi.mocked(fetchFeed).mockImplementation(async (url) => {
      if (url.includes('bbc')) throw new Error('Connection refused');
      return [makeItem('Reuters Article', 'https://reuters.com/1')];
    });

    const result = await scrape(sources, { date: TODAY, dbPath: join(tmpDir, 'test.db') });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].sourceId).toBe('bbc');
    expect(result.errors[0].error).toContain('Connection refused');
    // Reuters still scraped
    const titles = result.articles.map((a) => a.title);
    expect(titles).toContain('Reuters Article');
  });

  it('emits progress events for each source', async () => {
    const { fetchFeed } = await import('./rss.js');
    vi.mocked(fetchFeed).mockImplementation(async (url) => {
      if (url.includes('bbc')) return [makeItem('BBC Item', 'https://bbc.co.uk/item')];
      throw new Error('fail');
    });

    const events: Array<{ sourceId: string; status: string }> = [];
    await scrape(sources, {
      date: TODAY,
      dbPath: join(tmpDir, 'test.db'),
      onProgress: (e) => events.push(e),
    });

    const bbcEvents = events.filter((e) => e.sourceId === 'bbc');
    expect(bbcEvents.find((e) => e.status === 'fetching')).toBeDefined();
    expect(bbcEvents.find((e) => e.status === 'done')).toBeDefined();

    const rtEvents = events.filter((e) => e.sourceId === 'rt');
    expect(rtEvents.find((e) => e.status === 'fetching')).toBeDefined();
    expect(rtEvents.find((e) => e.status === 'error')).toBeDefined();
  });

  it('re-scraping accumulates articles (deduplication by URL)', async () => {
    const { fetchFeed } = await import('./rss.js');
    const dbPath = join(tmpDir, 'test.db');

    vi.mocked(fetchFeed).mockResolvedValue([makeItem('Article 1', 'https://bbc.co.uk/art1')]);
    const r1 = await scrape([sources[0]], { date: TODAY, dbPath });

    // Second run returns same article plus a new one
    vi.mocked(fetchFeed).mockResolvedValue([
      makeItem('Article 1', 'https://bbc.co.uk/art1'),
      makeItem('Article 2', 'https://bbc.co.uk/art2'),
    ]);
    const r2 = await scrape([sources[0]], { date: TODAY, dbPath });

    // Both articles should be in r2 (accumulated)
    const titles2 = r2.articles.map((a) => a.title);
    expect(titles2).toContain('Article 1');
    expect(titles2).toContain('Article 2');
    // No duplicates
    expect(titles2.filter((t) => t === 'Article 1')).toHaveLength(1);
  });

  it('respects maxPerSource limit', async () => {
    const { fetchFeed } = await import('./rss.js');
    vi.mocked(fetchFeed).mockResolvedValue([
      makeItem('A1', 'https://bbc.co.uk/a1'),
      makeItem('A2', 'https://bbc.co.uk/a2'),
      makeItem('A3', 'https://bbc.co.uk/a3'),
      makeItem('A4', 'https://bbc.co.uk/a4'),
      makeItem('A5', 'https://bbc.co.uk/a5'),
    ]);

    const result = await scrape([sources[0]], {
      date: TODAY,
      dbPath: join(tmpDir, 'test.db'),
      maxPerSource: 2,
    });
    expect(result.articles.length).toBeLessThanOrEqual(2);
  });
});

describe('pingSource', () => {
  it('returns ok=true and itemCount when feed is reachable', async () => {
    const { fetchFeed } = await import('./rss.js');
    vi.mocked(fetchFeed).mockResolvedValue([
      makeItem('A', 'https://bbc.co.uk/a'),
      makeItem('B', 'https://bbc.co.uk/b'),
    ]);
    const result = await pingSource(sources[0]);
    expect(result.ok).toBe(true);
    expect(result.itemCount).toBe(2);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns ok=false with error message when feed fails', async () => {
    const { fetchFeed } = await import('./rss.js');
    vi.mocked(fetchFeed).mockRejectedValue(new Error('Network timeout'));
    const result = await pingSource(sources[0]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Network timeout');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
