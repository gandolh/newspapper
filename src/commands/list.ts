import Table from 'cli-table3';
import { logger } from '../utils/logger.js';
import { manifestManager } from '../storage/manifest.js';
import { sourceManager } from '../storage/sources.js';

interface Entry { id: string; date: string; [key: string]: unknown; }
interface ArticleEntry extends Entry { sourceId: string; }
interface SourceLike { id: string; name: string; }

export function filterByDays(entries: Entry[], days: number, now: Date = new Date()): Entry[] {
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return entries.filter(e => new Date(e.date).getTime() >= cutoff.getTime());
}

export function filterArticlesBySource(
  articles: ArticleEntry[],
  sourceName: string | undefined,
  sources: SourceLike[]
): ArticleEntry[] {
  if (!sourceName) return articles;
  const matched = sources.find(s => s.name.toLowerCase() === sourceName.toLowerCase());
  if (!matched) return [];
  return articles.filter(a => a.sourceId === matched.id);
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
  const type = options.type ?? 'groups';
  const manifest = await manifestManager.load();

  if (type === 'articles') {
    const sources = await sourceManager.getAll();

    let entries = Object.values(manifest.articles).map(a => ({
      id: a.id,
      date: a.scrapedAt,
      sourceId: a.sourceId,
      title: a.title,
      status: a.status,
      groupId: a.groupId,
      hasEntities: a.hasEntities,
    }));

    if (options.status) entries = entries.filter(a => a.status === options.status);
    if (options.source) entries = filterArticlesBySource(entries, options.source, sources) as typeof entries;
    if (options.days) entries = filterByDays(entries, options.days) as typeof entries;

    if (options.format === 'json') { console.log(JSON.stringify(entries, null, 2)); return; }
    if (entries.length === 0) { logger.info('No articles found.'); return; }

    const table = new Table({ head: ['Date', 'Title', 'Source', 'Status', 'Group', 'Entities'], colWidths: [12, 40, 15, 10, 10, 10] });
    for (const a of entries) {
      const src = sources.find(s => s.id === a.sourceId)?.name ?? 'Unknown';
      const title = a.title.length > 37 ? a.title.slice(0, 36) + '…' : a.title;
      table.push([new Date(a.date).toLocaleDateString(), title, src, a.status, a.groupId ? a.groupId.slice(0, 8) + '…' : '—', a.hasEntities ? 'yes' : 'no']);
    }
    console.log(table.toString());
    console.log(formatStats(entries.length, 'articles'));

  } else if (type === 'groups') {
    let entries = Object.values(manifest.groups).map(g => ({
      id: g.id, date: g.createdAt, status: g.status, articleCount: g.articleIds.length, summaryId: g.summaryId,
    }));

    if (options.status) entries = entries.filter(g => g.status === options.status);
    if (options.days) entries = filterByDays(entries, options.days) as typeof entries;

    if (options.format === 'json') { console.log(JSON.stringify(entries, null, 2)); return; }
    if (entries.length === 0) { logger.info('No groups found.'); return; }

    const table = new Table({ head: ['Date', 'ID', 'Status', 'Articles', 'Summary'], colWidths: [12, 12, 12, 10, 12] });
    for (const g of entries) {
      table.push([new Date(g.date).toLocaleDateString(), g.id.slice(0, 8) + '…', g.status, g.articleCount, g.summaryId ? g.summaryId.slice(0, 8) + '…' : '—']);
    }
    console.log(table.toString());
    console.log(formatStats(entries.length, 'groups'));

  } else if (type === 'summaries') {
    let entries = Object.values(manifest.summaries).map(s => ({
      id: s.id, date: s.createdAt, status: s.status, groupId: s.groupId, method: s.method, tone: s.tone, design: s.design,
    }));

    if (options.status) entries = entries.filter(s => s.status === options.status);
    if (options.days) entries = filterByDays(entries, options.days) as typeof entries;

    if (options.format === 'json') { console.log(JSON.stringify(entries, null, 2)); return; }
    if (entries.length === 0) { logger.info('No summaries found.'); return; }

    const table = new Table({ head: ['Date', 'ID', 'Group', 'Method', 'Tone', 'Status'], colWidths: [12, 12, 12, 10, 12, 12] });
    for (const s of entries) {
      table.push([new Date(s.date).toLocaleDateString(), s.id.slice(0, 8) + '…', s.groupId.slice(0, 8) + '…', s.method, s.tone, s.status]);
    }
    console.log(table.toString());
    console.log(formatStats(entries.length, 'summaries'));

  } else {
    logger.error(`Unknown type: "${type}". Use: articles, groups, summaries`);
    process.exit(1);
  }
}
