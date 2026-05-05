import axios from 'axios';
import * as cheerio from 'cheerio';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export class HttpScraper {
  constructor() {
    this.client = axios.create({
      timeout: config.scraping.timeout,
      headers: {
        'User-Agent': config.scraping.userAgent
      }
    });
  }

  async scrape(url, selectors = {}) {
    let retries = 0;
    let lastError;

    while (retries < config.scraping.maxRetries) {
      try {
        logger.debug(`Fetching ${url} (attempt ${retries + 1})`);
        
        const response = await this.client.get(url);
        const $ = cheerio.load(response.data);

        const article = {
          url,
          title: this.extractText($, selectors.title || 'h1, title'),
          author: this.extractText($, selectors.author),
          publishedAt: this.extractDate($, selectors.date),
          body: this.extractBody($, selectors.body),
          image: this.extractImage($, selectors.image, url)
        };

        if (!article.title || !article.body) {
          throw new Error('Failed to extract title or body');
        }

        return article;
      } catch (error) {
        lastError = error;
        retries++;
        
        if (retries < config.scraping.maxRetries) {
          const delay = Math.pow(2, retries) * 1000;
          logger.debug(`Retry in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to scrape ${url} after ${retries} attempts: ${lastError.message}`);
  }

  extractText($, selector) {
    if (!selector) return null;
    
    const element = $(selector).first();
    if (!element.length) return null;
    
    return element.text().trim();
  }

  extractDate($, selector) {
    if (!selector) return null;
    
    const element = $(selector).first();
    if (!element.length) return null;
    
    const datetime = element.attr('datetime') || element.text().trim();
    
    try {
      return new Date(datetime).toISOString();
    } catch {
      return null;
    }
  }

  extractBody($, selector) {
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
        const element = $(sel).first();
        if (element.length) {
          return this.cleanText(element.text());
        }
      }
      
      return null;
    }
    
    const element = $(selector).first();
    if (!element.length) return null;
    
    return this.cleanText(element.text());
  }

  extractImage($, selector, baseUrl) {
    if (!selector) {
      const possibleSelectors = [
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'article img',
        '.article-image img'
      ];
      
      for (const sel of possibleSelectors) {
        const element = $(sel).first();
        if (element.length) {
          const src = element.attr('content') || element.attr('src');
          if (src) {
            return this.resolveUrl(src, baseUrl);
          }
        }
      }
      
      return null;
    }
    
    const element = $(selector).first();
    if (!element.length) return null;
    
    const src = element.attr('content') || element.attr('src');
    return src ? this.resolveUrl(src, baseUrl) : null;
  }

  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  }

  resolveUrl(url, baseUrl) {
    if (url.startsWith('http')) {
      return url;
    }
    
    try {
      const base = new URL(baseUrl);
      return new URL(url, base.origin).href;
    } catch {
      return url;
    }
  }
}

export const httpScraper = new HttpScraper();
