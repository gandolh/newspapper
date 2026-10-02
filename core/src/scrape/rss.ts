import Parser from 'rss-parser';
import { readCapped, safeFetch, type SafeFetchDeps } from './safe-url.js';

export interface RssItem {
  title: string;
  url: string;
  summary: string;
  publishedAt: string;
}

/** Feeds are XML and a truncated one won't parse, so they get more room than
 * an article body. Still bounded: a hostile feed cannot fill the container. */
const MAX_FEED_BYTES = 10 * 1024 * 1024;

/**
 * A feed's items. The feed URL comes from `POST /api/sources`, so it is fetched
 * the same guarded way as item bodies (`safe-url.ts`): rss-parser's own
 * `parseURL` would follow any redirect to any address and read any size. Throws
 * on a refused URL, a failed request or an unparseable feed, as before.
 */
export async function fetchFeed(
  url: string,
  userAgent: string,
  timeoutMs: number,
  deps: SafeFetchDeps = {},
): Promise<RssItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let xml: string;
  try {
    const res = await safeFetch(
      url,
      {
        headers: {
          'User-Agent': userAgent,
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        },
        signal: controller.signal,
      },
      deps,
    );
    if (!res) throw new Error(`Feed URL is not a public http(s) address: ${url}`);
    if (!res.ok) throw new Error(`Feed request failed with status ${res.status}`);
    xml = await readCapped(res, MAX_FEED_BYTES);
  } finally {
    clearTimeout(timer);
  }
  const feed = await new Parser().parseString(xml);
  const items: RssItem[] = [];
  for (const item of feed.items ?? []) {
    if (!item.link || !item.title) continue;
    const summary =
      (item.contentSnippet as string | undefined) ??
      (item.content as string | undefined) ??
      (item.summary as string | undefined) ??
      '';
    const publishedAt = item.isoDate ?? (item.pubDate ? new Date(item.pubDate).toISOString() : '');
    if (!publishedAt) continue;
    items.push({
      title: item.title,
      url: item.link,
      summary,
      publishedAt,
    });
  }
  return items;
}
