import { sourceManager } from '../storage/sources.js';
import { articleStorage } from '../storage/articles.js';
import { scraperOrchestrator } from '../scrapers/index.js';
import { rssFeedParser } from '../scrapers/rss-parser.js';
import { logger } from '../utils/logger.js';
import ora from 'ora';

export function resolveArticleLimit(cliLimit: number | undefined, sourceMax: number | undefined): number {
  return cliLimit ?? sourceMax ?? 10;
}

interface ScrapeOptions {
  sources?: string;
  method?: string;
  limit?: number;
}

export async function scrapeCommand(options: ScrapeOptions): Promise<void> {
  await sourceManager.load();
  let sources = await sourceManager.getEnabled();

  if (options.sources) {
    const requested = options.sources.split(',').map(s => s.trim());
    sources = sources.filter(s =>
      requested.includes(s.id) || requested.includes(s.name)
    );
  }

  if (sources.length === 0) {
    logger.error('No sources found or enabled');
    process.exit(1);
  }

  logger.info(`Scraping ${sources.length} source(s)`);

  const spinner = ora('Scraping articles...').start();
  let totalArticles = 0;

  for (const source of sources) {
    spinner.text = `Scraping ${source.name}...`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let articles: any[] = [];

      if (source.rss && options.method !== 'http' && options.method !== 'playwright') {
        try {
          const feed = await rssFeedParser.parse(source.rss);
          const limit = resolveArticleLimit(options.limit, source.maxArticles);
          articles = (feed.articles || []).slice(0, limit);
          logger.debug(`RSS: ${articles.length} articles from ${source.name}`);
        } catch (rssError) {
          logger.warn(`RSS failed for ${source.name}: ${(rssError as Error).message}`);
        }
      }

      if (options.method === 'rss' && articles.length === 0) {
        logger.warn(`No RSS feed configured for ${source.name}`);
        continue;
      }

      if (articles.length === 0 || options.method === 'http' || options.method === 'playwright') {
        const urls: string[] = articles.length > 0
          ? articles.map((a: { url?: string }) => a.url as string)
          : [source.url];

        const limit = resolveArticleLimit(options.limit, source.maxArticles);
        articles = [];

        for (const url of urls.slice(0, limit)) {
          try {
            const article = await scraperOrchestrator.scrapeArticle(url, source);
            articles.push(article);
          } catch (error) {
            logger.warn(`Failed to scrape ${url}: ${(error as Error).message}`);
          }
        }
      }

      for (const articleData of articles) {
        await articleStorage.save({
          sourceId: source.id,
          sourceName: source.name,
          title: String(articleData.title || ''),
          body: String(articleData.body || ''),
          url: String(articleData.url || ''),
          ...articleData,
        });
        totalArticles++;
      }

      logger.success(`${source.name}: ${articles.length} articles`);

    } catch (error) {
      logger.error(`Failed to scrape ${source.name}: ${(error as Error).message}`);
    }
  }

  spinner.succeed(`Scraped ${totalArticles} articles from ${sources.length} source(s)`);

  await scraperOrchestrator.cleanup();

  logger.info('Next: npm run list -- --type=articles');
}
