import { db } from "../storage/database.js";
import { entityExtractor } from "../nlp/entity-extractor.js";
import { logger } from "../utils/logger.js";

const TYPE_LABELS: Record<string, string> = {
  person: "People",
  place: "Places",
  organization: "Orgs",
  event: "Events",
};

function printEntitySummary(): void {
  const articles = db.getArticlesByStatus("processed");
  if (articles.length === 0) return;

  const LINE = "─".repeat(72);
  console.log("\n" + "═".repeat(72));
  console.log(" ARTICLES & ENTITIES");
  console.log("═".repeat(72));

  for (const article of articles) {
    const entities = db.getEntitiesByArticle(article.id);
    const byType: Record<string, string[]> = {};
    for (const e of entities) {
      (byType[e.entity_type] ??= []).push(e.entity_value);
    }

    const title =
      article.title.length > 65
        ? article.title.slice(0, 64) + "…"
        : article.title;

    console.log(`\n  ${title}`);
    console.log(`  ${article.source_name}`);
    console.log(LINE);

    const types = ["person", "place", "organization", "event"];
    let hasAny = false;
    for (const type of types) {
      const vals = byType[type];
      if (vals && vals.length > 0) {
        const label = TYPE_LABELS[type].padEnd(8);
        console.log(`  ${label}  ${vals.join(" · ")}`);
        hasAny = true;
      }
    }
    if (!hasAny) console.log("  (no entities extracted)");
  }

  console.log("\n" + "═".repeat(72));
  logger.info('Next: npm run post -- --entities "<entity1>,<entity2>"');
}

export async function extractEntitiesCommand(): Promise<void> {
  db.initialize();

  const articles = db.getArticlesByStatus("scraped");
  if (articles.length === 0) {
    logger.warn("No scraped articles found");
    logger.info('Run "npm run scrape" first');
    process.exit(0);
  }

  logger.info(`Extracting entities from ${articles.length} article(s)`);

  let processed = 0;
  let failed = 0;

  for (const article of articles) {
    logger.info(
      `Extracting (${processed + 1}/${articles.length}): ${article.title.slice(0, 50)}`,
    );
    try {
      await entityExtractor.extractAndSaveForArticle(
        article.id,
        `${article.title} ${article.body}`,
      );
      db.updateArticleStatus(article.id, "processed");
      processed++;
    } catch (err) {
      logger.warn(`Failed for "${article.title}": ${(err as Error).message}`);
      failed++;
    }
  }

  logger.success(
    `Extracted entities from ${processed} article(s)${failed > 0 ? ` (${failed} failed)` : ""}`,
  );

  printEntitySummary();
}
