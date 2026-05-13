import axios, { AxiosInstance } from "axios";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";

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
        "User-Agent": config.scraping.userAgent,
      },
    });
  }

  async scrape(
    url: string,
    selectors: Selectors = {},
  ): Promise<ScrapedArticle> {
    let retries = 0;
    let lastError: Error = new Error("Unknown error");

    while (retries < config.scraping.maxRetries) {
      try {
        logger.debug(`Fetching ${url} (attempt ${retries + 1})`);

        const response = await this.client.get(url);
        const html = response.data as string;

        const article: ScrapedArticle = {
          url,
          title: this.extractTagContent(html, selectors.title || "h1"),
          author: this.extractTagContent(html, selectors.author),
          publishedAt: this.extractTagContent(html, selectors.date),
          body: this.extractTagContent(html, selectors.body),
          image: null, // Simplified for now without cheerio
        };

        if (!article.title) {
          // Fallback to title tag if h1 fails
          article.title = this.extractTagContent(html, "title");
        }

        if (!article.title || !article.body) {
          throw new Error("Failed to extract title or body");
        }

        return article;
      } catch (error) {
        lastError = error as Error;
        retries++;

        if (retries < config.scraping.maxRetries) {
          const delay = Math.pow(2, retries) * 1000;
          logger.debug(`Retry in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Failed to scrape ${url} after ${retries} attempts: ${lastError.message}`,
    );
  }

  private extractTagContent(
    html: string,
    tag: string | undefined,
  ): string | null {
    if (!tag) return null;
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = html.match(regex);
    if (match && match[1]) {
      return this.cleanText(match[1]);
    }
    return null;
  }

  cleanText(text: string): string {
    return text
      .replace(/<[^>]*>?/gm, "")
      .replace(/\s+/g, " ")
      .replace(/\n+/g, "\n")
      .trim();
  }

  resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith("http")) return url;
    try {
      const base = new URL(baseUrl);
      return new URL(url, base.origin).href;
    } catch {
      return url;
    }
  }
}

export const httpScraper = new HttpScraper();
