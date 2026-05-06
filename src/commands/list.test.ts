import { describe, it, expect } from 'vitest';
import { filterByDays, filterArticlesBySource, formatStats } from './list.js';

interface Entry { id: string; date: string; [key: string]: unknown; }

describe('filterByDays', () => {
  const now = new Date('2026-05-06T00:00:00Z');
  const entries: Entry[] = [
    { id: 'a1', date: '2026-04-01T00:00:00Z' },
    { id: 'a2', date: '2026-05-01T00:00:00Z' },
    { id: 'a3', date: '2026-05-05T00:00:00Z' },
  ];

  it('returns entries from within the last N days', () => {
    const result = filterByDays(entries, 7, now);
    expect(result.map(e => e.id)).toEqual(['a2', 'a3']);
  });

  it('returns all entries when days is large', () => {
    const result = filterByDays(entries, 365, now);
    expect(result).toHaveLength(3);
  });

  it('returns empty when no entries are recent enough', () => {
    const result = filterByDays(entries, 1, now);
    expect(result.map(e => e.id)).toEqual(['a3']);
  });
});

interface ArticleEntry extends Entry { sourceId: string; }
interface SourceLike { id: string; name: string; }

describe('filterArticlesBySource', () => {
  const articles: ArticleEntry[] = [
    { id: 'a1', date: '2026-05-01', sourceId: 'src-guardian' },
    { id: 'a2', date: '2026-05-01', sourceId: 'src-nyt' },
    { id: 'a3', date: '2026-05-01', sourceId: 'src-guardian' },
  ];
  const sources: SourceLike[] = [
    { id: 'src-guardian', name: 'Guardian' },
    { id: 'src-nyt', name: 'NYT' },
  ];

  it('filters articles to those matching source name (case-insensitive)', () => {
    const result = filterArticlesBySource(articles, 'guardian', sources);
    expect(result.map(a => a.id)).toEqual(['a1', 'a3']);
  });

  it('returns empty when no source matches', () => {
    const result = filterArticlesBySource(articles, 'bbc', sources);
    expect(result).toHaveLength(0);
  });

  it('returns all articles when sourceName is undefined', () => {
    const result = filterArticlesBySource(articles, undefined, sources);
    expect(result).toHaveLength(3);
  });
});

describe('formatStats', () => {
  it('reports count and type', () => {
    const result = formatStats(5, 'articles');
    expect(result).toContain('5');
    expect(result).toContain('articles');
  });

  it('reports zero correctly', () => {
    const result = formatStats(0, 'groups');
    expect(result).toContain('0');
    expect(result).toContain('groups');
  });
});
