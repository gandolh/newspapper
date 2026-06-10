// Core library entry point — re-exports all public types and modules.

// Types (canonical source of truth for PostPayload, SlideBlock, Article, PostRow, Theme, etc.)
export * from './types.js';

// Storage — exclude types that conflict with canonical types.ts exports
export { open, migrate } from './storage/db.js';
export type { DB } from './storage/db.js';
export {
  insertMany,
  existsByUrl,
  todays,
} from './storage/articles.js';
export type {
  NewArticle,
  Article as DbArticle,
} from './storage/articles.js';
export {
  nextRunNumber,
  insert as insertPost,
  recent as recentPosts,
} from './storage/posts.js';
export type { Post } from './storage/posts.js';

// Scrape
export { fetchBody, stripHtml } from './scrape/body.js';
export { fetchFeed } from './scrape/rss.js';
export type { RssItem } from './scrape/rss.js';
export { loadSources, scrape } from './scrape/index.js';
export type { ScrapeOptions } from './scrape/index.js';

// Compose
export { generate } from './compose/ollama.js';
export { buildPrompt } from './compose/prompt.js';
export { parsePost, ComposeParseError } from './compose/parse.js';
export { compose } from './compose/index.js';
export type { ComposeOptions } from './compose/index.js';

// Util
export { loadConfig } from './util/config.js';
export type { Config } from './util/config.js';
export { log } from './util/logger.js';
export { ensureDir, ensureParent, todayLocal, nextOutputDir } from './util/paths.js';
