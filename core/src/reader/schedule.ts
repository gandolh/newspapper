import type { DB } from '../storage/db.js';
import { log } from '../util/logger.js';
import { readerRefreshMinutes } from './config.js';
import { refreshSources, type RefreshOptions, type RefreshResult } from './refresh.js';

/** The first background refresh waits this long after boot, so it does not
 * compete with startup. */
export const READER_FIRST_RUN_DELAY_MS = 15_000;

/** `setTimeout`'s ceiling; a longer delay would fire at once. */
const MAX_TIMER_MS = 2_147_483_647;

export interface ReaderScheduleOptions {
  /** Minutes between runs. Default `READER_REFRESH_MINUTES`, else 30; `0` = off. */
  intervalMinutes?: number;
  /** Delay before the first run. Default 15 s. */
  firstRunDelayMs?: number;
  /** Passed to every run. The schedule supplies its own `signal`. */
  refresh?: Omit<RefreshOptions, 'signal'>;
  /** Called after each completed run. */
  onResult?: (result: RefreshResult) => void;
  /** Called when a run rejects (say, the DB is gone). Default: log a warning. */
  onError?: (err: unknown) => void;
}

export interface ReaderSchedule {
  /** False when the interval is `0`: no timer was ever set. */
  readonly active: boolean;
  /**
   * Stop the loop: clears the pending timer, aborts the schedule's own run if
   * one is in flight, and resolves once that run has settled. Safe to call
   * more than once. Await it before closing the DB.
   */
  stop(): Promise<void>;
}

/**
 * The Reader's background refresh: the first run after `firstRunDelayMs`,
 * then one every `intervalMinutes`, measured from the end of the previous run
 * so runs never overlap. A run that finds a refresh already going (a manual
 * one) joins it, by `refreshSources`'s single-flight.
 *
 * `db` may be a getter, so the API can hand over its lazily (re)opened
 * connection. This assumes one API process (true today: the container runs a
 * single `npm run start`): two would each run a loop against the same file.
 *
 * Every timer is `unref`'d, and `stop` clears it, so nothing here keeps a
 * process (or vitest) alive.
 */
export function startReaderSchedule(
  db: DB | (() => DB),
  options: ReaderScheduleOptions = {},
): ReaderSchedule {
  const minutes = options.intervalMinutes ?? readerRefreshMinutes();
  if (!(minutes > 0)) return { active: false, stop: async () => {} };

  const intervalMs = Math.min(minutes * 60_000, MAX_TIMER_MS);
  const firstRunMs = Math.min(
    Math.max(0, options.firstRunDelayMs ?? READER_FIRST_RUN_DELAY_MS),
    MAX_TIMER_MS,
  );
  const onError =
    options.onError ??
    ((err: unknown) =>
      log.warn('reader refresh failed:', err instanceof Error ? err.message : String(err)));
  const controller = new AbortController();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> | null = null;

  const schedule = (ms: number) => {
    if (stopped) return;
    timer = setTimeout(tick, ms);
    timer.unref();
  };

  const run = async () => {
    try {
      const handle = typeof db === 'function' ? db() : db;
      const result = await refreshSources(handle, {
        ...options.refresh,
        signal: controller.signal,
      });
      if (!stopped) options.onResult?.(result);
    } catch (err) {
      if (!stopped) onError(err);
    }
  };

  function tick() {
    timer = null;
    inFlight = run().finally(() => {
      inFlight = null;
      schedule(intervalMs);
    });
  }

  schedule(firstRunMs);

  return {
    active: true,
    async stop() {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
      controller.abort();
      await inFlight;
    },
  };
}
