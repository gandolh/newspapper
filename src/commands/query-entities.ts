import { logger } from '../utils/logger.js';
import { format, subDays } from 'date-fns';
import Table from 'cli-table3';
import { manifestManager } from '../storage/manifest.js';
import { articleStorage } from '../storage/articles.js';
import { groupStorage } from '../storage/groups.js';
import { entityStorage } from '../storage/entities.js';

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
  person: 'people',
  place: 'places',
  organization: 'organizations',
  event: 'events',
};

export function formatRelated(results: SearchResult[], searchedName: string): string {
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
    ['people', 'People'],
    ['places', 'Places'],
    ['organizations', 'Organizations'],
    ['events', 'Events'],
  ];

  for (const [key, label] of labels) {
    const items = [...unique[key]].slice(0, 10);
    if (items.length > 0) {
      lines.push(`  ${label}: ${items.join(', ')}`);
    }
  }

  if (lines.length === 0) return '';
  return '\nFrequently mentioned with:\n' + lines.join('\n');
}

export function formatTimeline(articles: ArticleLike[]): string {
  if (articles.length === 0) return '';

  const counts = new Map<string, number>();
  for (const article of articles) {
    const dateStr = article.publishedAt ?? article.scrapedAt;
    const key = format(new Date(dateStr), 'MM/dd');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  const lines = sorted.map(([date, count]) => {
    const bar = '█'.repeat(Math.min(count, 50));
    return `  ${date}: ${bar} (${count})`;
  });

  return '\nTimeline:\n' + lines.join('\n');
}

interface QueryEntitiesOptions {
  type: string;
  name: string;
  days: number;
  related?: boolean;
  timeline?: boolean;
}

export async function queryEntitiesCommand(options: QueryEntitiesOptions): Promise<void> {
  if (!TYPE_MAP[options.type]) {
    logger.error(`Invalid type. Must be one of: ${Object.keys(TYPE_MAP).join(', ')}`);
    process.exit(1);
  }
  if (!options.name || options.name.trim().length === 0) {
    logger.error('Entity name is required');
    process.exit(1);
  }

  logger.info(`Searching for ${options.type}: "${options.name}"`);

  await manifestManager.load();
  const { articles } = manifestManager.getAll();
  const cutoff = subDays(new Date(), options.days);
  const recent = Object.values(articles).filter(
    a => new Date(a.scrapedAt) >= cutoff
  );

  logger.debug(`Searching in ${recent.length} articles from last ${options.days} days`);

  const results = await entityStorage.searchByEntity(
    TYPE_MAP[options.type],
    options.name,
    recent.map(a => a.id)
  );

  if (results.length === 0) {
    logger.warn(`No articles found mentioning ${options.type} "${options.name}"`);
    logger.info('Try:');
    logger.info('  - Using a different spelling');
    logger.info('  - Increasing --days value');
    logger.info('  - Running entity extraction first: npm run extract-entities --all');
    process.exit(0);
  }

  logger.success(`Found ${results.length} article${results.length !== 1 ? 's' : ''} mentioning "${options.name}"`);

  const articleData = await articleStorage.loadMultiple(results.map(r => r.articleId));

  const table = new Table({
    head: ['Date', 'Title', 'Source', 'Matches', 'Group'],
    colWidths: [12, 45, 15, 9, 10],
  });

  for (const result of results) {
    const article = articleData.find(a => a?.id === result.articleId);
    if (!article) continue;
    const manifestEntry = articles[result.articleId];
    const groupId = manifestEntry?.groupId;
    const dateStr = article.publishedAt
      ? format(new Date(String(article.publishedAt)), 'MM/dd/yyyy')
      : '—';
    const title = article.title.length > 42
      ? article.title.slice(0, 41) + '…'
      : article.title;
    table.push([
      dateStr,
      title,
      String(article.sourceName ?? 'Unknown'),
      result.matches.length,
      groupId ? groupId.slice(0, 8) + '…' : '—',
    ]);
  }

  console.log('\n' + table.toString());

  const groupIds = new Set<string>();
  for (const result of results) {
    const groupId = articles[result.articleId]?.groupId;
    if (groupId) groupIds.add(groupId);
  }

  if (groupIds.size > 0) {
    console.log(`\nFound in ${groupIds.size} group(s):`);
    for (const groupId of groupIds) {
      const group = await groupStorage.load(groupId);
      if (group) {
        console.log(`  ${groupId.slice(0, 8)}…: ${group.articleIds.length} articles`);
      }
    }
  }

  if (options.related) {
    const related = formatRelated(results, options.name);
    if (related) console.log(related);
    else logger.info('No related entities found');
  }

  if (options.timeline) {
    const articleLikes = results
      .map(r => articleData.find(a => a?.id === r.articleId))
      .filter((a): a is NonNullable<typeof a> => a !== null && a !== undefined)
      .map(a => ({ publishedAt: a.publishedAt as string | null, scrapedAt: a.scrapedAt }));
    const timeline = formatTimeline(articleLikes);
    if (timeline) console.log(timeline);
  }
}
