// Storage module public surface

export { getDb, open, migrate } from './db.js';
export type { DB } from './db.js';

export {
  saveArticle,
  saveArticles,
  listArticles,
  listArticleSummaries,
  findArticle,
  getArticlesByIds,
  removeArticle,
  countArticles,
  updateArticleNote,
} from './articles.js';
export type { NewArticle, ArticleFilter } from './articles.js';

export {
  createPost,
  findPost,
  queryPosts,
  queryPostSummaries,
  updatePost,
  setPostStatus,
  removePost,
  countPosts,
  // legacy
  getPost,
  listPosts,
  deletePost,
  updatePostPayload,
  markRendered,
} from './posts.js';
export type { PostInput, PostFilter } from './posts.js';

export {
  setPostKeywords,
  keywordsForPost,
  keywordsForPosts,
  listKeywords,
  pruneKeywords,
  normalizeKeywords,
} from './keywords.js';

export {
  recordRender,
  latestRender,
  latestRenders,
  listRenders,
  findRender,
  markRenderOptimized,
  removeRender,
} from './renders.js';
export type { NewRender } from './renders.js';

export {
  createUpload,
  findUpload,
  listUploads,
  setUploadNormalizedPath,
  removeUpload,
} from './uploads.js';
export type { NewUpload } from './uploads.js';

/*
 * `users.ts` is gone (2026-09-06). newspapper holds no accounts: identity is
 * Ward's, and this app's rows are keyed on nothing user-shaped — a post, an
 * article and a render belong to the installation rather than to a person,
 * which is why nothing below needed re-keying when the accounts left.
 */

export { getSettings, saveSettings } from './settings.js';

export {
  listSources,
  getSource,
  saveSources,
  addSource,
  updateSource,
  removeSource,
  normalizeCategory,
} from './sources.js';

export {
  insertFeedItems,
  listFeedItems,
  getFeedItem,
  setFeedItemRead,
  markFeedItemsRead,
  getReaderCounts,
  purgeFeedItems,
  saveFeedItemToLibrary,
  filterTerms,
  capUtf8,
  InvalidCursorError,
  MAX_CONTENT_HTML_BYTES,
  EXCERPT_MAX_CHARS,
  KEEP_NEWEST_PER_SOURCE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from './feed-items.js';
export type {
  NewFeedItem,
  FeedItemScope,
  FeedItemQuery,
  MarkReadScope,
  PurgeOptions,
} from './feed-items.js';
