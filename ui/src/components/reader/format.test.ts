/**
 * Brief 105: what the Reader's two copy actions put on the clipboard, and how
 * a list row says an item's age.
 */
import { describe, expect, it } from 'vitest';
import { attributedQuote, excerpt, formatAge, titleAndLink } from './format';

const item = {
  title: 'Constituția României 1991',
  sourceName: 'Politica la Minut',
  url: 'https://example.com/constitutia',
};

describe('attributedQuote', () => {
  it('is “passage” — Title, Source, URL', () => {
    expect(attributedQuote('Revolta izbucnită la Timișoara', item)).toBe(
      '“Revolta izbucnită la Timișoara” — Constituția României 1991, Politica la Minut, https://example.com/constitutia',
    );
  });

  it('folds the line breaks and runs of space a selection carries', () => {
    expect(attributedQuote('  one\n\ttwo   three \n', item)).toMatch(/^“one two three” — /);
  });
});

describe('titleAndLink', () => {
  it('puts the title and the URL on two lines', () => {
    expect(titleAndLink(item.title, item.url)).toBe(
      'Constituția României 1991\nhttps://example.com/constitutia',
    );
  });
});

describe('formatAge', () => {
  const now = Date.parse('2026-10-09T12:00:00Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('counts minutes, hours and days, then gives a date', () => {
    expect(formatAge(ago(30_000), now)).toBe('now');
    expect(formatAge(ago(12 * 60_000), now)).toBe('12m');
    expect(formatAge(ago(3 * 3_600_000), now)).toBe('3h');
    expect(formatAge(ago(6 * 86_400_000), now)).toBe('6d');
    expect(formatAge('2026-09-01T12:00:00Z', now)).toBe('Sep 1');
    expect(formatAge('2022-02-21T12:00:00Z', now)).toBe('Feb 21, 2022');
  });

  it('reads a future date as now, and nothing as nothing', () => {
    expect(formatAge(ago(-3_600_000), now)).toBe('now');
    expect(formatAge(null, now)).toBe('');
    expect(formatAge('not a date', now)).toBe('');
  });
});

describe('excerpt', () => {
  it('cuts at the limit with an ellipsis and leaves short text alone', () => {
    expect(excerpt('short', 10)).toBe('short');
    expect(excerpt('a long body of text', 6)).toBe('a long…');
  });
});
