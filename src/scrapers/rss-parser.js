import Parser from 'rss-parser';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export class RSSFeedParser {
  constructor() {
    this.parser = new Parser({
      timeout: config.scraping.timeout,
      headers: {
        'User-Agent': config.scraping.userAgent
      }
    });
  }

  async parse(feedUrl) {
    try {
      logger.debug(`Parsing RSS feed: ${feedUrl}`);
      
      const feed = await this.parser.parseURL(feedUrl);
      
      const articles = feed.items.map(item => ({
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
        feedUrl: feedUrl,
        articles: articles.filter(a => a.title && a.url)
      };
    } catch (error) {
      logger.error(`Failed to parse RSS feed ${feedUrl}: ${error.message}`);
      throw error;
    }
  }

  extractContent(item) {
    if (item.content) {
      return this.stripHtml(item.content);
    }
    
    if (item.contentSnippet) {
      return item.contentSnippet;
    }
    
    if (item['content:encoded']) {
      return this.stripHtml(item['content:encoded']);
    }
    
    if (item.description) {
      return this.stripHtml(item.description);
    }
    
    return null;
  }

  extractImage(item) {
    if (item.enclosure && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
      return item.enclosure.url;
    }
    
    if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
      return item['media:content'].$.url;
    }
    
    if (item['media:thumbnail'] && item['media:thumbnail'].$ && item['media:thumbnail'].$.url) {
      return item['media:thumbnail'].$.url;
    }
    
    const imageRegex = /<img[^>]+src="([^">]+)"/i;
    const content = item.content || item['content:encoded'] || item.description || '';
    const match = content.match(imageRegex);
    
    return match ? match[1] : null;
  }

  stripHtml(html) {
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
