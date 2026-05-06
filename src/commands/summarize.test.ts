import { describe, it, expect } from 'vitest';
import { formatSlidePreview, formatArticleTable } from './summarize.js';

describe('formatSlidePreview', () => {
  it('formats slides with type, text, attribution, and notes', () => {
    const slides = [
      { type: 'title', text: 'Big Headline', notes: '4 articles' },
      { type: 'quote', text: 'We did it.', attribution: 'The Guardian', notes: 'Key quote' },
      { type: 'body', text: 'Lots of context here.' },
    ];
    const result = formatSlidePreview(slides);
    expect(result).toContain('Slide 1/3 [title]');
    expect(result).toContain('Big Headline');
    expect(result).toContain('Notes: 4 articles');
    expect(result).toContain('Slide 2/3 [quote]');
    expect(result).toContain('— The Guardian');
    expect(result).toContain('Slide 3/3 [body]');
  });

  it('omits attribution line when not present', () => {
    const slides = [{ type: 'body', text: 'Some text.' }];
    const result = formatSlidePreview(slides);
    expect(result).not.toContain('—');
  });

  it('omits notes line when not present', () => {
    const slides = [{ type: 'title', text: 'Headline' }];
    const result = formatSlidePreview(slides);
    expect(result).not.toContain('Notes:');
  });

  it('returns empty string for empty slides array', () => {
    expect(formatSlidePreview([])).toBe('');
  });
});

describe('formatArticleTable', () => {
  it('renders a table with index, title, source, word count', () => {
    const articles = [
      { id: 'a1', title: 'Biden climate plan unveiled today', sourceName: 'Guardian', metadata: { wordCount: 1200, language: 'en' }, sourceId: 's1', url: 'http://x', body: '', scrapedAt: '', publishedAt: null },
      { id: 'a2', title: 'Short', sourceName: 'NYT', metadata: { wordCount: 500, language: 'en' }, sourceId: 's2', url: 'http://y', body: '', scrapedAt: '', publishedAt: null },
    ];
    const result = formatArticleTable(articles);
    expect(result).toContain('Guardian');
    expect(result).toContain('1200');
    expect(result).toContain('NYT');
  });

  it('truncates long titles', () => {
    const longTitle = 'A'.repeat(60);
    const articles = [
      { id: 'a1', title: longTitle, sourceName: 'BBC', metadata: { wordCount: 800, language: 'en' }, sourceId: 's1', url: 'http://z', body: '', scrapedAt: '', publishedAt: null },
    ];
    const result = formatArticleTable(articles);
    expect(result).not.toContain(longTitle);
    expect(result).toContain('…');
  });
});
