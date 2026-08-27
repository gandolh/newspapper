import type { DB } from './db.js';
import type { Article } from '../types.js';

interface ArticleDbRow {
  id: number;
  source_id: string | null;
  source_name: string;
  guid: string;
  title: string;
  url: string | null;
  body: string;
  published_at: string;
  saved_at: string;
}

function rowToArticle(r: ArticleDbRow): Article {
  return {
    id: r.id,
    sourceId: r.source_id,
    sourceName: r.source_name,
    guid: r.guid,
    title: r.title,
    url: r.url,
    body: r.body,
    publishedAt: r.published_at,
    savedAt: r.saved_at,
  };
}

export interface NewArticle {
  sourceId?: string | null;
  sourceName?: string;
  guid?: string;
  title: string;
  url?: string | null;
  body?: string;
  publishedAt?: string;
}

/**
 * A saved article keeps `source_name` as a snapshot, so it survives its source
 * being deleted. An id that is not (or no longer) a known source is stored as
 * NULL for the same reason.
 */
function resolveSourceId(db: DB, sourceId: string | null | undefined): string | null {
  if (!sourceId) return null;
  const row = db.prepare('SELECT id FROM sources WHERE id = ?').get(sourceId) as
    | { id: string }
    | undefined;
  return row ? row.id : null;
}

/**
 * Save an article to the library. Idempotent on (source_id, guid) — and on
 * guid alone for source-less articles, where the UNIQUE constraint cannot
 * apply because SQLite treats NULLs as distinct.
 */
export function saveArticle(db: DB, input: NewArticle): Article {
  return saveOne(db, input).article;
}

function saveOne(db: DB, input: NewArticle): { article: Article; inserted: boolean } {
  const now = new Date().toISOString();
  const sourceId = resolveSourceId(db, input.sourceId);
  const guid = input.guid ?? input.url ?? `${input.title}::${input.publishedAt ?? now}`;

  const row = {
    source_id: sourceId,
    source_name: input.sourceName ?? '',
    guid,
    title: input.title,
    url: input.url ?? null,
    body: input.body ?? '',
    published_at: input.publishedAt ?? now,
    saved_at: now,
  };

  const existing = db
    .prepare(
      `SELECT * FROM articles
       WHERE guid = @guid AND (source_id IS @source_id)`,
    )
    .get({ guid, source_id: sourceId }) as ArticleDbRow | undefined;
  if (existing) return { article: rowToArticle(existing), inserted: false };

  const r = db
    .prepare(
      `INSERT INTO articles
         (source_id, source_name, guid, title, url, body, published_at, saved_at)
       VALUES
         (@source_id, @source_name, @guid, @title, @url, @body, @published_at, @saved_at)`,
    )
    .run(row);

  return { article: rowToArticle({ ...row, id: Number(r.lastInsertRowid) }), inserted: true };
}

/** Save many articles in one transaction. Returns the count of new rows. */
export function saveArticles(db: DB, rows: NewArticle[]): number {
  if (rows.length === 0) return 0;
  let inserted = 0;
  const tx = db.transaction((items: NewArticle[]) => {
    for (const item of items) {
      if (saveOne(db, item).inserted) inserted += 1;
    }
  });
  tx(rows);
  return inserted;
}

export function countArticles(db: DB): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM articles').get() as { n: number };
  return row.n;
}

export interface ArticleFilter {
  search?: string;
  sourceId?: string;
  limit?: number;
  offset?: number;
}

/** Saved articles, most recently saved first. */
export function listArticles(db: DB, filter: ArticleFilter = {}): Article[] {
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (filter.sourceId) {
    where.push('source_id = @source_id');
    params['source_id'] = filter.sourceId;
  }
  if (filter.search) {
    where.push('(title LIKE @search OR body LIKE @search)');
    params['search'] = `%${filter.search}%`;
  }
  params['limit'] = filter.limit ?? 100;
  params['offset'] = filter.offset ?? 0;

  const rows = db
    .prepare(
      `SELECT * FROM articles
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY saved_at DESC, id DESC
       LIMIT @limit OFFSET @offset`,
    )
    .all(params) as ArticleDbRow[];
  return rows.map(rowToArticle);
}

export function findArticle(db: DB, id: number): Article | undefined {
  const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as ArticleDbRow | undefined;
  return row ? rowToArticle(row) : undefined;
}

export function getArticlesByIds(db: DB, ids: number[]): Article[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const rows = db
    .prepare(`SELECT * FROM articles WHERE id IN (${placeholders}) ORDER BY published_at DESC`)
    .all(...ids) as ArticleDbRow[];
  return rows.map(rowToArticle);
}

export function removeArticle(db: DB, id: number): Article | undefined {
  const existing = findArticle(db, id);
  if (!existing) return undefined;
  db.prepare('DELETE FROM articles WHERE id = ?').run(id);
  return existing;
}
