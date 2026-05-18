import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../util/config.js';
import { log } from '../util/logger.js';
import { open } from '../storage/db.js';

export async function cleanCmd(): Promise<void> {
  const config = loadConfig();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - config.defaultRetentionDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  log.info(`clean: removing rows and folders older than ${cutoffStr} (${config.defaultRetentionDays} days)`);

  const db = open(config.dbPath);
  const artRes = db.prepare('DELETE FROM articles WHERE substr(published_at, 1, 10) < ?').run(cutoffStr);
  const postRes = db.prepare('DELETE FROM posts WHERE date < ?').run(cutoffStr);
  db.close();
  log.info(`  articles deleted: ${artRes.changes}`);
  log.info(`  posts deleted:    ${postRes.changes}`);

  if (!existsSync(config.outputDir)) return;
  let dirsRemoved = 0;
  for (const name of readdirSync(config.outputDir)) {
    const full = join(config.outputDir, name);
    if (!statSync(full).isDirectory()) continue;
    const datePart = name.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart) && datePart < cutoffStr) {
      rmSync(full, { recursive: true, force: true });
      dirsRemoved += 1;
    }
  }
  log.info(`  output dirs removed: ${dirsRemoved}`);
}
