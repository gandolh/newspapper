import { logger } from "../utils/logger.js";
import { format, subDays } from "date-fns";
import Table from "cli-table3";
import { db } from "../storage/database.js";
import { articleStorage } from "../storage/articles.js";

interface EntitySet {
  people: string[];
  places: string[];
  organizations: string[];
  events: string[];
}

interface SearchResult {
  articleId: string;
  matches: string[];
  allEntities: EntitySet;
}

interface ArticleLike {
  publishedAt?: string | null;
  scrapedAt: string;
}

const TYPE_MAP: Record<string, string> = {
  person: "people",
  place: "places",
  organization: "organizations",
  event: "events",
};

export function formatRelated(
  results: SearchResult[],
  searchedName: string,
): string {
  const unique: Record<keyof EntitySet, Set<string>> = {
    people: new Set(),
    places: new Set(),
    organizations: new Set(),
    events: new Set(),
  };

  for (const result of results) {
    for (const key of Object.keys(unique) as (keyof EntitySet)[]) {
      for (const entity of result.allEntities[key]) {
        if (entity.toLowerCase() !== searchedName.toLowerCase()) {
          unique[key].add(entity);
        }
      }
    }
  }

  const lines: string[] = [];
  const labels: [keyof EntitySet, string][] = [
    ["people", "People"],
    ["places", "Places"],
    ["organizations", "Organizations"],
    ["events", "Events"],
  ];

  for (const [key, label] of labels) {
    const items = [...unique[key]].slice(0, 10);
    if (items.length > 0) {
      lines.push(`  ${label}: ${items.join(", ")}`);
    }
  }

  if (lines.length === 0) return "";
  return "\nFrequently mentioned with:\n" + lines.join("\n");
}

export function formatTimeline(articles: ArticleLike[]): string {
  if (articles.length === 0) return "";

  const counts = new Map<string, number>();
  for (const article of articles) {
    const dateStr = article.publishedAt ?? article.scrapedAt;
    const key = format(new Date(dateStr), "MM/dd");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  const lines = sorted.map(([date, count]) => {
    const bar = "█".repeat(Math.min(count, 50));
    return `  ${date}: ${bar} (${count})`;
  });

  return "\nTimeline:\n" + lines.join("\n");
}

interface QueryEntitiesOptions {
  type: string;
  name: string;
  days: number;
  related?: boolean;
  timeline?: boolean;
}

export async function queryEntitiesCommand(
  options: QueryEntitiesOptions,
): Promise<void> {
  db.initialize();

  if (!TYPE_MAP[options.type]) {
    logger.error(
      `Invalid type. Must be one of: ${Object.keys(TYPE_MAP).join(", ")}`,
    );
    process.exit(1);
  }
  if (!options.name || options.name.trim().length === 0) {
    logger.error("Entity name is required");
    process.exit(1);
  }

  logger.info(`Searching for ${options.type}: "${options.name}"`);

  const foundArticles = db.getArticlesByEntity(options.type, options.name);
  const cutoff = subDays(new Date(), options.days);
  const recent = foundArticles.filter((a) => new Date(a.scraped_at) >= cutoff);

  logger.debug(
    `Found ${recent.length} articles from last ${options.days} days`,
  );

  if (recent.length === 0) {
    logger.warn(
      `No articles found mentioning ${options.type} "${options.name}"`,
    );
    logger.info("Try:");
    logger.info("  - Using a different spelling");
    logger.info("  - Increasing --days value");
    logger.info("  - Running scrape to collect and extract entities");
    process.exit(0);
  }

  logger.success(
    `Found ${recent.length} article${recent.length !== 1 ? "s" : ""} mentioning "${options.name}"`,
  );

  const table = new Table({
    head: ["Date", "Title", "Source", "Group"],
    colWidths: [12, 50, 20, 12],
  });

  for (const article of recent) {
    const dateStr = article.published_at
      ? format(new Date(article.published_at), "MM/dd/yyyy")
      : "—";
    const title =
      article.title.length > 47
        ? article.title.slice(0, 46) + "…"
        : article.title;
    table.push([
      dateStr,
      title,
      article.source_name,
      article.group_id ? article.group_id.slice(0, 8) + "…" : "—",
    ]);
  }

  console.log("\n" + table.toString());

  const groupIds = new Set<string>();
  for (const article of recent) {
    if (article.group_id) groupIds.add(article.group_id);
  }

  if (groupIds.size > 0) {
    console.log(
      `\nFound in ${groupIds.size} group(s): ${[...groupIds].map((g) => g.slice(0, 8) + "…").join(", ")}`,
    );
  }

  if (options.timeline) {
    const articleLikes = recent.map((a) => ({
      publishedAt: a.published_at,
      scrapedAt: a.scraped_at,
    }));
    const timeline = formatTimeline(articleLikes);
    if (timeline) console.log(timeline);
  }

  if (options.related) {
    logger.info("Related entities feature will be enhanced in future updates");
  }
}
