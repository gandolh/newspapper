import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDb, type DB } from '../storage/db.js';
import { readerRefreshMinutes, readerRetentionDays } from './config.js';
import { startReaderSchedule } from './schedule.js';
import type { RefreshResult } from './refresh.js';

let tmp: string;
let db: DB;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'np-schedule-'));
  db = getDb(join(tmp, 'test.db')); // no sources: each run is quick and offline
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  db.close();
  rmSync(tmp, { recursive: true, force: true });
});

describe('startReaderSchedule', () => {
  it('runs first after the short delay, then every interval, and stop clears every timer', async () => {
    const results: RefreshResult[] = [];
    const schedule = startReaderSchedule(db, {
      intervalMinutes: 30,
      firstRunDelayMs: 5_000,
      onResult: (r) => results.push(r),
    });
    expect(schedule.active).toBe(true);
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(4_999);
    expect(results).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(results).toEqual([{ newCount: 0, errors: [], purged: 0 }]);

    await vi.advanceTimersByTimeAsync(30 * 60_000 - 1);
    expect(results).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(results).toHaveLength(2);

    await schedule.stop();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(3 * 30 * 60_000);
    expect(results).toHaveLength(2);
    await schedule.stop(); // idempotent
  });

  it('is off at 0 minutes: no timer is ever set', async () => {
    const schedule = startReaderSchedule(db, { intervalMinutes: 0 });
    expect(schedule.active).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    await schedule.stop();
  });

  it('reads READER_REFRESH_MINUTES when no interval is given', async () => {
    vi.stubEnv('READER_REFRESH_MINUTES', '0');
    try {
      const schedule = startReaderSchedule(db);
      expect(schedule.active).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('unrefs its timer, so it can never keep the process alive', () => {
    const spy = vi.spyOn(globalThis, 'setTimeout');
    const schedule = startReaderSchedule(db, { intervalMinutes: 30 });
    const timer = spy.mock.results[0]!.value as NodeJS.Timeout;
    expect(timer.hasRef()).toBe(false);
    spy.mockRestore();
    void schedule.stop();
  });

  it('takes a DB getter, and reports a failing run without stopping the loop', async () => {
    const errors: unknown[] = [];
    let calls = 0;
    const schedule = startReaderSchedule(
      () => {
        calls += 1;
        if (calls === 1) throw new Error('db gone');
        return db;
      },
      { intervalMinutes: 1, firstRunDelayMs: 0, onError: (e) => errors.push(e) },
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(errors).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls).toBe(2);
    expect(errors).toHaveLength(1);
    await schedule.stop();
  });
});

describe('reader env config', () => {
  it('defaults both to 30 and falls back on junk', () => {
    expect(readerRefreshMinutes({})).toBe(30);
    expect(readerRetentionDays({})).toBe(30);
    expect(readerRefreshMinutes({ READER_REFRESH_MINUTES: '' })).toBe(30);
    expect(readerRefreshMinutes({ READER_REFRESH_MINUTES: 'soon' })).toBe(30);
    expect(readerRetentionDays({ READER_RETENTION_DAYS: '-1' })).toBe(30);
  });

  it('accepts 0 (off) and other values', () => {
    expect(readerRefreshMinutes({ READER_REFRESH_MINUTES: '0' })).toBe(0);
    expect(readerRefreshMinutes({ READER_REFRESH_MINUTES: '15' })).toBe(15);
    expect(readerRetentionDays({ READER_RETENTION_DAYS: '7' })).toBe(7);
  });
});
