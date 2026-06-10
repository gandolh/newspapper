import type { Config } from '../util/config.js';
import { log } from '../util/logger.js';
import { todayLocal } from '../util/paths.js';
import { open } from '../storage/db.js';
import { todays } from '../storage/articles.js';
import type { PostPayload } from '../types.js';
import { generate } from './ollama.js';
import { buildPrompt } from './prompt.js';
import { parsePost } from './parse.js';

export interface ComposeOptions {
  model?: string;
}

export async function compose(config: Config, opts: ComposeOptions): Promise<PostPayload> {
  const today = todayLocal();
  const db = open(config.dbPath);
  const articles = todays(db, today);
  db.close();

  if (articles.length === 0) {
    throw new Error(`compose: no articles in DB for ${today}`);
  }

  log.info(`compose: feeding ${articles.length} article(s) to Ollama`);
  const prompt = buildPrompt(articles);
  const model = opts.model ?? config.ollamaModel;
  const raw = await generate(config.ollamaHost, model, prompt);

  try {
    const post = parsePost(raw, today, config.theme);
    log.info(`compose: got ${post.slides.length}-slide post — "${post.title}"`);
    return post;
  } catch (err) {
    log.error('compose: failed to parse model output. Raw response:\n' + raw);
    throw err;
  }
}
