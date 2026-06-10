// Storage module public surface

export { getDb, open, migrate } from './db.js';
export type { DB } from './db.js';

export {
  upsertArticles,
  articlesForDate,
  addManualArticle,
  getArticlesByIds,
  // legacy
  insertMany,
  todays,
  existsByUrl,
} from './articles.js';
export type { NewArticle } from './articles.js';

export {
  createDraft,
  getPost,
  listPosts,
  updatePostPayload,
  markRendered,
  deletePost,
  // legacy
  insert as insertPost,
  recent as recentPosts,
  nextRunNumber,
} from './posts.js';

export { getSettings, saveSettings } from './settings.js';

export {
  listSources,
  saveSources,
  addSource,
  updateSource,
  removeSource,
} from './sources.js';

export { getPrompt, savePrompt, resetPrompt } from './prompt.js';
