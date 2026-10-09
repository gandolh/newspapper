/**
 * "Mark all read", bounded by what the list loaded (brief 105).
 *
 * Two paths, and choosing between them is the whole point of this module:
 *
 * - **No filter.** `POST /api/reader/mark-read` with `upToId` = the highest id
 *   among the loaded rows, narrowed to the list's source or category. Items
 *   that arrived after the list loaded have higher ids and stay unread. The
 *   highest *id*, not the last row's: the list is ordered by `sort_at`, and a
 *   late-fetched item can sit anywhere in it.
 * - **A filter is active.** The bulk route takes no `q`, so calling it here
 *   would mark every unread item in the scope, including the ones the filter
 *   hid. Instead each loaded, unread, matching row is marked on its own — the
 *   rows on screen are exactly the ones the filter matched — and nothing else.
 */
import type { FeedItemSummary } from '@/lib/types';
import type { Narrow } from './query';

/** The API call this needs: `api()` from `lib/api.ts`, or a fake in a test. */
export type ReaderCall = (
  path: string,
  init: { method: string; json?: unknown },
) => Promise<unknown>;

export type MarkAllReadPlan =
  | { kind: 'none' }
  | { kind: 'rows'; ids: number[] }
  | {
      kind: 'bulk';
      upToId: number;
      body: { upToId: number; sourceId?: string; category?: string | null };
    };

/** How many PATCHes run at once on the filtered path. */
const ROW_CONCURRENCY = 4;

export function planMarkAllRead(
  rows: readonly Pick<FeedItemSummary, 'id' | 'read'>[],
  q: string,
  narrow: Narrow,
): MarkAllReadPlan {
  if (rows.length === 0) return { kind: 'none' };

  if (q.trim()) {
    const ids = rows.filter((r) => !r.read).map((r) => r.id);
    return ids.length ? { kind: 'rows', ids } : { kind: 'none' };
  }

  const upToId = Math.max(...rows.map((r) => r.id));
  const body: { upToId: number; sourceId?: string; category?: string | null } = { upToId };
  if (narrow?.kind === 'source') body.sourceId = narrow.sourceId;
  if (narrow?.kind === 'category') body.category = narrow.category;
  return { kind: 'bulk', upToId, body };
}

export interface MarkAllReadResult {
  /** How many items the server marked. */
  marked: number;
  /** Which loaded rows are now read: every one at or below `upToId` on the
   * bulk path, or exactly the patched ids on the filtered one. */
  isNowRead: (row: Pick<FeedItemSummary, 'id'>) => boolean;
}

export async function markAllRead(
  rows: readonly Pick<FeedItemSummary, 'id' | 'read'>[],
  q: string,
  narrow: Narrow,
  call: ReaderCall,
): Promise<MarkAllReadResult> {
  const plan = planMarkAllRead(rows, q, narrow);

  if (plan.kind === 'none') return { marked: 0, isNowRead: () => false };

  if (plan.kind === 'bulk') {
    const res = (await call('/api/reader/mark-read', { method: 'POST', json: plan.body })) as {
      marked: number;
    };
    return { marked: res.marked, isNowRead: (row) => row.id <= plan.upToId };
  }

  const done = new Set<number>();
  for (let i = 0; i < plan.ids.length; i += ROW_CONCURRENCY) {
    const batch = plan.ids.slice(i, i + ROW_CONCURRENCY);
    await Promise.all(
      batch.map(async (id) => {
        await call(`/api/reader/items/${id}`, { method: 'PATCH', json: { read: true } });
        done.add(id);
      }),
    );
  }
  return { marked: done.size, isNowRead: (row) => done.has(row.id) };
}
