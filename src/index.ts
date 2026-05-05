#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('newspapper')
  .description('Personal news aggregation and summarization tool')
  .version('1.0.0');

program
  .command('scrape')
  .description('Scrape articles from news sources')
  .option('--sources <sources>', 'Comma-separated list of source IDs or names')
  .option('--method <method>', 'Force scraper method: http, playwright, rss')
  .option('--limit <number>', 'Maximum articles per source', parseInt)
  .action(async (options) => {
    const { scrapeCommand } = await import('./commands/scrape.js');
    await scrapeCommand(options);
  });

program
  .command('group')
  .description('Group similar articles into clusters')
  .option('--threshold <number>', 'Similarity threshold (0.0-1.0)', parseFloat, 0.75)
  .option('--method <method>', 'Clustering method: embeddings, entities', 'embeddings')
  .option('--min-group-size <number>', 'Minimum articles per group', parseInt, 2)
  .action(async (options) => {
    const { groupCommand } = await import('./commands/group.js');
    await groupCommand(options);
  });

program
  .command('extract-entities')
  .description('Extract entities from articles')
  .argument('[article-id]', 'Article ID to extract entities from')
  .option('--method <method>', 'Extraction method: compromise, transformers', 'compromise')
  .option('--all', 'Extract entities from all ungrouped articles')
  .action(async (articleId, options) => {
    const { extractEntitiesCommand } = await import('./commands/extract-entities.js');
    await extractEntitiesCommand(articleId, options);
  });

program
  .command('query-entities')
  .description('Search for articles by entity')
  .requiredOption('--type <type>', 'Entity type: person, place, organization, event')
  .requiredOption('--name <name>', 'Entity name to search for')
  .option('--days <number>', 'Look back N days', parseInt, 30)
  .option('--related', 'Show frequently mentioned related entities')
  .option('--timeline', 'Show ASCII article timeline')
  .action(async (options) => {
    const { queryEntitiesCommand } = await import('./commands/query-entities.js');
    await queryEntitiesCommand(options);
  });

program
  .command('summarize')
  .description('Generate summary slides from a group')
  .argument('<group-id>', 'Group ID to summarize')
  .option('--method <method>', 'Summarization method: llm, local, nlp', 'local')
  .option('--tone <tone>', 'Tone: optimistic, analytical', 'analytical')
  .option('--design <design>', 'Design system: broadsheet, industrial', 'broadsheet')
  .option('--max-slides <number>', 'Maximum slides', parseInt, 8)
  .option('--emphasis <text>', 'Key points to emphasize')
  .option('--exclude <ids>', 'Comma-separated article IDs to exclude')
  .action(async (groupId, options) => {
    const { summarizeCommand } = await import('./commands/summarize.js');
    await summarizeCommand(groupId, options);
  });

program
  .command('generate')
  .description('Generate slide images from summary')
  .argument('<group-id>', 'Group ID to generate images for')
  .option('--summary-id <id>', 'Use specific summary ID')
  .option('--format <format>', 'Image format: png, jpg', 'png')
  .option('--quality <number>', 'Compression quality', parseInt, 90)
  .option('--size <size>', 'Image dimensions', '1080x1080')
  .action(async (groupId, options) => {
    const { generateCommand } = await import('./commands/generate.js');
    await generateCommand(groupId, options);
  });

program
  .command('export')
  .description('Export slides and metadata')
  .argument('<group-id>', 'Group ID to export')
  .option('--destination <path>', 'Export destination path')
  .action(async (groupId, options) => {
    const { exportCommand } = await import('./commands/export.js');
    await exportCommand(groupId, options);
  });

program
  .command('clean')
  .description('Delete old articles and groups')
  .option('--older-than <days>', 'Delete items older than N days', '30d')
  .option('--status <status>', 'Only delete items with this status')
  .option('--dry-run', 'Show what would be deleted without deleting')
  .option('--force', 'Skip confirmation prompt')
  .action(async (options) => {
    const { cleanCommand } = await import('./commands/clean.js');
    await cleanCommand(options);
  });

program
  .command('list')
  .description('List articles, groups, or summaries')
  .option('--type <type>', 'What to list: articles, groups, summaries', 'groups')
  .option('--status <status>', 'Filter by status')
  .option('--source <source>', 'Filter by source name')
  .option('--days <number>', 'Only show items from last N days', parseInt)
  .option('--format <format>', 'Output format: table, json', 'table')
  .action(async (options) => {
    const { listCommand } = await import('./commands/list.js');
    await listCommand(options);
  });

program.parse();
