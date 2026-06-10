import type { SourceConfig, Article } from '../types.js';
import { getDb } from '../storage/db.js';
import { upsertArticles, articlesForDate } from '../storage/articles.js';
import { fetchFeed } from './rss.js';
import { fetchBody } from './body.js';

const DEFAULT_USER_AGENT = 'Newspapper/3.0';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_PER_SOURCE = 10;

export interface ScrapeProgressEvent {
  sourceId: string;
  status: 'fetching' | 'done' | 'error';
  count?: number;
  error?: string;
}

export interface ScrapeOptions {
  date: string;
  maxPerSource?: number;
  dbPath?: string;
  userAgent?: string;
  requestTimeoutMs?: number;
  onProgress?: (e: ScrapeProgressEvent) => void;
}

export interface ScrapeResult {
  articles: Article[];
  errors: Array<{ sourceId: string; error: string }>;
}

/**
 * Scrape all enabled sources, filter items to `date`, upsert into the DB.
 * Per-source failures are collected into `errors` and do not abort the run.
 * Returns all of today's articles from the DB after upserting (accumulates across re-runs).
 */
export async function scrape(sources: SourceConfig[], opts: ScrapeOptions): Promise<ScrapeResult> {
  const {
    date,
    maxPerSource = DEFAULT_MAX_PER_SOURCE,
    dbPath,
    userAgent = DEFAULT_USER_AGENT,
    requestTimeoutMs = DEFAULT_TIMEOUT_MS,
    onProgress,
  } = opts;

  const enabled = sources.filter((s) => s.enabled);
  const errors: Array<{ sourceId: string; error: string }> = [];

  const db = getDb(dbPath);

  try {
    for (const source of enabled) {
      onProgress?.({ sourceId: source.id, status: 'fetching' });

      let items;
      try {
        items = await fetchFeed(source.rss, userAgent, requestTimeoutMs);
      } catch (err) {
        const error = (err as Error).message;
        errors.push({ sourceId: source.id, error });
        onProgress?.({ sourceId: source.id, status: 'error', error });
        continue;
      }

      // Keep only items published on the target date
      const todaysItems = items
        .filter((i) => i.publishedAt.slice(0, 10) === date)
        .slice(0, maxPerSource);

      // Fetch body for each item
      const rows = await Promise.all(
        todaysItems.map(async (item) => {
          const body = await fetchBody(item.url, userAgent, requestTimeoutMs);
          return {
            source_id: source.id,
            source_name: source.name,
            url: item.url,
            title: item.title,
            body: body || item.summary,
            published_at: item.publishedAt,
          };
        }),
      );

      upsertArticles(db, rows);
      onProgress?.({ sourceId: source.id, status: 'done', count: rows.length });
    }

    // Return all articles for the date (accumulated across re-runs)
    const articles = articlesForDate(db, date);
    return { articles, errors };
  } finally {
    db.close();
  }
}

export interface PingResult {
  ok: boolean;
  itemCount?: number;
  error?: string;
  latencyMs: number;
}

/**
 * Fetch and parse a feed to test connectivity. Never throws.
 */
export async function pingSource(
  src: SourceConfig,
  opts: { userAgent?: string; requestTimeoutMs?: number } = {},
): Promise<PingResult> {
  const userAgent = opts.userAgent ?? DEFAULT_USER_AGENT;
  const requestTimeoutMs = opts.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const start = Date.now();
  try {
    const items = await fetchFeed(src.rss, userAgent, requestTimeoutMs);
    return { ok: true, itemCount: items.length, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: (err as Error).message, latencyMs: Date.now() - start };
  }
}

// ---- Legacy compatibility ----
export type { ScrapeOptions as LegacyScrapeOptions };

/** @deprecated */
export type Source = SourceConfig;
