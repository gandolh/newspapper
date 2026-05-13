import { sourceManager } from "../storage/sources.js";
import { scraperOrchestrator } from "../scrapers/index.js";
import { rssFeedParser } from "../scrapers/rss-parser.js";
import { entityExtractor } from "../nlp/entity-extractor.js";
import { db } from "../storage/database.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

const MAX_ARTICLES_PER_SOURCE = 10;

interface ScrapeOptions {
  sources?: string;
  method?: string;
  limit?: number;
}

export async function scrapeCommand(options: ScrapeOptions): Promise<void> {
  db.initialize();

  await sourceManager.load();

  let sources = await sourceManager.getEnabled();
  if (options.sources) {
    const requested = options.sources.split(",").map((s) => s.trim());
    sources = sources.filter(
      (s) => requested.includes(s.id) || requested.includes(s.name),
    );
  }

  if (sources.length === 0) {
    logger.error("No sources found or enabled");
    process.exit(1);
  }

  const limit = options.limit ?? MAX_ARTICLES_PER_SOURCE;
  const today = new Date().toISOString().split("T")[0];
  logger.info(
    `Scraping ${sources.length} source(s) — today (${today}), max ${limit}/source`,
  );

  const exit = async () => {
    await scraperOrchestrator.cleanup();
    process.exit(0);
  };
  process.on("SIGINT", exit);
  process.on("SIGTERM", exit);
  let totalNew = 0;
  let totalSkipped = 0;

  for (const source of sources) {
    logger.info(`Scraping ${source.name}...`);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rawArticles: any[] = [];

      if (source.rss && options.method !== "http") {
        try {
          const feed = await rssFeedParser.parse(source.rss);
          rawArticles = (feed.articles || []).slice(0, limit);
        } catch (rssError) {
          logger.warn(
            `RSS failed for ${source.name}: ${(rssError as Error).message}`,
          );
        }
      }

      if (rawArticles.length === 0 || options.method === "http") {
        const urls: string[] =
          rawArticles.length > 0
            ? rawArticles.map((a: { url?: string }) => a.url as string)
            : [source.url];

        rawArticles = [];
        for (const url of urls.slice(0, limit)) {
          try {
            const article = await scraperOrchestrator.scrapeArticle(
              url,
              source,
            );
            rawArticles.push(article);
          } catch (err) {
            logger.warn(`Failed to scrape ${url}: ${(err as Error).message}`);
          }
        }
      }

      // Filter to today's articles only
      const todayArticles = rawArticles.filter((a) => {
        const pub = a.publishedAt || a.published_at;
        if (!pub) return true; // no date = include
        return String(pub).startsWith(today);
      });

      let sourceNew = 0;
      for (const articleData of todayArticles) {
        const url = String(articleData.url || "");
        if (!url) continue;

        const existing = db.getArticleByUrl(url);
        if (existing) {
          totalSkipped++;
          continue;
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        db.insertArticle({
          id,
          source_id: source.id,
          source_name: source.name,
          url,
          title: String(articleData.title || "").trim() || url,
          author: articleData.author || null,
          published_at:
            articleData.publishedAt || articleData.published_at || null,
          scraped_at: now,
          body: String(articleData.body || ""),
        });

        if (articleData.body) {
          try {
            await entityExtractor.extractAndSaveForArticle(
              id,
              `${articleData.title} ${articleData.body}`,
            );
          } catch (err) {
            logger.warn(
              `Entity extraction failed for ${id}: ${(err as Error).message}`,
            );
          }
        }

        sourceNew++;
        totalNew++;
      }

      logger.success(`${source.name}: ${sourceNew} new article(s)`);
    } catch (err) {
      logger.error(
        `Failed to scrape ${source.name}: ${(err as Error).message}`,
      );
    }
  }

  logger.success(
    `Done — ${totalNew} new article(s)${totalSkipped > 0 ? `, ${totalSkipped} already saved` : ""}`,
  );

  await scraperOrchestrator.cleanup();
  return;
}
