/**
 * The list request. The API reads `category` three ways — absent (no filter),
 * blank (uncategorized), named — so the one way to get it wrong silently is to
 * send `category=` when nothing was narrowed, which would quietly show only the
 * uncategorized sources.
 */
import { describe, expect, it } from 'vitest';
import type { Source } from '@/lib/types';
import { adjustUnread, groupSources, itemsPath, unreadIn } from './query';

function params(path: string): URLSearchParams {
  return new URL(path, 'http://x.test').searchParams;
}

describe('itemsPath', () => {
  it('sends no category and no sourceId when nothing is narrowed', () => {
    const p = params(itemsPath({ scope: 'unread', narrow: null, q: '' }));
    expect(p.has('category')).toBe(false);
    expect(p.has('sourceId')).toBe(false);
    expect(p.get('scope')).toBe('unread');
  });

  it('sends a blank category for the uncategorized group', () => {
    const p = params(
      itemsPath({ scope: 'all', narrow: { kind: 'category', category: null }, q: '' }),
    );
    expect(p.has('category')).toBe(true);
    expect(p.get('category')).toBe('');
  });

  it('sends a named category, a source, a trimmed filter and a cursor', () => {
    expect(
      params(
        itemsPath({ scope: 'all', narrow: { kind: 'category', category: 'News' }, q: '' }),
      ).get('category'),
    ).toBe('News');
    const p = params(
      itemsPath({
        scope: 'unread',
        narrow: { kind: 'source', sourceId: 'bbc' },
        q: '  ș, tax ',
        cursor: 'abc',
      }),
    );
    expect(p.get('sourceId')).toBe('bbc');
    expect(p.has('category')).toBe(false);
    expect(p.get('q')).toBe('ș, tax');
    expect(p.get('cursor')).toBe('abc');
  });
});

const source = (id: string, name: string, category: string | null): Source => ({
  id,
  name,
  rss: `https://${id}.test/feed`,
  enabled: true,
  category,
  lastFetchedAt: null,
  lastError: null,
});

describe('groupSources', () => {
  it('sorts categories and sources, and puts uncategorized last', () => {
    const groups = groupSources([
      source('c', 'Zeta', null),
      source('a', 'Beta', 'Tech'),
      source('b', 'Alpha', 'News'),
      source('d', 'Alpha', '  '),
      source('e', 'Aardvark', 'Tech'),
    ]);
    expect(groups.map((g) => [g.category, g.sources.map((s) => s.id)])).toEqual([
      ['News', ['b']],
      ['Tech', ['e', 'a']],
      [null, ['d', 'c']],
    ]);
  });
});

describe('counts', () => {
  const counts = { unread: 5, all: 9, unreadBySource: { a: 2, b: 3 } };
  const sources = [source('a', 'A', 'News'), source('b', 'B', null)];

  it('counts unread under a narrowing', () => {
    expect(unreadIn(counts, null, sources)).toBe(5);
    expect(unreadIn(counts, { kind: 'source', sourceId: 'b' }, sources)).toBe(3);
    expect(unreadIn(counts, { kind: 'category', category: 'News' }, sources)).toBe(2);
    expect(unreadIn(counts, { kind: 'category', category: null }, sources)).toBe(3);
  });

  it('adjusts after one item changes state, never below zero', () => {
    expect(adjustUnread(counts, 'a', -1)).toEqual({
      unread: 4,
      all: 9,
      unreadBySource: { a: 1, b: 3 },
    });
    expect(adjustUnread(counts, 'zz', -1).unreadBySource['zz']).toBe(0);
  });
});
