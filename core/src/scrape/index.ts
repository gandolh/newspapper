import type { SourceConfig } from '../types.js';
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

/**
 * A feed item that matched at least one keyword. Not persisted — the caller
 * decides which of these (if any) become a saved `Article` via `saveArticle`.
 */
export interface ScrapedArticle {
  sourceId: string;
  sourceName: string;
  guid: string;
  title: string;
  url: string;
  body: string;
  publishedAt: string;
  /** Total keyword occurrences across title + body. Higher ranks first. */
  matchCount: number;
}

export interface SearchOptions {
  /** Case-insensitive substrings to match, OR'd together. At least one is required. */
  keywords: string[];
  maxPerSource?: number;
  userAgent?: string;
  requestTimeoutMs?: number;
  onProgress?: (e: ScrapeProgressEvent) => void;
}

export interface SearchResult {
  articles: ScrapedArticle[];
  errors: Array<{ sourceId: string; error: string }>;
}

/** Case-insensitive occurrence count of `keyword` in `text`. */
function countOccurrences(text: string, keyword: string): number {
  if (!keyword) return 0;
  const haystack = text.toLowerCase();
  const needle = keyword.toLowerCase();
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    count += 1;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}

/** Sum of keyword occurrences across title + body — the OR ranking score. */
function matchScore(title: string, body: string, keywords: string[]): number {
  const haystack = `${title}\n${body}`;
  return keywords.reduce((sum, kw) => sum + countOccurrences(haystack, kw), 0);
}

/**
 * Fetch the enabled sources and return items matching any of `keywords`
 * (case-insensitive substring, across title + body), ranked by match count.
 * Nothing is persisted — saving a result is a separate, explicit step.
 */
export async function searchArticles(
  sources: SourceConfig[],
  opts: SearchOptions,
): Promise<SearchResult> {
  const {
    keywords,
    maxPerSource = DEFAULT_MAX_PER_SOURCE,
    userAgent = DEFAULT_USER_AGENT,
    requestTimeoutMs = DEFAULT_TIMEOUT_MS,
    onProgress,
  } = opts;

  const cleanKeywords = keywords.map((k) => k.trim()).filter(Boolean);
  if (cleanKeywords.length === 0) {
    throw new Error('At least one keyword is required');
  }

  const enabled = sources.filter((s) => s.enabled);
  const errors: Array<{ sourceId: string; error: string }> = [];
  const matches: ScrapedArticle[] = [];

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

    const candidates = items.slice(0, maxPerSource);
    const rows = await Promise.all(
      candidates.map(async (item) => {
        const body = (await fetchBody(item.url, userAgent, requestTimeoutMs)) || item.summary;
        return { item, body };
      }),
    );

    let sourceMatches = 0;
    for (const { item, body } of rows) {
      const score = matchScore(item.title, body, cleanKeywords);
      if (score === 0) continue;
      matches.push({
        sourceId: source.id,
        sourceName: source.name,
        guid: item.url,
        title: item.title,
        url: item.url,
        body,
        publishedAt: item.publishedAt,
        matchCount: score,
      });
      sourceMatches += 1;
    }

    onProgress?.({ sourceId: source.id, status: 'done', count: sourceMatches });
  }

  matches.sort((a, b) => b.matchCount - a.matchCount || (a.publishedAt < b.publishedAt ? 1 : -1));
  return { articles: matches, errors };
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
