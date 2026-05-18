import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Config } from '../util/config.js';
import { log } from '../util/logger.js';
import { nextOutputDir } from '../util/paths.js';
import { open } from '../storage/db.js';
import { insert as insertPost, nextRunNumber } from '../storage/posts.js';
import type { PostPayload } from '../storage/posts.js';
import { loadTheme } from './theme.js';
import { renderSlide } from './slides/index.js';
import { toSvg } from './satori.js';
import { toPng } from './resvg.js';

export interface RenderResult {
  outputDir: string;
  runNumber: number;
}

export async function render(post: PostPayload, config: Config): Promise<RenderResult> {
  const theme = loadTheme(post.theme);
  const { dir, runNumber } = nextOutputDir(config.outputDir, post.date);

  log.info(`render: ${post.slides.length} slide(s) → ${dir}`);
  const total = post.slides.length;
  for (let i = 0; i < post.slides.length; i += 1) {
    const slide = post.slides[i];
    const node = renderSlide(slide, theme, i + 1, total);
    const svg = await toSvg(node);
    const png = toPng(svg);
    const file = join(dir, `${i + 1}.png`);
    writeFileSync(file, png);
    log.info(`  wrote ${i + 1}.png (${slide.variant})`);
  }

  writeFileSync(join(dir, 'slides.json'), JSON.stringify(post, null, 2) + '\n');

  const db = open(config.dbPath);
  const dbRunNumber = Math.max(runNumber, nextRunNumber(db, post.date));
  insertPost(db, {
    date: post.date,
    runNumber: dbRunNumber,
    payload: post,
    outputDir: dir,
  });
  db.close();

  return { outputDir: dir, runNumber };
}
