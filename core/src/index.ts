// Core library entry point — re-exports all public types and modules.

// Types (canonical source of truth for PostPayload, SlideBlock, Article, PostRow, Theme, etc.)
export * from './types.js';

// Storage
export * from './storage/index.js';

// Scrape
export { fetchBody, stripHtml } from './scrape/body.js';
export { fetchFeed } from './scrape/rss.js';
export type { RssItem } from './scrape/rss.js';
export { searchArticles, pingSource } from './scrape/index.js';
export type {
  SearchOptions,
  SearchResult,
  ScrapedArticle,
  ScrapeProgressEvent,
  PingResult,
} from './scrape/index.js';

// Util
export { loadConfig } from './util/config.js';
export type { Config } from './util/config.js';
export { log } from './util/logger.js';
export { ensureDir, ensureParent, todayLocal, nextOutputDir } from './util/paths.js';

// Render
export * from './render/index.js';

// Themes (Node-only)
export { loadTheme, listThemes } from './themes/index.js';

// Newspapper Wizard (.wzd) — parser, formatter, linter, component catalogue
export * from './wizard/index.js';

// TNode interpreter — the compile target `.wzd` documents render through.
// The JSON template documents, their registry, and `/builder` are gone; see
// decisions.md "The template system is removed".
export { renderTemplate, resolveStyle, validateSlideData } from './templates/interpreter.js';

// Image uploads (Node-only) — store paths, Sharp normalization, ref resolution
export * from './uploads/index.js';
