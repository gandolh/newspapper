import Table from "cli-table3";
import { logger } from "../utils/logger.js";
import { db } from "../storage/database.js";

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
    let articles = db.getAllArticles();

    if (options.status)
      articles = articles.filter((a) => a.status === options.status);
    if (options.source) {
      const src = options.source.toLowerCase();
      articles = articles.filter((a) =>
        a.source_name.toLowerCase().includes(src),
      );
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
      logger.info("No articles found");
      return;
    }

    const table = new Table({
      head: ["Date", "Title", "Source", "Status"],
      colWidths: [12, 50, 20, 12],
    });
    for (const a of articles) {
      const title = a.title.length > 47 ? a.title.slice(0, 46) + "…" : a.title;
      table.push([
        new Date(a.scraped_at).toLocaleDateString(),
        title,
        a.source_name,
        a.status,
      ]);
    }
    console.log(table.toString());
    console.log(`Total: ${articles.length} article(s)`);
  } else if (type === "entities") {
    const entities = db.getAllEntities(options.status);

    if (options.format === "json") {
      console.log(JSON.stringify(entities, null, 2));
      return;
    }
    if (entities.length === 0) {
      logger.info("No entities found");
      return;
    }

    const table = new Table({
      head: ["Type", "Value"],
      colWidths: [18, 60],
    });
    for (const e of entities) {
      table.push([e.entity_type, e.entity_value]);
    }
    console.log(table.toString());
    console.log(`Total: ${entities.length} entity/entities`);
  } else if (type === "posts") {
    const posts = db.getAllPosts();

    if (options.format === "json") {
      console.log(JSON.stringify(posts, null, 2));
      return;
    }
    if (posts.length === 0) {
      logger.info("No posts found");
      return;
    }

    const table = new Table({
      head: ["Date", "Slug", "Design", "Status"],
      colWidths: [12, 40, 18, 12],
    });
    for (const p of posts) {
      table.push([
        new Date(p.created_at).toLocaleDateString(),
        p.slug.length > 37 ? p.slug.slice(0, 36) + "…" : p.slug,
        p.design,
        p.status,
      ]);
    }
    console.log(table.toString());
    console.log(`Total: ${posts.length} post(s)`);
  } else {
    logger.error(`Unknown type: "${type}". Use: articles, entities, posts`);
    process.exit(1);
  }
}
