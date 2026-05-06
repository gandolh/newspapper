import { describe, it, expect } from 'vitest';
import { resolveArticleLimit } from './scrape.js';

describe('resolveArticleLimit', () => {
  it('uses CLI limit when provided', () => {
    expect(resolveArticleLimit(5, 10)).toBe(5);
  });

  it('falls back to source maxArticles when no CLI limit', () => {
    expect(resolveArticleLimit(undefined, 10)).toBe(10);
  });

  it('falls back to 10 when both are absent', () => {
    expect(resolveArticleLimit(undefined, undefined)).toBe(10);
  });
});
