import { describe, it, expect } from 'vitest';
import { formatRelated, formatTimeline } from './query-entities.js';

describe('formatRelated', () => {
  it('shows top 10 related entities per non-empty category, excluding the searched name', () => {
    const results = [
      {
        articleId: '1',
        matches: ['Biden'],
        allEntities: {
          people: ['Biden', 'Harris', 'Blinken'],
          places: ['Washington'],
          organizations: ['Senate'],
          events: [],
        },
      },
      {
        articleId: '2',
        matches: ['Biden'],
        allEntities: {
          people: ['Biden', 'McCarthy'],
          places: ['New York'],
          organizations: ['Senate'],
          events: [],
        },
      },
    ];
    const out = formatRelated(results, 'Biden');
    expect(out).toContain('Harris');
    expect(out).toContain('Blinken');
    expect(out).toContain('McCarthy');
    expect(out).not.toContain('Biden');
    expect(out).toContain('Washington');
    expect(out).toContain('Senate');
    expect(out).not.toContain('Events');
  });

  it('returns empty string when no related entities exist', () => {
    const results = [
      { articleId: '1', matches: ['Biden'], allEntities: { people: ['Biden'], places: [], organizations: [], events: [] } },
    ];
    expect(formatRelated(results, 'Biden')).toBe('');
  });
});

describe('formatTimeline', () => {
  it('groups by date and renders bars', () => {
    const articles = [
      { publishedAt: '2026-05-03T10:00:00.000Z', scrapedAt: '2026-05-03T10:00:00.000Z' },
      { publishedAt: '2026-05-03T12:00:00.000Z', scrapedAt: '2026-05-03T12:00:00.000Z' },
      { publishedAt: '2026-05-04T09:00:00.000Z', scrapedAt: '2026-05-04T09:00:00.000Z' },
    ];
    const out = formatTimeline(articles);
    expect(out).toContain('05/03');
    expect(out).toContain('05/04');
    expect(out).toContain('(2)');
    expect(out).toContain('(1)');
    expect(out).toContain('██');
  });

  it('falls back to scrapedAt when publishedAt is absent', () => {
    const articles = [
      { publishedAt: null, scrapedAt: '2026-05-05T10:00:00.000Z' },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = formatTimeline(articles as any);
    expect(out).toContain('05/05');
  });

  it('returns empty string for empty input', () => {
    expect(formatTimeline([])).toBe('');
  });
});
