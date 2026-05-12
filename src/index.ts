#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('newspapper')
  .description('Personal news aggregation and slide generation tool')
  .version('2.0.0');

program
  .command('scrape')
  .description("Scrape today's articles from news sources (max 10/source)")
  .option('--sources <sources>', 'Comma-separated list of source IDs or names')
  .option('--method <method>', 'Force scraper method: http, rss')
  .option('--limit <number>', 'Maximum articles per source', parseInt)
  .action(async (options) => {
    const { scrapeCommand } = await import('./commands/scrape.js');
    await scrapeCommand(options);
  });

program
  .command('extract-entities')
  .description('Extract entities from scraped articles and print summary')
  .action(async () => {
    const { extractEntitiesCommand } = await import('./commands/extract-entities.js');
    await extractEntitiesCommand();
  });

program
  .command('format')
  .description('Generate a post JSON from articles matching given entities (interactive REPL)')
  .requiredOption('--entities <entities>', 'Comma-separated entity names to build post around')
  .option('--tone <tone>', 'Tone of the post', 'friendly')
  .option('--design <design>', 'Design system: warm-industrial, digital-broadsheet', 'warm-industrial')
  .option('--max-slides <number>', 'Maximum number of slides', parseInt, 8)
  .action(async (options) => {
    const { formatCommand } = await import('./commands/format.js');
    await formatCommand(options);
  });

program
  .command('generate')
  .description('Generate slide images from an approved post directory')
  .argument('<post-dir>', 'Path to post directory containing slides.json')
  .action(async (postDir) => {
    const { generateCommand } = await import('./commands/generate.js');
    await generateCommand(postDir);
  });

program
  .command('list')
  .description('List articles, entities, or posts')
  .option('--type <type>', 'What to list: articles, entities, posts', 'articles')
  .option('--status <status>', 'Filter by status (or entity type when --type=entities)')
  .option('--source <source>', 'Filter by source name (articles only)')
  .option('--days <number>', 'Only show items from last N days', parseInt)
  .option('--format <format>', 'Output format: table, json', 'table')
  .action(async (options) => {
    const { listCommand } = await import('./commands/list.js');
    await listCommand(options);
  });

program
  .command('clean')
  .description('Delete old articles and post directories')
  .option('--all', 'Delete ALL articles, entities, and posts from DB')
  .option('--older-than <days>', 'Delete items older than N days', '30d')
  .option('--dry-run', 'Show what would be deleted without deleting')
  .option('--force', 'Skip confirmation prompt')
  .action(async (options) => {
    const { cleanCommand } = await import('./commands/clean.js');
    await cleanCommand(options);
  });

program.parse();
