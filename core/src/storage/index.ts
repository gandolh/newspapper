// Storage module public surface

export { getDb, open, migrate } from './db.js';
export type { DB } from './db.js';

export {
  saveArticle,
  saveArticles,
  listArticles,
  findArticle,
  getArticlesByIds,
  removeArticle,
  countArticles,
  // legacy
  upsertArticles,
  articlesForDate,
  addManualArticle,
  insertMany,
  todays,
  existsByUrl,
} from './articles.js';
export type { NewArticle, ArticleFilter } from './articles.js';

export {
  createPost,
  findPost,
  queryPosts,
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
  listKeywords,
  pruneKeywords,
  normalizeKeywords,
} from './keywords.js';

export {
  recordRender,
  latestRender,
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

export {
  createUser,
  findUser,
  findUserByUsername,
  listUsers,
  countUsers,
  setUserPassword,
  removeUser,
} from './users.js';

export { getSettings, saveSettings } from './settings.js';

export {
  listSources,
  getSource,
  saveSources,
  addSource,
  updateSource,
  removeSource,
} from './sources.js';
