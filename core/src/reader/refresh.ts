import type { DB } from '../storage/db.js';
import { fetchFeedConditional, type FeedFetchResult } from '../scrape/rss.js';
import type { SafeFetchDeps } from '../scrape/safe-url.js';
import type { ScrapeProgressEvent } from '../scrape/index.js';
import {
  listRefreshTargets,
  recordSourceError,
  recordSourceFetched,
  type RefreshTarget,
} from '../storage/sources.js';
import { insertFeedItems, purgeFeedItems, KEEP_NEWEST_PER_SOURCE } from '../storage/feed-items.js';
import { mapWithConcurrency } from '../util/concurrency.js';
import { readerRetentionDays } from './config.js';

const DEFAULT_USER_AGENT = 'Newspapper/3.0';
const DEFAULT_TIMEOUT_MS = 30_000;

/** Feeds fetched at once, the same cap Search uses. */
const SOURCE_CONCURRENCY = 4;

/** Per-source progress. The same shape Search streams, so the UI's progress
 * handling is shared: `count` on `done` is the number of new items. */
export type RefreshProgressEvent = ScrapeProgressEvent;

export interface RefreshOptions {
  /** Refresh just this source (if it exists and is enabled). Default: every
   * enabled source. */
  sourceId?: string;
  onProgress?: (e: RefreshProgressEvent) => void;
  userAgent?: string;
  requestTimeoutMs?: number;
  /** Purge window. Default `READER_RETENTION_DAYS`, else 30. */
  retentionDays?: number;
  /** Items each source keeps past the window. Default 50. */
  keepPerSource?: number;
  /** Stops the run: no further source starts, in-flight fetches abort, and
   * nothing aborted is recorded as a source error. */
  signal?: AbortSignal;
  /** Injected fetch and DNS, for tests. */
  deps?: SafeFetchDeps;
  /** Injected clock, for tests. */
  now?: () => Date;
}

export interface RefreshResult {
  /** Items inserted across every source. */
  newCount: number;
  errors: Array<{ sourceId: string; error: string }>;
  /** Items the post-refresh purge deleted. */
  purged: number;
}

interface Running {
  promise: Promise<RefreshResult>;
  listeners: Set<(e: RefreshProgressEvent) => void>;
}

/** The refresh in flight per connection. A WeakMap so a closed test DB takes
 * its entry with it. */
const running = new WeakMap<DB, Running>();

/**
 * Fetch the enabled sources' feeds (four at a time) and store their new items,
 * then purge. Only feed XML is fetched, never an item's page.
 *
 * Single-flight: while a refresh runs on `db`, any further call joins it and
 * gets the same promise, whatever its options; its `onProgress`, if given,
 * receives the running refresh's events from that point on. So a manual
 * refresh during a background one does not start a second.
 *
 * Never rejects for a source's failure: each one is recorded on its row
 * (`last_error`) and in `errors`, and the others carry on.
 */
export function refreshSources(db: DB, opts: RefreshOptions = {}): Promise<RefreshResult> {
  const current = running.get(db);
  if (current) {
    if (opts.onProgress) current.listeners.add(opts.onProgress);
    return current.promise;
  }
  const listeners = new Set<(e: RefreshProgressEvent) => void>();
  if (opts.onProgress) listeners.add(opts.onProgress);
  const emit = (e: RefreshProgressEvent) => {
    for (const listener of listeners) {
      try {
        listener(e);
      } catch {
        // A listener that throws (an SSE client gone away) must not stop the run.
      }
    }
  };
  const promise = runRefresh(db, opts, emit).finally(() => running.delete(db));
  running.set(db, { promise, listeners });
  return promise;
}

/** True while a refresh is running on `db`. */
export function isRefreshing(db: DB): boolean {
  return running.has(db);
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function runRefresh(
  db: DB,
  opts: RefreshOptions,
  emit: (e: RefreshProgressEvent) => void,
): Promise<RefreshResult> {
  const userAgent = opts.userAgent ?? DEFAULT_USER_AGENT;
  const timeoutMs = opts.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = opts.now ?? (() => new Date());
  const { signal } = opts;
  const errors: RefreshResult['errors'] = [];

  const fail = (sourceId: string, error: string) => {
    errors.push({ sourceId, error });
    try {
      recordSourceError(db, sourceId, error);
    } catch {
      // The source was deleted, or the DB closed under us: nothing to record on.
    }
    emit({ sourceId, status: 'error', error });
  };

  async function refreshOne(source: RefreshTarget): Promise<number> {
    if (signal?.aborted) return 0;
    emit({ sourceId: source.id, status: 'fetching' });

    let result: FeedFetchResult;
    try {
      result = await fetchFeedConditional(
        source.rss,
        { userAgent, timeoutMs, etag: source.etag, lastModified: source.lastModified, signal },
        opts.deps,
      );
    } catch (err) {
      if (signal?.aborted) return 0;
      fail(source.id, messageOf(err));
      return 0;
    }

    const fetchedAt = now().toISOString();
    try {
      let inserted = 0;
      db.transaction(() => {
        // A 304 parses nothing: there is nothing new by the server's own word.
        if (result.status === 'ok') {
          inserted = insertFeedItems(db, source.id, result.items, fetchedAt);
        }
        recordSourceFetched(db, source.id, {
          fetchedAt,
          etag: result.etag,
          lastModified: result.lastModified,
        });
      })();
      emit({ sourceId: source.id, status: 'done', count: inserted });
      return inserted;
    } catch (err) {
      fail(source.id, messageOf(err));
      return 0;
    }
  }

  const targets = listRefreshTargets(db, opts.sourceId);
  const counts = await mapWithConcurrency(targets, SOURCE_CONCURRENCY, refreshOne);
  const newCount = counts.reduce((sum, n) => sum + n, 0);
  if (signal?.aborted) return { newCount, errors, purged: 0 };

  const purged = purgeFeedItems(db, {
    retentionDays: opts.retentionDays ?? readerRetentionDays(),
    keepPerSource: opts.keepPerSource ?? KEEP_NEWEST_PER_SOURCE,
    now: now(),
  });

  return { newCount, errors, purged };
}
