import { httpScraper } from './http-scraper.js';
import { rssFeedParser } from './rss-parser.js';
import { logger } from '../utils/logger.js';
import type { Source } from '../storage/sources.js';

export class ScraperOrchestrator {
  async scrapeArticle(url: string, source: Source) {
    logger.debug(`Using HTTP scraper for ${url}`);
    return await httpScraper.scrape(url, source.selectors);
  }

  async scrapeFromRSS(feedUrl: string) {
    return await rssFeedParser.parse(feedUrl);
  }

  async cleanup(): Promise<void> {}
}

export const scraperOrchestrator = new ScraperOrchestrator();
