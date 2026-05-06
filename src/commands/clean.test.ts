import { describe, it, expect } from 'vitest';
import { parseOlderThan, filterDeletable } from './clean.js';

describe('parseOlderThan', () => {
  it('parses "30d" as 30 days ago', () => {
    const now = new Date('2026-05-06T12:00:00Z');
    const cutoff = parseOlderThan('30d', now);
    const expected = new Date('2026-04-06T12:00:00Z');
    expect(cutoff.getTime()).toBe(expected.getTime());
  });

  it('parses "7d" as 7 days ago', () => {
    const now = new Date('2026-05-06T00:00:00Z');
    const cutoff = parseOlderThan('7d', now);
    const expected = new Date('2026-04-29T00:00:00Z');
    expect(cutoff.getTime()).toBe(expected.getTime());
  });

  it('parses "1d" as 1 day ago', () => {
    const now = new Date('2026-05-06T00:00:00Z');
    const cutoff = parseOlderThan('1d', now);
    const expected = new Date('2026-05-05T00:00:00Z');
    expect(cutoff.getTime()).toBe(expected.getTime());
  });

  it('throws on invalid format', () => {
    expect(() => parseOlderThan('abc')).toThrow('Invalid --older-than value');
  });

  it('uses current time when no reference date provided', () => {
    const before = Date.now();
    const cutoff = parseOlderThan('0d');
    const after = Date.now();
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(before);
    expect(cutoff.getTime()).toBeLessThanOrEqual(after);
  });
});

interface Entry { id: string; date: string; status: string; [key: string]: unknown; }

describe('filterDeletable', () => {
  const entries: Entry[] = [
    { id: 'a1', date: '2026-01-01T00:00:00Z', status: 'scraped' },
    { id: 'a2', date: '2026-01-15T00:00:00Z', status: 'grouped' },
    { id: 'a3', date: '2026-04-20T00:00:00Z', status: 'scraped' },
    { id: 'a4', date: '2026-04-20T00:00:00Z', status: 'published' },
  ];
  const cutoff = new Date('2026-03-01T00:00:00Z');

  it('returns entries older than the cutoff', () => {
    const result = filterDeletable(entries, cutoff);
    expect(result.map(e => e.id)).toEqual(['a1', 'a2']);
  });

  it('filters by status when provided', () => {
    const result = filterDeletable(entries, cutoff, 'scraped');
    expect(result.map(e => e.id)).toEqual(['a1']);
  });

  it('returns empty array when nothing matches', () => {
    const future = new Date('2020-01-01T00:00:00Z');
    expect(filterDeletable(entries, future)).toEqual([]);
  });
});
