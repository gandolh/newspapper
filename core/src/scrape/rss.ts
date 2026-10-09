import Parser from 'rss-parser';
import { readCapped, safeFetch, type SafeFetchDeps } from './safe-url.js';

export interface RssItem {
  title: string;
  url: string;
  /** Plain text: rss-parser's `contentSnippet` first. Search falls back to it
   * when an item's page yields no body, so its derivation must not drift. */
  summary: string;
  /**
   * The item's HTML, as the feed gave it (unsanitized). RSS 2.0:
   * `content:encoded`, else `description`. Atom: `content`, else `summary`.
   * `''` when the feed carries none.
   */
  contentHtml: string;
  /** RSS `<author>` / `dc:creator`, Atom `<author><name>`, or `null`. */
  author: string | null;
  /** ISO 8601, or `null` when the feed gives no date, or one that won't parse.
   * The Reader keeps undated items; Search drops them itself. */
  publishedAt: string | null;
}

/** Feeds are XML and a truncated one won't parse, so they get more room than
 * an article body. Still bounded: a hostile feed cannot fill the container. */
const MAX_FEED_BYTES = 10 * 1024 * 1024;

export interface FeedFetchOptions {
  userAgent: string;
  timeoutMs: number;
  /** The `ETag` stored from the last 200, sent as `If-None-Match`. */
  etag?: string | null;
  /** The `Last-Modified` stored from the last 200, sent as `If-Modified-Since`. */
  lastModified?: string | null;
  /** Aborts the request early (the Reader's schedule stopping). */
  signal?: AbortSignal;
}

/**
 * A conditional fetch's outcome. `notModified` is the server's 304: nothing
 * changed since the validators were stored, so there is nothing to parse. It
 * is not an error.
 */
export type FeedFetchResult =
  | { status: 'ok'; items: RssItem[]; etag: string | null; lastModified: string | null }
  | { status: 'notModified'; etag: string | null; lastModified: string | null };

/**
 * A feed's items, fetched conditionally when validators are given. The feed
 * URL comes from `POST /api/sources`, so it is fetched the same guarded way as
 * item bodies (`safe-url.ts`): rss-parser's own `parseURL` would follow any
 * redirect to any address and read any size. Throws on a refused URL, a failed
 * request (any non-2xx other than 304) or an unparseable feed.
 */
export async function fetchFeedConditional(
  url: string,
  opts: FeedFetchOptions,
  deps: SafeFetchDeps = {},
): Promise<FeedFetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onAbort, { once: true });
  if (opts.signal?.aborted) controller.abort();

  const headers: Record<string, string> = {
    'User-Agent': opts.userAgent,
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  };
  if (opts.etag) headers['If-None-Match'] = opts.etag;
  if (opts.lastModified) headers['If-Modified-Since'] = opts.lastModified;

  let xml: string;
  let etag: string | null;
  let lastModified: string | null;
  try {
    const res = await safeFetch(url, { headers, signal: controller.signal }, deps);
    if (!res) throw new Error(`Feed URL is not a public http(s) address: ${url}`);
    // `safeFetch` hands a 304 back as-is: it is a 3xx with no Location.
    if (res.status === 304) {
      await res.body?.cancel().catch(() => {});
      return {
        status: 'notModified',
        etag: res.headers.get('etag') ?? opts.etag ?? null,
        lastModified: res.headers.get('last-modified') ?? opts.lastModified ?? null,
      };
    }
    if (!res.ok) throw new Error(`Feed request failed with status ${res.status}`);
    etag = res.headers.get('etag');
    lastModified = res.headers.get('last-modified');
    xml = await readCapped(res, MAX_FEED_BYTES);
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
  return { status: 'ok', items: await parseFeed(xml), etag, lastModified };
}

/**
 * A feed's items, unconditionally. What Search and the source ping use. Throws
 * on a refused URL, a failed request or an unparseable feed, as before.
 */
export async function fetchFeed(
  url: string,
  userAgent: string,
  timeoutMs: number,
  deps: SafeFetchDeps = {},
): Promise<RssItem[]> {
  const result = await fetchFeedConditional(url, { userAgent, timeoutMs }, deps);
  // Nothing was sent to be "not modified" against, so a 304 here is a server
  // fault, and any non-2xx has always thrown.
  if (result.status === 'notModified') throw new Error('Feed request failed with status 304');
  return result.items;
}

/** A string field, or `undefined` when rss-parser gave an object (an element
 * with attributes) or nothing. */
function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/** The item's date as ISO 8601, or `null`. `new Date(bad).toISOString()`
 * throws, which used to fail a whole feed over one malformed date. */
function isoDate(item: Parser.Item): string | null {
  for (const raw of [item.isoDate, item.pubDate]) {
    if (!raw) continue;
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}

/**
 * rss-parser 3.13 does not put `content:encoded` in `content`: `content` is
 * RSS `description` or Atom `<content>`, `content:encoded` keeps its own key,
 * and Atom `<summary>` lands in `summary`. Hence the explicit order here.
 */
async function parseFeed(xml: string): Promise<RssItem[]> {
  const feed = await new Parser().parseString(xml);
  const items: RssItem[] = [];
  for (const item of feed.items ?? []) {
    if (!item.link || !item.title) continue;
    const fields = item as Parser.Item & Record<string, unknown>;
    const summary =
      (item.contentSnippet as string | undefined) ??
      (item.content as string | undefined) ??
      (item.summary as string | undefined) ??
      '';
    items.push({
      title: item.title,
      url: item.link,
      summary,
      contentHtml:
        text(fields['content:encoded']) ?? text(item.content) ?? text(item.summary) ?? '',
      author: text(item.creator) ?? text(fields['author']) ?? null,
      publishedAt: isoDate(item),
    });
  }
  return items;
}
