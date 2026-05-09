import Table from "cli-table3";
import { logger } from "../utils/logger.js";
import { db } from "../storage/database.js";
import { sourceManager } from "../storage/sources.js";

interface Entry {
  id: string;
  date: string;
  [key: string]: unknown;
}
interface ArticleEntry extends Entry {
  sourceId: string;
}
interface SourceLike {
  id: string;
  name: string;
}

export function filterByDays(
  entries: Entry[],
  days: number,
  now: Date = new Date(),
): Entry[] {
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return entries.filter((e) => new Date(e.date).getTime() >= cutoff.getTime());
}

export function filterArticlesBySource(
  articles: ArticleEntry[],
  sourceName: string | undefined,
  sources: SourceLike[],
): ArticleEntry[] {
  if (!sourceName) return articles;
  const matched = sources.find(
    (s) => s.name.toLowerCase() === sourceName.toLowerCase(),
  );
  if (!matched) return [];
  return articles.filter((a) => a.sourceId === matched.id);
}

export function formatStats(count: number, type: string): string {
  return `Total: ${count} ${type}`;
}

interface ListOptions {
  type?: string;
  status?: string;
  source?: string;
  days?: number;
  format?: string;
}

export async function listCommand(options: ListOptions): Promise<void> {
  db.initialize();
  const type = options.type ?? "articles";

  if (type === "articles") {
    const sources = await sourceManager.getAll();
    let articles = db.getAllArticles();

    if (options.status)
      articles = articles.filter((a) => a.status === options.status);
    if (options.source) {
      const matched = sources.find(
        (s) => s.name.toLowerCase() === options.source?.toLowerCase(),
      );
      if (matched)
        articles = articles.filter((a) => a.source_id === matched.id);
      else articles = [];
    }
    if (options.days) {
      const cutoff = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000);
      articles = articles.filter((a) => new Date(a.scraped_at) >= cutoff);
    }

    if (options.format === "json") {
      console.log(JSON.stringify(articles, null, 2));
      return;
    }
    if (articles.length === 0) {
      logger.info("No articles found.");
      return;
    }

    const table = new Table({
      head: ["Date", "Title", "Source", "Status", "Group"],
      colWidths: [12, 45, 18, 12, 12],
    });
    for (const a of articles) {
      const title = a.title.length > 42 ? a.title.slice(0, 41) + "…" : a.title;
      table.push([
        new Date(a.scraped_at).toLocaleDateString(),
        title,
        a.source_name,
        a.status,
        a.group_id ? a.group_id.slice(0, 8) + "…" : "—",
      ]);
    }
    console.log(table.toString());
    console.log(formatStats(articles.length, "articles"));

    const stats = db.getArticleStats();
    console.log(
      `\nBy status: ${Object.entries(stats.by_status)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}`,
    );
    console.log(
      `By source: ${Object.entries(stats.by_source)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}`,
    );
  } else if (type === "groups" || type === "summaries") {
    logger.info(
      `Listing ${type} - this feature uses the legacy manifest system`,
    );
    logger.info(
      "Groups and summaries will be migrated to SQLite in a future update",
    );
  } else if (type === "entities") {
    const entityType = options.status;
    const entities = db.searchEntities(entityType, undefined, 100);

    if (options.format === "json") {
      console.log(JSON.stringify(entities, null, 2));
      return;
    }
    if (entities.length === 0) {
      logger.info("No entities found.");
      return;
    }

    const table = new Table({
      head: ["Type", "Value", "Count", "First Seen", "Last Seen"],
      colWidths: [15, 35, 10, 12, 12],
    });
    for (const e of entities) {
      const value =
        e.entity_value.length > 32
          ? e.entity_value.slice(0, 31) + "…"
          : e.entity_value;
      table.push([
        e.entity_type,
        value,
        e.occurrence_count,
        new Date(e.first_seen).toLocaleDateString(),
        new Date(e.last_seen).toLocaleDateString(),
      ]);
    }
    console.log(table.toString());
    console.log(formatStats(entities.length, "entities"));
  } else {
    logger.error(
      `Unknown type: "${type}". Use: articles, entities, groups, summaries`,
    );
    process.exit(1);
  }
}
