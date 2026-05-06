import Table from 'cli-table3';
import { logger } from '../utils/logger.js';
import { manifestManager } from '../storage/manifest.js';
import { articleStorage } from '../storage/articles.js';
import { groupStorage } from '../storage/groups.js';
import { summaryStorage } from '../storage/summaries.js';
import inquirer from 'inquirer';
import ora from 'ora';

export function parseOlderThan(value: string, now: Date = new Date()): Date {
  const match = value.match(/^(\d+)d$/);
  if (!match) throw new Error(`Invalid --older-than value: "${value}". Expected format: "30d"`);
  const days = parseInt(match[1], 10);
  const cutoff = new Date(now.getTime());
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

interface DeletableEntry {
  id: string;
  date: string;
  status: string;
  [key: string]: unknown;
}

export function filterDeletable(
  entries: DeletableEntry[],
  cutoff: Date,
  statusFilter?: string
): DeletableEntry[] {
  return entries.filter(entry => {
    if (new Date(entry.date).getTime() >= cutoff.getTime()) return false;
    if (statusFilter && entry.status !== statusFilter) return false;
    return true;
  });
}

interface CleanOptions {
  olderThan?: string;
  status?: string;
  dryRun?: boolean;
  force?: boolean;
}

export async function cleanCommand(options: CleanOptions): Promise<void> {
  const olderThanStr = options.olderThan ?? '30d';
  let cutoff: Date;
  try {
    cutoff = parseOlderThan(olderThanStr);
  } catch (err) {
    logger.error((err as Error).message);
    process.exit(1);
  }

  await manifestManager.load();
  const manifest = (manifestManager as unknown as { manifest: {
    articles: Record<string, { id: string; scrapedAt: string; status: string; title: string }>;
    groups: Record<string, { id: string; createdAt: string; status: string; articleIds: string[] }>;
    summaries: Record<string, { id: string; createdAt: string; status: string; groupId: string }>;
  } }).manifest;

  const articleEntries = Object.values(manifest.articles).map(a => ({
    id: a.id, date: a.scrapedAt, status: a.status, title: a.title, type: 'article',
  }));
  const groupEntries = Object.values(manifest.groups).map(g => ({
    id: g.id, date: g.createdAt, status: g.status, title: `Group (${g.articleIds.length} articles)`, type: 'group',
  }));
  const summaryEntries = Object.values(manifest.summaries).map(s => ({
    id: s.id, date: s.createdAt, status: s.status, title: `Summary for group ${s.groupId.slice(0, 8)}…`, type: 'summary',
  }));

  const allEntries = [...articleEntries, ...groupEntries, ...summaryEntries];
  const toDelete = filterDeletable(allEntries, cutoff!, options.status);

  if (toDelete.length === 0) {
    logger.info('Nothing to delete.');
    return;
  }

  const table = new Table({ head: ['Type', 'ID', 'Status', 'Date', 'Title'], colWidths: [10, 12, 12, 13, 35] });
  for (const entry of toDelete) {
    const shortId = entry.id.slice(0, 8) + '…';
    const date = new Date(entry.date).toLocaleDateString();
    const title = String(entry.title ?? '').slice(0, 32);
    table.push([String(entry.type), shortId, entry.status, date, title]);
  }
  console.log('\nItems to delete:');
  console.log(table.toString());

  if (options.dryRun) {
    logger.info(`Dry run: would delete ${toDelete.length} items.`);
    return;
  }

  if (!options.force) {
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([{
      type: 'confirm',
      name: 'confirm',
      message: `Delete ${toDelete.length} items? This cannot be undone.`,
      default: false,
    }]);
    if (!confirm) {
      logger.info('Deletion cancelled.');
      return;
    }
  }

  const spinner = ora('Deleting items...').start();
  let deleted = 0;
  let failed = 0;

  for (const entry of toDelete) {
    try {
      if (entry.type === 'article') await articleStorage.delete(entry.id);
      else if (entry.type === 'group') await groupStorage.delete(entry.id);
      else if (entry.type === 'summary') await summaryStorage.delete(entry.id);
      deleted++;
    } catch {
      failed++;
    }
  }

  spinner.succeed(`Deleted ${deleted} item${deleted !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}`);
  logger.success('Clean complete');
}
