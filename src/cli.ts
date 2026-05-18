import { cac } from 'cac';
import { log } from './util/logger.js';
import { run } from './run.js';
import { sourcesCmd } from './commands/sources.js';
import { listCmd } from './commands/list.js';
import { cleanCmd } from './commands/clean.js';

const cli = cac('newspapper');

cli
  .command('run', "Scrape today's RSS feeds, compose a post, render slides")
  .option('--max-per-source <n>', 'Cap articles taken per source')
  .option('--theme <name>', 'Design system to render with')
  .option('--model <name>', 'Override the Ollama model')
  .option('--dry-run', 'Skip rendering; print the post JSON')
  .option('--no-scrape', 'Skip scrape; compose from articles already in the DB for today')
  .action(async (options: Record<string, unknown>) => {
    try {
      await run({
        maxPerSource: options.maxPerSource ? Number(options.maxPerSource) : undefined,
        theme: typeof options.theme === 'string' ? options.theme : undefined,
        model: typeof options.model === 'string' ? options.model : undefined,
        dryRun: options.dryRun === true,
        noScrape: options.scrape === false,
      });
    } catch (err) {
      log.error((err as Error).message);
      process.exit(1);
    }
  });

cli.command('sources', 'List and ping configured RSS feeds').action(async () => {
  try {
    await sourcesCmd();
  } catch (err) {
    log.error((err as Error).message);
    process.exit(1);
  }
});

cli.command('list', 'Show recent posts from the DB').action(async () => {
  try {
    await listCmd();
  } catch (err) {
    log.error((err as Error).message);
    process.exit(1);
  }
});

cli.command('clean', 'Delete old output folders and DB rows').action(async () => {
  try {
    await cleanCmd();
  } catch (err) {
    log.error((err as Error).message);
    process.exit(1);
  }
});

cli.help();
cli.version('2.0.0');
cli.parse();
