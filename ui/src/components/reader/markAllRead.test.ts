/**
 * Brief 105: "Mark all read" is bounded by what the list loaded. With a filter
 * active it marks exactly the loaded, matching, unread rows — the bulk route
 * takes no `q`, so using it there would mark items the filter hid. Without
 * one it is a single bulk call capped at the highest loaded id.
 */
import { describe, expect, it, vi } from 'vitest';
import { markAllRead, planMarkAllRead, type ReaderCall } from './markAllRead';

/** Ids deliberately out of order: the list sorts by `sort_at`, not id. */
const rows = [
  { id: 41, read: false },
  { id: 57, read: true },
  { id: 12, read: false },
  { id: 33, read: false },
  { id: 8, read: true },
];

function fakeCall(): { call: ReaderCall; calls: Array<{ path: string; init: unknown }> } {
  const calls: Array<{ path: string; init: unknown }> = [];
  const call = vi.fn(async (path: string, init: { method: string; json?: unknown }) => {
    calls.push({ path, init });
    if (path === '/api/reader/mark-read') return { marked: 3 };
    const id = Number(path.split('/').pop());
    return { id, read: true };
  });
  return { call, calls };
}

describe('with a filter active', () => {
  it('PATCHes exactly the loaded unread rows, and never the bulk route', async () => {
    const { call, calls } = fakeCall();
    const result = await markAllRead(rows, 'budget, tax', null, call);

    expect(calls.every((c) => c.path !== '/api/reader/mark-read')).toBe(true);
    expect(calls.map((c) => c.path).sort()).toEqual(
      ['/api/reader/items/12', '/api/reader/items/33', '/api/reader/items/41'].sort(),
    );
    for (const c of calls) expect(c.init).toEqual({ method: 'PATCH', json: { read: true } });
    expect(result.marked).toBe(3);
    expect(rows.filter(result.isNowRead).map((r) => r.id)).toEqual([41, 12, 33]);
  });

  it('ignores the narrowing: the loaded rows already are the narrowed ones', async () => {
    const { call, calls } = fakeCall();
    await markAllRead(rows, 'x', { kind: 'source', sourceId: 'bbc' }, call);
    expect(calls).toHaveLength(3);
    expect(calls.every((c) => c.path.startsWith('/api/reader/items/'))).toBe(true);
  });

  it('does nothing when every loaded match is already read', async () => {
    const { call, calls } = fakeCall();
    const result = await markAllRead(
      rows.map((r) => ({ ...r, read: true })),
      'x',
      null,
      call,
    );
    expect(calls).toEqual([]);
    expect(result.marked).toBe(0);
  });

  it('treats a filter of only spaces as no filter', () => {
    expect(planMarkAllRead(rows, '   ', null).kind).toBe('bulk');
  });
});

describe('without a filter', () => {
  it('makes one bulk call capped at the highest loaded id, not the last row', async () => {
    const { call, calls } = fakeCall();
    const result = await markAllRead(rows, '', null, call);

    expect(calls).toEqual([
      { path: '/api/reader/mark-read', init: { method: 'POST', json: { upToId: 57 } } },
    ]);
    expect(result.marked).toBe(3);
    expect(result.isNowRead({ id: 57 })).toBe(true);
    expect(result.isNowRead({ id: 58 })).toBe(false);
  });

  it('narrows to the selected source', () => {
    expect(planMarkAllRead(rows, '', { kind: 'source', sourceId: 'bbc' })).toEqual({
      kind: 'bulk',
      upToId: 57,
      body: { upToId: 57, sourceId: 'bbc' },
    });
  });

  it('narrows to a category, and to uncategorized as category: null', () => {
    expect(planMarkAllRead(rows, '', { kind: 'category', category: 'News' })).toMatchObject({
      body: { upToId: 57, category: 'News' },
    });
    const loose = planMarkAllRead(rows, '', { kind: 'category', category: null });
    expect(loose).toMatchObject({ body: { upToId: 57, category: null } });
    expect(loose.kind === 'bulk' && 'sourceId' in loose.body).toBe(false);
  });

  it('sends neither sourceId nor category when nothing is narrowed', () => {
    const plan = planMarkAllRead(rows, '', null);
    expect(plan.kind === 'bulk' && Object.keys(plan.body)).toEqual(['upToId']);
  });
});

it('does nothing with no rows loaded', async () => {
  const { call, calls } = fakeCall();
  expect(planMarkAllRead([], '', null)).toEqual({ kind: 'none' });
  expect((await markAllRead([], 'q', null, call)).marked).toBe(0);
  expect(calls).toEqual([]);
});
