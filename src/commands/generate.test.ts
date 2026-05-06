import { describe, it, expect } from 'vitest';
import { buildMetadata, formatNextSteps } from './generate.js';

describe('buildMetadata', () => {
  it('includes all required top-level fields', () => {
    const result = buildMetadata({
      groupId: 'grp-1',
      summaryId: 'sum-1',
      design: 'broadsheet',
      method: 'local',
      tone: 'analytical',
      slideCount: 4,
      articles: [],
      sources: [],
    });
    expect(result.groupId).toBe('grp-1');
    expect(result.summaryId).toBe('sum-1');
    expect(result.design).toBe('broadsheet');
    expect(result.method).toBe('local');
    expect(result.tone).toBe('analytical');
    expect(result.slideCount).toBe(4);
    expect(typeof result.generatedAt).toBe('string');
  });

  it('maps articles to title/source/url/author/publishedAt', () => {
    const articles = [
      { id: 'a1', title: 'Story', sourceId: 'src-1', url: 'http://x', author: 'Bob', publishedAt: '2026-01-01', body: '', scrapedAt: '' },
    ];
    const sources = [{ id: 'src-1', name: 'Guardian', url: '', rss: null, scraperType: 'http', selectors: {}, enabled: true }];
    const result = buildMetadata({ groupId: 'g', summaryId: 's', design: 'd', method: 'm', tone: 't', slideCount: 1, articles, sources });
    expect(result.articles).toHaveLength(1);
    expect(result.articles[0].title).toBe('Story');
    expect(result.articles[0].source).toBe('Guardian');
    expect(result.articles[0].url).toBe('http://x');
    expect(result.articles[0].author).toBe('Bob');
    expect(result.articles[0].publishedAt).toBe('2026-01-01');
  });

  it('falls back to "Unknown" when source is not found', () => {
    const articles = [
      { id: 'a1', title: 'Story', sourceId: 'missing', url: 'http://x', author: null, publishedAt: undefined, body: '', scrapedAt: '' },
    ];
    const result = buildMetadata({ groupId: 'g', summaryId: 's', design: 'd', method: 'm', tone: 't', slideCount: 1, articles, sources: [] });
    expect(result.articles[0].source).toBe('Unknown');
  });
});

describe('formatNextSteps', () => {
  it('contains the group id and output dir in each relevant line', () => {
    const result = formatNextSteps('grp-1', '/output/grp-1');
    expect(result).toContain('/output/grp-1');
    expect(result).toContain('grp-1');
    expect(result).toContain('export');
    expect(result).toContain('summarize');
  });
});
