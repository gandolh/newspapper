import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchArticles, pingSource } from './index.js';
import type { SourceConfig } from '../types.js';

// Mock rss-parser and fetchBody so we don't hit the network
vi.mock('./rss.js', () => ({
  fetchFeed: vi.fn(),
}));

vi.mock('./body.js', () => ({
  fetchBody: vi.fn().mockResolvedValue(''),
  stripHtml: (html: string) => html,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const sources: SourceConfig[] = [
  { id: 'bbc', name: 'BBC News', rss: 'https://bbc.co.uk/rss', enabled: true },
  { id: 'cnn', name: 'CNN', rss: 'https://cnn.com/rss', enabled: false },
  { id: 'rt', name: 'Reuters', rss: 'https://reuters.com/rss', enabled: true },
];

function makeItem(title: string, url: string, summary = '') {
  return { title, url, summary, publishedAt: '2026-06-10T10:00:00.000Z' };
}

describe('searchArticles', () => {
  it('only searches enabled sources', async () => {
    const { fetchFeed } = await import('./rss.js');
    const mockFetch = vi.mocked(fetchFeed);
    mockFetch.mockResolvedValue([makeItem('BBC Article about budget', 'https://bbc.co.uk/1')]);

    await searchArticles(sources, { keywords: ['budget'] });
    const calledUrls = mockFetch.mock.calls.map((c) => c[0]);
    expect(calledUrls).toContain('https://bbc.co.uk/rss');
    expect(calledUrls).not.toContain('https://cnn.com/rss');
    expect(calledUrls).toContain('https://reuters.com/rss');
  });

  it('matches case-insensitively across title and body', async () => {
    const { fetchFeed } = await import('./rss.js');
    const { fetchBody } = await import('./body.js');
    vi.mocked(fetchFeed).mockImplementation(async (url) => {
      if (url.includes('bbc')) return [makeItem('Weather today', 'https://bbc.co.uk/1')];
      return [];
    });
    vi.mocked(fetchBody).mockResolvedValue('A story about the BUDGET and taxes.');

    const result = await searchArticles([sources[0]], { keywords: ['budget'] });
    expect(result.articles).toHaveLength(1);
    expect(result.articles[0].title).toBe('Weather today');
  });

  it('ORs multiple keywords — an article matching any one of them is included', async () => {
    const { fetchFeed } = await import('./rss.js');
    const { fetchBody } = await import('./body.js');
    vi.mocked(fetchFeed).mockImplementation(async (url) => {
      if (url.includes('bbc')) {
        return [
          makeItem('Tax story', 'https://bbc.co.uk/1'),
          makeItem('Sports story', 'https://bbc.co.uk/2'),
        ];
      }
      return [];
    });
    vi.mocked(fetchBody).mockImplementation(async (url) => {
      if (url.includes('/1')) return 'All about tax policy.';
      return 'A football match report.';
    });

    const result = await searchArticles([sources[0]], { keywords: ['tax', 'football'] });
    const titles = result.articles.map((a) => a.title);
    expect(titles).toContain('Tax story');
    expect(titles).toContain('Sports story');
  });

  it('excludes items matching none of the keywords', async () => {
    const { fetchFeed } = await import('./rss.js');
    const { fetchBody } = await import('./body.js');
    vi.mocked(fetchFeed).mockResolvedValue([makeItem('Unrelated', 'https://bbc.co.uk/1')]);
    vi.mocked(fetchBody).mockResolvedValue('Nothing relevant here.');

    const result = await searchArticles([sources[0]], { keywords: ['budget'] });
    expect(result.articles).toHaveLength(0);
  });

  it('does not use word-boundary matching — a bare substring is enough', async () => {
    const { fetchFeed } = await import('./rss.js');
    const { fetchBody } = await import('./body.js');
    vi.mocked(fetchFeed).mockResolvedValue([makeItem('Taxes are rising', 'https://bbc.co.uk/1')]);
    vi.mocked(fetchBody).mockResolvedValue('');

    const result = await searchArticles([sources[0]], { keywords: ['tax'] });
    expect(result.articles).toHaveLength(1);
  });

  it('ranks by total keyword match count, highest first', async () => {
    const { fetchFeed } = await import('./rss.js');
    const { fetchBody } = await import('./body.js');
    vi.mocked(fetchFeed).mockResolvedValue([
      makeItem('One mention', 'https://bbc.co.uk/1'),
      makeItem('Three mentions', 'https://bbc.co.uk/2'),
    ]);
    vi.mocked(fetchBody).mockImplementation(async (url) => {
      if (url.includes('/1')) return 'budget once';
      return 'budget budget budget';
    });

    const result = await searchArticles([sources[0]], { keywords: ['budget'] });
    expect(result.articles[0].title).toBe('Three mentions');
    expect(result.articles[0].matchCount).toBe(3);
    expect(result.articles[1].matchCount).toBe(1);
  });

  it('rejects an empty keyword list', async () => {
    await expect(searchArticles([sources[0]], { keywords: [] })).rejects.toThrow(
      /keyword is required/,
    );
    await expect(searchArticles([sources[0]], { keywords: ['  '] })).rejects.toThrow(
      /keyword is required/,
    );
  });

  it('per-source failures are collected in errors without aborting', async () => {
    const { fetchFeed } = await import('./rss.js');
    vi.mocked(fetchFeed).mockImplementation(async (url) => {
      if (url.includes('bbc')) throw new Error('Connection refused');
      return [makeItem('Reuters budget article', 'https://reuters.com/1')];
    });

    const result = await searchArticles(sources, { keywords: ['budget'] });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].sourceId).toBe('bbc');
    expect(result.errors[0].error).toContain('Connection refused');
    const titles = result.articles.map((a) => a.title);
    expect(titles).toContain('Reuters budget article');
  });

  it('emits progress events for each source', async () => {
    const { fetchFeed } = await import('./rss.js');
    vi.mocked(fetchFeed).mockImplementation(async (url) => {
      if (url.includes('bbc')) return [makeItem('BBC budget item', 'https://bbc.co.uk/item')];
      throw new Error('fail');
    });

    const events: Array<{ sourceId: string; status: string }> = [];
    await searchArticles(sources, {
      keywords: ['budget'],
      onProgress: (e) => events.push(e),
    });

    const bbcEvents = events.filter((e) => e.sourceId === 'bbc');
    expect(bbcEvents.find((e) => e.status === 'fetching')).toBeDefined();
    expect(bbcEvents.find((e) => e.status === 'done')).toBeDefined();

    const rtEvents = events.filter((e) => e.sourceId === 'rt');
    expect(rtEvents.find((e) => e.status === 'fetching')).toBeDefined();
    expect(rtEvents.find((e) => e.status === 'error')).toBeDefined();
  });

  it('respects maxPerSource — limits how many feed items are considered', async () => {
    const { fetchFeed } = await import('./rss.js');
    vi.mocked(fetchFeed).mockResolvedValue([
      makeItem('A1 budget', 'https://bbc.co.uk/a1'),
      makeItem('A2 budget', 'https://bbc.co.uk/a2'),
      makeItem('A3 budget', 'https://bbc.co.uk/a3'),
      makeItem('A4 budget', 'https://bbc.co.uk/a4'),
      makeItem('A5 budget', 'https://bbc.co.uk/a5'),
    ]);

    const result = await searchArticles([sources[0]], {
      keywords: ['budget'],
      maxPerSource: 2,
    });
    expect(result.articles.length).toBeLessThanOrEqual(2);
  });

  it('never calls into storage — a search is a read-only network operation', async () => {
    const { fetchFeed } = await import('./rss.js');
    vi.mocked(fetchFeed).mockResolvedValue([makeItem('Budget news', 'https://bbc.co.uk/1')]);
    const result = await searchArticles([sources[0]], { keywords: ['budget'] });
    expect(result.articles[0]).not.toHaveProperty('id');
    expect(result.articles[0]).not.toHaveProperty('savedAt');
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

describe('searchArticles runs sources concurrently (brief 96)', () => {
  const six: SourceConfig[] = Array.from({ length: 6 }, (_, i) => ({
    id: `s${i}`,
    name: `Source ${i}`,
    rss: `https://s${i}.example/rss`,
    enabled: true,
  }));
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it('takes about the slowest batch, not the sum of every source', async () => {
    const { fetchFeed } = await import('./rss.js');
    const { fetchBody } = await import('./body.js');
    vi.mocked(fetchFeed).mockImplementation(async (url: string) => {
      await delay(200);
      return [makeItem(`climate in ${url}`, `${url}/a`)];
    });
    vi.mocked(fetchBody).mockImplementation(async () => {
      await delay(100);
      return 'climate';
    });
    const started = Date.now();
    const result = await searchArticles(six, { keywords: ['climate'] });
    const elapsed = Date.now() - started;
    expect(result.articles).toHaveLength(6);
    // Sequential was 6 × 300 ms = 1800 ms; 4 at a time is two rounds, ~600 ms.
    expect(elapsed).toBeLessThan(1200);
  });

  it('a failing feed errors only itself; every source reports progress; ties keep the sequential order', async () => {
    const { fetchFeed } = await import('./rss.js');
    const { fetchBody } = await import('./body.js');
    vi.mocked(fetchBody).mockResolvedValue('');
    vi.mocked(fetchFeed).mockImplementation(async (url: string) => {
      // Later sources answer first, to shake the completion order.
      await delay(url.includes('s0') ? 60 : 10);
      if (url.includes('s3')) throw new Error('feed down');
      return [makeItem(`climate story`, `${url}/a`)];
    });
    const progress: string[] = [];
    const result = await searchArticles(six, {
      keywords: ['climate'],
      onProgress: (e) => progress.push(`${e.sourceId}:${e.status}`),
    });
    expect(result.errors).toEqual([{ sourceId: 's3', error: 'feed down' }]);
    // Exactly what the sequential search produced for these ties, even though
    // s0 now finishes last: results are joined in source order before the
    // (unchanged) sort. That comparator returns -1 for equal dates, so ties come
    // out reversed; it is locked ranking behaviour, and not this brief's to change.
    expect(result.articles.map((a) => a.sourceId)).toEqual(['s5', 's4', 's2', 's1', 's0']);
    for (const s of six) expect(progress).toContain(`${s.id}:fetching`);
    expect(progress).toContain('s3:error');
  });
});
