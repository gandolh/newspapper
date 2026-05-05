import { manifestManager } from '../storage/manifest.js';
import { articleStorage } from '../storage/articles.js';
import { groupStorage } from '../storage/groups.js';
import { entityStorage } from '../storage/entities.js';
import { articleClusterer } from '../nlp/clustering.js';
import { logger } from '../utils/logger.js';
import ora from 'ora';
import Table from 'cli-table3';
import inquirer from 'inquirer';

interface Article {
  id: string;
  title: string;
  body: string;
  [key: string]: unknown;
}

interface EntitySet {
  people: string[];
  places: string[];
  organizations: string[];
  events: string[];
}

interface GroupCommandOptions {
  threshold?: number;
  method?: string;
  minGroupSize?: number;
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'of', 'and', 'to', 'for', 'is', 'are', 'was',
  'were', 'that', 'this', 'with', 'by', 'on', 'at', 'from', 'as', 'it',
  'its', 'be', 'has', 'have', 'had', 'will', 'would', 'said', 'says',
  'new', 'over', 'after', 'about', 'but', 'not', 'or', 'who', 'what',
  'when', 'how', 'their', 'they', 'been', 'more', 'also', 'into', 'than',
  'up', 'out', 'no', 'he', 'she', 'we', 'us', 'you', 'his', 'her', 'our',
]);

export function extractKeywords(articles: Article[], commonEntities: EntitySet): string[] {
  const entityTerms = [
    ...commonEntities.people,
    ...commonEntities.places,
    ...commonEntities.organizations,
    ...commonEntities.events,
  ];

  const entityLower = new Set(entityTerms.map(e => e.toLowerCase()));

  const freq = new Map<string, number>();
  for (const article of articles) {
    const tokens = article.title.toLowerCase().split(/\W+/).filter(
      t => t.length >= 3 && !STOP_WORDS.has(t) && !entityLower.has(t)
    );
    for (const token of tokens) {
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
  }

  const titleTerms = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term);

  const result: string[] = [];
  const seen = new Set<string>();

  for (const term of entityTerms) {
    if (!seen.has(term.toLowerCase())) {
      seen.add(term.toLowerCase());
      result.push(term);
      if (result.length === 10) return result;
    }
  }

  for (const term of titleTerms) {
    if (!seen.has(term.toLowerCase())) {
      seen.add(term.toLowerCase());
      result.push(term);
      if (result.length === 10) return result;
    }
  }

  return result;
}

export function renderClusterHeader(index: number, total: number, articleCount: number): string {
  const sep = '='.repeat(60);
  return `\n${sep}\nGroup ${index}/${total} — ${articleCount} articles\n${sep}`;
}

export function renderEntitiesAndKeywords(entities: EntitySet, keywords: string[]): string {
  const lines: string[] = [];
  const hasEntities =
    entities.people.length > 0 ||
    entities.places.length > 0 ||
    entities.organizations.length > 0 ||
    entities.events.length > 0;

  if (hasEntities) {
    lines.push('\nCommon entities:');
    if (entities.people.length > 0) lines.push(`  People: ${entities.people.join(', ')}`);
    if (entities.places.length > 0) lines.push(`  Places: ${entities.places.join(', ')}`);
    if (entities.organizations.length > 0) lines.push(`  Organizations: ${entities.organizations.join(', ')}`);
    if (entities.events.length > 0) lines.push(`  Events: ${entities.events.join(', ')}`);
  }

  if (keywords.length > 0) {
    lines.push(`\nKeywords: ${keywords.join(', ')}`);
  }

  return lines.join('\n');
}

async function handleMerge(
  clusterArticles: Article[],
  savedGroups: { id: string; articleIds: string[] }[]
): Promise<void> {
  if (savedGroups.length === 0) {
    logger.warn('No groups saved yet in this session — nothing to merge into');
    return;
  }

  const groupChoices = savedGroups.map(g => ({
    name: `${g.articleIds.length} articles — ID: ${g.id.slice(0, 8)}…`,
    value: g.id,
  }));
  groupChoices.push({ name: 'Other (enter ID manually)', value: '__other__' });

  const { targetId } = await inquirer.prompt<{ targetId: string }>([{
    type: 'list',
    name: 'targetId',
    message: 'Merge into which group?',
    choices: groupChoices,
  }]);

  let resolvedId = targetId;
  if (targetId === '__other__') {
    const { manualId } = await inquirer.prompt<{ manualId: string }>([{
      type: 'input',
      name: 'manualId',
      message: 'Enter group ID:',
      validate: (v: string) => v.trim().length > 0 || 'ID cannot be empty',
    }]);
    resolvedId = manualId.trim();

    const existing = await groupStorage.load(resolvedId);
    if (!existing) {
      logger.warn(`Group ${resolvedId} not found — merge aborted`);
      return;
    }
  }

  for (const article of clusterArticles) {
    await groupStorage.addArticleToGroup(resolvedId, article.id);
    await manifestManager.updateArticleStatus(article.id, 'grouped');
  }
  logger.success(`Merged ${clusterArticles.length} article(s) into group ${resolvedId}`);
}

export async function groupCommand(options: GroupCommandOptions): Promise<void> {
  await manifestManager.load();
  const ungroupedEntries = await manifestManager.getArticlesByStatus('scraped');

  if (ungroupedEntries.length === 0) {
    logger.warn('No ungrouped articles found');
    logger.info('Run "npm run scrape" first to fetch articles');
    process.exit(0);
  }

  logger.info(`Found ${ungroupedEntries.length} ungrouped articles`);

  const articles = await articleStorage.loadMultiple(ungroupedEntries.map(a => a.id));
  const validArticles = articles.filter((a): a is NonNullable<typeof a> => a !== null);

  if (validArticles.length === 0) {
    logger.error('Could not load article data');
    process.exit(1);
  }

  const spinner = ora('Clustering articles...').start();

  let clusters;
  try {
    if (options.method === 'entities') {
      clusters = await articleClusterer.clusterByEntities(validArticles, entityStorage);
    } else {
      clusters = await articleClusterer.clusterArticles(validArticles, options.threshold ?? null);
    }
  } catch (err) {
    spinner.fail('Clustering failed');
    logger.error((err as Error).message);
    process.exit(1);
  }

  spinner.succeed(`Created ${clusters.length} potential groups`);

  if (clusters.length === 0) {
    logger.warn('No clusters formed. Try lowering the threshold.');
    process.exit(0);
  }

  const savedGroups: Awaited<ReturnType<typeof groupStorage.save>>[] = [];
  const minGroupSize = options.minGroupSize ?? 2;

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];

    console.log(renderClusterHeader(i + 1, clusters.length, cluster.articles.length));

    const table = new Table({ head: ['#', 'Title', 'Source', 'Date'], colWidths: [4, 48, 20, 13] });
    for (const [idx, article] of cluster.articles.entries()) {
      const title = article.title.length > 45 ? article.title.slice(0, 44) + '…' : article.title;
      const source = String(article.sourceName ?? 'Unknown');
      const date = article.publishedAt ? new Date(String(article.publishedAt)).toLocaleDateString() : '—';
      table.push([idx + 1, title, source, date]);
    }
    console.log(table.toString());

    const emptyEntities: EntitySet = { people: [], places: [], organizations: [], events: [] };
    const entities = cluster.commonEntities ?? emptyEntities;
    const keywords = extractKeywords(cluster.articles, entities);
    console.log(renderEntitiesAndKeywords(entities, keywords));

    const { action } = await inquirer.prompt<{ action: string }>([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do with this group?',
      choices: [
        { name: 'Accept and save', value: 'accept' },
        { name: "Skip (don't save)", value: 'skip' },
        { name: 'Remove articles from group', value: 'remove' },
        { name: 'Merge with previous group', value: 'merge' },
        { name: 'Stop reviewing', value: 'stop' },
      ],
    }]);

    if (action === 'stop') break;
    if (action === 'skip') continue;

    if (action === 'accept') {
      const group = await groupStorage.save({
        articleIds: cluster.articleIds,
        threshold: options.threshold,
        centroid: cluster.centroid,
        commonEntities: entities,
      });
      savedGroups.push(group);
      logger.success(`Saved group ${group.id}`);
      continue;
    }

    if (action === 'remove') {
      const { articlesToRemove } = await inquirer.prompt<{ articlesToRemove: string[] }>([{
        type: 'checkbox',
        name: 'articlesToRemove',
        message: 'Select articles to remove:',
        choices: cluster.articles.map((a, idx) => ({ name: `${idx + 1}. ${a.title}`, value: a.id })),
      }]);

      const remaining = cluster.articles.filter(a => !articlesToRemove.includes(a.id));
      if (remaining.length >= minGroupSize) {
        const group = await groupStorage.save({
          articleIds: remaining.map(a => a.id),
          threshold: options.threshold,
          centroid: cluster.centroid,
          commonEntities: entities,
        });
        savedGroups.push(group);
        logger.success(`Saved modified group ${group.id}`);
      } else {
        logger.warn('Too few articles remaining, group not saved');
      }
      continue;
    }

    if (action === 'merge') {
      await handleMerge(cluster.articles, savedGroups);
    }
  }

  const finalGroups = await manifestManager.getGroupsByStatus('draft');
  logger.success(`\nGrouping complete! Created ${finalGroups.length} group(s)`);
  logger.info('Next: npm run summarize <group-id>');
}
