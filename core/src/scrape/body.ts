import { readCapped, safeFetch, type SafeFetchDeps } from './safe-url.js';

/**
 * The article body behind a feed item's link, as plain text, or `''`.
 *
 * Never throws, so one bad item can't fail a whole search. The link is chosen
 * by whoever controls the feed, so it goes through `safeFetch`: public http(s)
 * addresses only, every redirect hop re-checked, the body capped. A refused URL
 * is just another `''`.
 */
export async function fetchBody(
  url: string,
  userAgent: string,
  timeoutMs: number,
  deps: SafeFetchDeps = {},
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await safeFetch(
      url,
      {
        headers: { 'User-Agent': userAgent, Accept: 'text/html,application/xhtml+xml' },
        signal: controller.signal,
      },
      deps,
    );
    if (!res?.ok) return '';
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('html')) {
      await res.body?.cancel().catch(() => {});
      return '';
    }
    return stripHtml(await readCapped(res));
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}
