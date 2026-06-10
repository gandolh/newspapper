import Parser from 'rss-parser';

export interface RssItem {
  title: string;
  url: string;
  summary: string;
  publishedAt: string;
}

export async function fetchFeed(url: string, userAgent: string, timeoutMs: number): Promise<RssItem[]> {
  const parser = new Parser({
    timeout: timeoutMs,
    headers: { 'User-Agent': userAgent },
  });
  const feed = await parser.parseURL(url);
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
