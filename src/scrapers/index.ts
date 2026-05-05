import { httpScraper } from './http-scraper.js';
import { playwrightScraper } from './playwright-scraper.js';
import { rssFeedParser } from './rss-parser.js';
import { logger } from '../utils/logger.js';
import type { Source } from '../storage/sources.js';

export class ScraperOrchestrator {
  async scrapeArticle(url: string, source: Source) {
    const scraperType = source.scraperType || 'http';

    try {
      if (scraperType === 'playwright') {
        logger.debug(`Using Playwright scraper for ${url}`);
        return await playwrightScraper.scrape(url, source.selectors);
      } else {
        logger.debug(`Using HTTP scraper for ${url}`);
        return await httpScraper.scrape(url, source.selectors);
      }
    } catch (error) {
      if (scraperType === 'http') {
        logger.warn(`HTTP scraper failed, falling back to Playwright for ${url}`);
        try {
          return await playwrightScraper.scrape(url, source.selectors);
        } catch (fallbackError) {
          logger.error(`Both scrapers failed for ${url}`);
          throw fallbackError;
        }
      }
      throw error;
    }
  }

  async scrapeFromRSS(feedUrl: string) {
    return await rssFeedParser.parse(feedUrl);
  }

  async cleanup(): Promise<void> {
    await playwrightScraper.close();
  }
}

export const scraperOrchestrator = new ScraperOrchestrator();
