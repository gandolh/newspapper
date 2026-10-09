import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from './concurrency.js';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('mapWithConcurrency', () => {
  it('keeps input order and never runs more than `limit` at once', async () => {
    let running = 0;
    let peak = 0;
    const out = await mapWithConcurrency([30, 5, 20, 1, 10, 2], 4, async (ms) => {
      running += 1;
      peak = Math.max(peak, running);
      await delay(ms);
      running -= 1;
      return ms * 2;
    });
    expect(out).toEqual([60, 10, 40, 2, 20, 4]);
    expect(peak).toBe(4);
  });

  it('handles an empty list', async () => {
    expect(await mapWithConcurrency([], 4, async (x) => x)).toEqual([]);
  });
});
