// Core library entry point — re-exports all public types and modules.

// Types (canonical source of truth for PostPayload, SlideBlock, Article, PostRow, Theme, etc.)
export * from './types.js';

// Storage
export * from './storage/index.js';

// Scrape
export { fetchBody, stripHtml } from './scrape/body.js';
export { fetchFeed } from './scrape/rss.js';
export type { RssItem } from './scrape/rss.js';
export { scrape, pingSource } from './scrape/index.js';
export type { ScrapeOptions, ScrapeResult, ScrapeProgressEvent, PingResult } from './scrape/index.js';

// Compose
export {
  OllamaClient,
  OllamaError,
  composePost,
  generateCaption,
  slideAi,
  parseSlide,
  parsePost,
  ComposeParseError,
  DEFAULT_PROMPT,
  VARIANT_SHAPES,
  buildUserPrompt,
} from './compose/index.js';
export type {
  OllamaConfig,
  ComposePostOptions,
  CaptionResult,
  SlideAiAction,
} from './compose/index.js';

// Util
export { loadConfig } from './util/config.js';
export type { Config } from './util/config.js';
export { log } from './util/logger.js';
export { ensureDir, ensureParent, todayLocal, nextOutputDir } from './util/paths.js';

// Render
export * from './render/index.js';

// Themes (Node-only)
export { loadTheme, listThemes } from './themes/index.js';

// Template registry (Node-only) and interpreter
export {
  renderTemplate,
  resolveStyle,
  validateTemplateDoc,
  validateSlideData,
} from './templates/interpreter.js';
export {
  listTemplates,
  loadTemplate,
  saveTemplate,
  deleteTemplate,
  templatesForFamily,
} from './templates/registry.js';
