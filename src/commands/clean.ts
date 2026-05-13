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
  mode: "all" | "today" | "week" | "month";
  force?: boolean;
}

export async function cleanCommand(options: CleanOptions): Promise<void> {
  db.initialize();

  const now = new Date();
  let cutoff: Date | null = null;
  let label = "";

  switch (options.mode) {
    case "all":
      cutoff = null;
      label = "ALL data";
      break;
    case "today":
      cutoff = new Date(now.setHours(0, 0, 0, 0));
      label = "data from today";
      break;
    case "week":
      cutoff = new Date(now.setDate(now.getDate() - 7));
      label = "data older than 1 week";
      break;
    case "month":
      cutoff = new Date(now.setMonth(now.getMonth() - 1));
      label = "data older than 1 month";
      break;
  }

  if (!options.force) {
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        type: "confirm",
        name: "confirm",
        message: `Delete ${label}? Cannot be undone.`,
        default: false,
      },
    ]);
    if (!confirm) {
      logger.info("Cancelled");
      return;
    }
  }

  if (options.mode === "all") {
    logger.info("Purging all data...");
    db.purgeAll();
    const postsDir = join(config.paths.output, "posts");
    try {
      await rm(postsDir, { recursive: true, force: true });
    } catch {}
    logger.success("All articles and posts deleted");
    return;
  }

  const cutoffIso = cutoff!.toISOString();
  logger.info(`Cleaning ${label}...`);

  // Articles
  db.deleteArticlesOlderThan(cutoffIso);
  db.deletePostsOlderThan(cutoffIso);

  // Post directories
  const postsDir = join(config.paths.output, "posts");
  try {
    const entries = await readdir(postsDir);
    for (const entry of entries) {
      const dirPath = join(postsDir, entry);
      const s = await stat(dirPath);
      if (s.isDirectory() && s.mtime < cutoff!) {
        await rm(dirPath, { recursive: true, force: true });
      }
    }
  } catch {}

  logger.success(`Cleaned ${label}`);
}
