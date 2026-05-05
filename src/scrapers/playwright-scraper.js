import { chromium } from 'playwright';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export class PlaywrightScraper {
  constructor() {
    this.browser = null;
  }

  async init() {
    if (!this.browser) {
      logger.debug('Launching browser...');
      this.browser = await chromium.launch({
        headless: true
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrape(url, selectors = {}) {
    await this.init();
    
    const context = await this.browser.newContext({
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

      const article = await page.evaluate((selectors) => {
        const extractText = (selector) => {
          if (!selector) return null;
          const element = document.querySelector(selector);
          return element ? element.textContent.trim() : null;
        };

        const extractDate = (selector) => {
          if (!selector) return null;
          const element = document.querySelector(selector);
          if (!element) return null;
          
          const datetime = element.getAttribute('datetime') || element.textContent.trim();
          try {
            return new Date(datetime).toISOString();
          } catch {
            return null;
          }
        };

        const extractBody = (selector) => {
          if (!selector) {
            const possibleSelectors = [
              'article',
              '[role="article"]',
              '.article-content',
              '.post-content',
              'main article',
              '.entry-content'
            ];
            
            for (const sel of possibleSelectors) {
              const element = document.querySelector(sel);
              if (element) {
                return element.textContent.replace(/\s+/g, ' ').trim();
              }
            }
            return null;
          }
          
          const element = document.querySelector(selector);
          return element ? element.textContent.replace(/\s+/g, ' ').trim() : null;
        };

        const extractImage = (selector) => {
          if (!selector) {
            const possibleSelectors = [
              'meta[property="og:image"]',
              'meta[name="twitter:image"]',
              'article img',
              '.article-image img'
            ];
            
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
          title: extractText(selectors.title || 'h1, title'),
          author: extractText(selectors.author),
          publishedAt: extractDate(selectors.date),
          body: extractBody(selectors.body),
          image: extractImage(selectors.image)
        };
      }, selectors);

      article.url = url;

      if (!article.title || !article.body) {
        throw new Error('Failed to extract title or body');
      }

      return article;
    } finally {
      await context.close();
    }
  }
}

export const playwrightScraper = new PlaywrightScraper();
