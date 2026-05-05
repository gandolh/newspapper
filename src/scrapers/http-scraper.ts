import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
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

export class HttpScraper {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      timeout: config.scraping.timeout,
      headers: {
        'User-Agent': config.scraping.userAgent
      }
    });
  }

  async scrape(url: string, selectors: Selectors = {}): Promise<ScrapedArticle> {
    let retries = 0;
    let lastError: Error = new Error('Unknown error');

    while (retries < config.scraping.maxRetries) {
      try {
        logger.debug(`Fetching ${url} (attempt ${retries + 1})`);

        const response = await this.client.get(url);
        const $ = cheerio.load(response.data as string);

        const article: ScrapedArticle = {
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
        lastError = error as Error;
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

  extractText($: cheerio.CheerioAPI, selector?: string): string | null {
    if (!selector) return null;
    const element = $(selector).first();
    if (!element.length) return null;
    return element.text().trim();
  }

  extractDate($: cheerio.CheerioAPI, selector?: string): string | null {
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

  extractBody($: cheerio.CheerioAPI, selector?: string): string | null {
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

  extractImage($: cheerio.CheerioAPI, selector?: string, baseUrl?: string): string | null {
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
          if (src) return this.resolveUrl(src, baseUrl || '');
        }
      }
      return null;
    }
    const element = $(selector).first();
    if (!element.length) return null;
    const src = element.attr('content') || element.attr('src');
    return src ? this.resolveUrl(src, baseUrl || '') : null;
  }

  cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();
  }

  resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http')) return url;
    try {
      const base = new URL(baseUrl);
      return new URL(url, base.origin).href;
    } catch {
      return url;
    }
  }
}

export const httpScraper = new HttpScraper();
