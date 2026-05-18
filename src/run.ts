import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig, type Config } from './util/config.js';
import { log } from './util/logger.js';
import { ensureDir, nextOutputDir } from './util/paths.js';
import { scrape } from './scrape/index.js';
import { compose } from './compose/index.js';
import { render } from './render/index.js';

export interface RunOptions {
  maxPerSource?: number;
  theme?: string;
  model?: string;
  dryRun?: boolean;
  noScrape?: boolean;
}

export async function run(opts: RunOptions): Promise<void> {
  const baseConfig = loadConfig();
  const config: Config = Object.freeze({
    ...baseConfig,
    ...(opts.theme ? { theme: opts.theme } : {}),
  });

  ensureDir(config.outputDir);

  if (!opts.noScrape) {
    await scrape(config, { maxPerSource: opts.maxPerSource ?? config.maxArticlesPerSource });
  } else {
    log.info('scrape: skipped (--no-scrape)');
  }

  const post = await compose(config, { model: opts.model });

  if (opts.dryRun) {
    const { dir } = nextOutputDir(config.outputDir, post.date);
    const file = join(dir, 'slides.json');
    writeFileSync(file, JSON.stringify(post, null, 2) + '\n');
    log.info(`dry-run: wrote ${file} (no PNGs)`);
    return;
  }

  const { outputDir, runNumber } = await render(post, config);
  log.info(`done: run ${runNumber} → ${outputDir}`);
}
