/**
 * What the Reader's list is showing, and the request that fetches it.
 *
 * The selection lives in component state, not in the URL: `router.tsx` knows
 * only the pathname, and extending it is not brief 105's.
 */
import type { ReaderCounts, Source } from '@/lib/types';

/** Unread only, or everything stored. */
export type ReaderScope = 'unread' | 'all';

/**
 * A narrowing of the list to one source or one category. `category: null` is
 * the uncategorized group — a real selection, distinct from no narrowing.
 */
export type Narrow =
  | { kind: 'source'; sourceId: string }
  | { kind: 'category'; category: string | null }
  | null;

/**
 * `GET /api/reader/items` for a selection.
 *
 * The API reads `category` three ways: absent is no filter, present-and-blank
 * is the uncategorized sources, anything else is that category. So `category`
 * is set only for a category narrowing, and an uncategorized one sends it
 * blank on purpose. `scope` is always sent: absent would mean "all".
 */
export function itemsPath(opts: {
  scope: ReaderScope;
  narrow: Narrow;
  q: string;
  cursor?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set('scope', opts.scope);
  if (opts.narrow?.kind === 'source') params.set('sourceId', opts.narrow.sourceId);
  if (opts.narrow?.kind === 'category') params.set('category', opts.narrow.category ?? '');
  const q = opts.q.trim();
  if (q) params.set('q', q);
  if (opts.cursor) params.set('cursor', opts.cursor);
  return `/api/reader/items?${params.toString()}`;
}

/** Two narrowings are the same selection. */
export function sameNarrow(a: Narrow, b: Narrow): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind === 'source' && b.kind === 'source') return a.sourceId === b.sourceId;
  if (a.kind === 'category' && b.kind === 'category') return a.category === b.category;
  return false;
}

/** A blank category is no category. */
export function categoryOf(source: Pick<Source, 'category'>): string | null {
  const c = source.category?.trim();
  return c ? c : null;
}

export interface SourceGroup {
  /** `null` is the uncategorized group. */
  category: string | null;
  sources: Source[];
}

/**
 * Sources grouped by category for the rail: categories A–Z, sources A–Z
 * inside each, and the uncategorized group last.
 */
export function groupSources(sources: Source[]): SourceGroup[] {
  const byCategory = new Map<string | null, Source[]>();
  for (const source of sources) {
    const key = categoryOf(source);
    const list = byCategory.get(key) ?? [];
    list.push(source);
    byCategory.set(key, list);
  }
  const byName = (a: Source, b: Source) => a.name.localeCompare(b.name);
  const named = [...byCategory.keys()]
    .filter((k): k is string => k !== null)
    .sort((a, b) => a.localeCompare(b))
    .map((category) => ({ category, sources: byCategory.get(category)!.sort(byName) }));
  const loose = byCategory.get(null);
  return loose ? [...named, { category: null, sources: loose.sort(byName) }] : named;
}

/** Unread items under a narrowing (or everywhere, for `null`). */
export function unreadIn(counts: ReaderCounts, narrow: Narrow, sources: Source[]): number {
  if (narrow === null) return counts.unread;
  if (narrow.kind === 'source') return counts.unreadBySource[narrow.sourceId] ?? 0;
  return sources
    .filter((s) => categoryOf(s) === narrow.category)
    .reduce((sum, s) => sum + (counts.unreadBySource[s.id] ?? 0), 0);
}

/** Counts after `delta` unread items of `sourceId` changed state. */
export function adjustUnread(counts: ReaderCounts, sourceId: string, delta: number): ReaderCounts {
  return {
    ...counts,
    unread: Math.max(0, counts.unread + delta),
    unreadBySource: {
      ...counts.unreadBySource,
      [sourceId]: Math.max(0, (counts.unreadBySource[sourceId] ?? 0) + delta),
    },
  };
}
