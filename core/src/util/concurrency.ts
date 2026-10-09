/**
 * `Promise.all(items.map(fn))` with at most `limit` running at a time; results
 * keep the input order.
 *
 * Shared by Search (`scrape/index.ts`), which fetches every enabled feed plus
 * each item's page, and the Reader's refresh (`reader/refresh.ts`), which
 * fetches only the feeds. Both cap at four sources at once: polite to the
 * hosts, and it bounds memory.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
