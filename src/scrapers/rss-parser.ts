import Parser from 'rss-parser';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

interface RSSArticle {
  url: string | undefined;
  title: string | undefined;
  author: string | null;
  publishedAt: string | null;
  body: string | null;
  image: string | null;
  metadata: {
    guid: string | undefined;
    categories: string[];
  };
}

interface ParsedFeed {
  feedTitle: string | undefined;
  feedUrl: string;
  articles: RSSArticle[];
}

type RSSItem = {
  link?: string;
  title?: string;
  creator?: string;
  author?: string;
  pubDate?: string;
  guid?: string;
  categories?: string[];
  content?: string;
  contentSnippet?: string;
  description?: string;
  enclosure?: { type?: string; url?: string };
  'content:encoded'?: string;
  'media:content'?: { $?: { url?: string } };
  'media:thumbnail'?: { $?: { url?: string } };
};

export class RSSFeedParser {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: config.scraping.timeout,
      headers: {
        'User-Agent': config.scraping.userAgent
      }
    });
  }

  async parse(feedUrl: string): Promise<ParsedFeed> {
    try {
      logger.debug(`Parsing RSS feed: ${feedUrl}`);

      const feed = await this.parser.parseURL(feedUrl);

      const articles: RSSArticle[] = (feed.items as RSSItem[]).map(item => ({
        url: item.link,
        title: item.title,
        author: item.creator || item.author || null,
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : null,
        body: this.extractContent(item),
        image: this.extractImage(item),
        metadata: {
          guid: item.guid,
          categories: item.categories || []
        }
      }));

      return {
        feedTitle: feed.title,
        feedUrl,
        articles: articles.filter(a => a.title && a.url)
      };
    } catch (error) {
      logger.error(`Failed to parse RSS feed ${feedUrl}: ${(error as Error).message}`);
      throw error;
    }
  }

  extractContent(item: RSSItem): string | null {
    if (item.content) return this.stripHtml(item.content);
    if (item.contentSnippet) return item.contentSnippet;
    if (item['content:encoded']) return this.stripHtml(item['content:encoded']);
    if (item.description) return this.stripHtml(item.description);
    return null;
  }

  extractImage(item: RSSItem): string | null {
    if (item.enclosure?.type?.startsWith('image/')) return item.enclosure.url || null;
    if (item['media:content']?.$?.url) return item['media:content'].$.url;
    if (item['media:thumbnail']?.$?.url) return item['media:thumbnail'].$.url;

    const imageRegex = /<img[^>]+src="([^">]+)"/i;
    const content = item.content || item['content:encoded'] || item.description || '';
    const match = content.match(imageRegex);
    return match ? match[1] : null;
  }

  stripHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const rssFeedParser = new RSSFeedParser();
