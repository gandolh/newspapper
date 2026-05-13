import { readdir, rm, stat } from "fs/promises";
import { join } from "path";
import Table from "cli-table3";
import inquirer from "inquirer";
import { db } from "../storage/database.js";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";

export function parseOlderThan(value: string, now: Date = new Date()): Date {
  const match = value.match(/^(\d+)d$/);
  if (!match)
    throw new Error(
      `Invalid --older-than value: "${value}". Expected format: "30d"`,
    );
  const days = parseInt(match[1], 10);
  const cutoff = new Date(now.getTime());
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

interface CleanOptions {
  olderThan?: string;
  all?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

export async function cleanCommand(options: CleanOptions): Promise<void> {
  db.initialize();

  if (options.all) {
    if (!options.force) {
      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        {
          type: "confirm",
          name: "confirm",
          message:
            "Delete ALL articles, entities, and posts from DB? Cannot be undone.",
          default: false,
        },
      ]);
      if (!confirm) {
        logger.info("Cancelled");
        return;
      }
    }

    logger.info("Purging all data...");
    db.purgeAll();

    const postsDir = join(config.paths.output, "posts");
    try {
      await rm(postsDir, { recursive: true, force: true });
    } catch {
      /* dir may not exist */
    }

    logger.success("All articles, entities, and posts deleted");
    return;
  }

  const olderThanStr = options.olderThan ?? "30d";
  let cutoff: Date;
  try {
    cutoff = parseOlderThan(olderThanStr);
  } catch (err) {
    logger.error((err as Error).message);
    process.exit(1);
  }

  const cutoffIso = cutoff.toISOString();
  logger.info(`Cleaning items older than: ${cutoff.toLocaleDateString()}`);

  // Find old articles in DB
  const allArticles = db.getAllArticles();
  const oldArticles = allArticles.filter((a) => a.scraped_at < cutoffIso);

  // Find old post directories
  const postsDir = join(config.paths.output, "posts");
  let oldPostDirs: string[] = [];
  try {
    const entries = await readdir(postsDir);
    for (const entry of entries) {
      const dirPath = join(postsDir, entry);
      const s = await stat(dirPath);
      if (s.isDirectory() && s.mtime < cutoff) {
        oldPostDirs.push(dirPath);
      }
    }
  } catch {
    // no posts dir yet
  }

  if (oldArticles.length === 0 && oldPostDirs.length === 0) {
    logger.info("Nothing to delete");
    return;
  }

  // Show what will be deleted
  if (oldArticles.length > 0) {
    const table = new Table({
      head: ["Date", "Title", "Source", "Status"],
      colWidths: [12, 45, 18, 12],
    });
    for (const a of oldArticles) {
      const title = a.title.length > 42 ? a.title.slice(0, 41) + "…" : a.title;
      table.push([
        new Date(a.scraped_at).toLocaleDateString(),
        title,
        a.source_name,
        a.status,
      ]);
    }
    console.log(`\nArticles to delete (${oldArticles.length}):`);
    console.log(table.toString());
  }

  if (oldPostDirs.length > 0) {
    console.log(`\nPost directories to delete (${oldPostDirs.length}):`);
    for (const d of oldPostDirs) console.log(`  ${d}`);
  }

  if (options.dryRun) {
    logger.info("Dry run — nothing deleted");
    return;
  }

  if (!options.force) {
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        type: "confirm",
        name: "confirm",
        message: `Delete ${oldArticles.length} article(s) and ${oldPostDirs.length} post dir(s)? Cannot be undone.`,
        default: false,
      },
    ]);
    if (!confirm) {
      logger.info("Cancelled");
      return;
    }
  }

  logger.info("Deleting...");
  let deleted = 0;

  if (oldArticles.length > 0) {
    db.deleteArticlesOlderThan(cutoffIso);
    db.deletePostsOlderThan(cutoffIso);
    deleted += oldArticles.length;
  }

  for (const dir of oldPostDirs) {
    try {
      await rm(dir, { recursive: true, force: true });
      deleted++;
    } catch (err) {
      logger.warn(`Failed to delete ${dir}: ${(err as Error).message}`);
    }
  }

  logger.success(
    `Deleted ${oldArticles.length} article(s) and ${oldPostDirs.length} post dir(s)`,
  );
}
