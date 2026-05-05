import { manifestManager } from '../storage/manifest.js';
import { articleStorage } from '../storage/articles.js';
import { entityStorage } from '../storage/entities.js';
import { entityExtractor } from '../nlp/entity-extractor.js';
import { logger } from '../utils/logger.js';
import ora from 'ora';
import inquirer from 'inquirer';

interface EntitySet {
  people: string[];
  places: string[];
  organizations: string[];
  events: string[];
}

interface ExtractEntitiesOptions {
  method?: string;
  all?: boolean;
}

export function formatSingleArticleSummary(title: string, entities: EntitySet): string {
  const lines: string[] = [`\nExtracted entities from: ${title}`];
  const categories: [keyof EntitySet, string][] = [
    ['people', 'People'],
    ['places', 'Places'],
    ['organizations', 'Organizations'],
    ['events', 'Events'],
  ];
  for (const [key, label] of categories) {
    const items = entities[key];
    if (items.length === 0) continue;
    const preview = items.slice(0, 5).join(', ');
    lines.push(`  ${label} (${items.length}): ${preview}`);
  }
  return lines.join('\n');
}

export function formatAggregateSummary(entitySets: EntitySet[]): string {
  const unique = {
    people: new Set<string>(),
    places: new Set<string>(),
    organizations: new Set<string>(),
    events: new Set<string>(),
  };
  for (const set of entitySets) {
    for (const p of set.people) unique.people.add(p.toLowerCase());
    for (const p of set.places) unique.places.add(p.toLowerCase());
    for (const o of set.organizations) unique.organizations.add(o.toLowerCase());
    for (const e of set.events) unique.events.add(e.toLowerCase());
  }
  return [
    '\nEntity extraction summary:',
    `  Unique people: ${unique.people.size}`,
    `  Unique places: ${unique.places.size}`,
    `  Unique organizations: ${unique.organizations.size}`,
    `  Unique events: ${unique.events.size}`,
  ].join('\n');
}

export async function extractEntitiesCommand(articleId: string | undefined, options: ExtractEntitiesOptions): Promise<void> {
  await manifestManager.load();

  let articleIds: string[];

  if (articleId) {
    articleIds = [articleId];
  } else if (options.all) {
    const entries = await manifestManager.getArticlesByStatus('scraped');
    if (entries.length === 0) {
      logger.warn('No scraped articles found for entity extraction');
      process.exit(0);
    }
    logger.info(`Extracting entities from ${entries.length} articles`);
    articleIds = entries.map(e => e.id);
  } else {
    const entries = await manifestManager.getArticlesByStatus('scraped');
    if (entries.length === 0) {
      logger.warn('No scraped articles found');
      process.exit(0);
    }
    const { selected } = await inquirer.prompt<{ selected: string[] }>([{
      type: 'checkbox',
      name: 'selected',
      message: 'Select articles to extract entities from:',
      choices: entries.map(e => ({ name: e.title, value: e.id })),
    }]);
    if (selected.length === 0) {
      logger.warn('No articles selected');
      process.exit(0);
    }
    articleIds = selected;
  }

  const method = options.method ?? 'compromise';
  const spinner = ora('Extracting entities...').start();
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const extractedSets: EntitySet[] = [];

  for (let i = 0; i < articleIds.length; i++) {
    const id = articleIds[i];
    spinner.text = `Extracting entities (${i + 1}/${articleIds.length})...`;

    try {
      const article = await articleStorage.load(id);
      if (!article) {
        logger.warn(`Article ${id} not found`);
        failed++;
        continue;
      }

      const existing = await entityStorage.load(id);
      if (existing) {
        spinner.stop();
        const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([{
          type: 'confirm',
          name: 'overwrite',
          message: `"${article.title}" already has entities. Overwrite?`,
          default: false,
        }]);
        spinner.start();
        if (!overwrite) {
          skipped++;
          continue;
        }
      }

      const entities = await entityExtractor.extract(article.body, method);
      await entityStorage.save(id, { method, entities });
      extractedSets.push(entities);
      processed++;
    } catch (err) {
      logger.warn(`Failed to extract entities from ${id}: ${(err as Error).message}`);
      failed++;
    }
  }

  const skippedFailed = [
    skipped > 0 ? `${skipped} skipped` : '',
    failed > 0 ? `${failed} failed` : '',
  ].filter(Boolean).join(', ');

  spinner.succeed(`Extracted entities from ${processed} article${processed !== 1 ? 's' : ''}${skippedFailed ? ` (${skippedFailed})` : ''}`);

  if (failed > 0) {
    logger.warn(`Failed to process ${failed} article${failed !== 1 ? 's' : ''}`);
  }

  if (articleIds.length === 1 && extractedSets.length === 1 && articleId) {
    const article = await articleStorage.load(articleId);
    if (article) {
      console.log(formatSingleArticleSummary(article.title, extractedSets[0]));
    }
  } else if (extractedSets.length > 0) {
    console.log(formatAggregateSummary(extractedSets));
  }
}
