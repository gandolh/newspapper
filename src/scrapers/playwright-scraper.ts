import { chromium, Browser } from 'playwright';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

interface Selectors {
  title?: string;
  author?: string;
  date?: string;
  body?: string;
  image?: string;
}

interface ScrapedArticle {
  url: string;
  title: string | null;
  author: string | null;
  publishedAt: string | null;
  body: string | null;
  image: string | null;
}

export class PlaywrightScraper {
  private browser: Browser | null = null;

  async init(): Promise<void> {
    if (!this.browser) {
      logger.debug('Launching browser...');
      this.browser = await chromium.launch({ headless: true });
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrape(url: string, selectors: Selectors = {}): Promise<ScrapedArticle> {
    await this.init();

    const context = await this.browser!.newContext({
      userAgent: config.scraping.userAgent
    });

    const page = await context.newPage();

    try {
      logger.debug(`Navigating to ${url}`);

      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: config.scraping.timeout
      });

      await page.waitForTimeout(2000);

      const article = await page.evaluate((sels: Selectors) => {
        const extractText = (selector?: string): string | null => {
          if (!selector) return null;
          const element = document.querySelector(selector);
          return element ? (element.textContent || '').trim() : null;
        };

        const extractDate = (selector?: string): string | null => {
          if (!selector) return null;
          const element = document.querySelector(selector);
          if (!element) return null;
          const datetime = element.getAttribute('datetime') || (element.textContent || '').trim();
          try {
            return new Date(datetime).toISOString();
          } catch {
            return null;
          }
        };

        const extractBody = (selector?: string): string | null => {
          if (!selector) {
            const possibleSelectors = ['article', '[role="article"]', '.article-content', '.post-content', 'main article', '.entry-content'];
            for (const sel of possibleSelectors) {
              const element = document.querySelector(sel);
              if (element) {
                return (element.textContent || '').replace(/\s+/g, ' ').trim();
              }
            }
            return null;
          }
          const element = document.querySelector(selector);
          return element ? (element.textContent || '').replace(/\s+/g, ' ').trim() : null;
        };

        const extractImage = (selector?: string): string | null => {
          if (!selector) {
            const possibleSelectors = ['meta[property="og:image"]', 'meta[name="twitter:image"]', 'article img', '.article-image img'];
            for (const sel of possibleSelectors) {
              const element = document.querySelector(sel);
              if (element) {
                const src = element.getAttribute('content') || element.getAttribute('src');
                if (src) return src;
              }
            }
            return null;
          }
          const element = document.querySelector(selector);
          if (!element) return null;
          return element.getAttribute('content') || element.getAttribute('src');
        };

        return {
          title: extractText(sels.title || 'h1, title'),
          author: extractText(sels.author),
          publishedAt: extractDate(sels.date),
          body: extractBody(sels.body),
          image: extractImage(sels.image)
        };
      }, selectors);

      const result: ScrapedArticle = { ...article, url };

      if (!result.title || !result.body) {
        throw new Error('Failed to extract title or body');
      }

      return result;
    } finally {
      await context.close();
    }
  }
}

export const playwrightScraper = new PlaywrightScraper();
