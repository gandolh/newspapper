import type { DB } from './db.js';
import type { Article } from '../types.js';

// ---- Raw DB row shape ----
interface ArticleRow {
  id: number;
  source_id: string;
  source_name: string;
  title: string;
  url: string | null;
  published_at: string;
  body: string;
  created_at: string;
}

function rowToArticle(r: ArticleRow): Article {
  return {
    id: r.id,
    sourceId: r.source_id,
    sourceName: r.source_name,
    title: r.title,
    url: r.url,
    publishedAt: r.published_at,
    body: r.body,
    createdAt: r.created_at,
  };
}

// ---- Public API ----

export interface NewArticle {
  source_id: string;
  source_name: string;
  url: string | null;
  title: string;
  body: string;
  published_at: string;
}

/**
 * Upsert articles by URL (dedupe). Rows with a null/empty URL are inserted with
 * INSERT OR IGNORE (duplicate nulls are allowed since UNIQUE ignores NULLs in SQLite).
 * Returns the count of newly inserted rows.
 */
export function upsertArticles(db: DB, rows: NewArticle[]): number {
  if (rows.length === 0) return 0;
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO articles
      (source_id, source_name, url, title, body, published_at, created_at)
    VALUES
      (@source_id, @source_name, @url, @title, @body, @published_at, @created_at)
  `);
  const now = new Date().toISOString();
  let inserted = 0;
  const tx = db.transaction((items: NewArticle[]) => {
    for (const row of items) {
      const r = stmt.run({ ...row, created_at: now });
      if (r.changes > 0) inserted += 1;
    }
  });
  tx(rows);
  return inserted;
}

/** Returns all articles whose published_at date portion equals `date` (YYYY-MM-DD). */
export function articlesForDate(db: DB, date: string): Article[] {
  const rows = db
    .prepare(
      `SELECT * FROM articles
       WHERE substr(published_at, 1, 10) = ?
       ORDER BY published_at DESC`,
    )
    .all(date) as ArticleRow[];
  return rows.map(rowToArticle);
}

/** Insert a manually supplied article (source_id = 'manual'). */
export function addManualArticle(
  db: DB,
  args: { title: string; url?: string; sourceName?: string; body?: string },
): Article {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO articles (source_id, source_name, url, title, body, published_at, created_at)
    VALUES (@source_id, @source_name, @url, @title, @body, @published_at, @created_at)
  `);
  const r = stmt.run({
    source_id: 'manual',
    source_name: args.sourceName ?? 'Manual',
    url: args.url ?? null,
    title: args.title,
    body: args.body ?? '',
    published_at: now,
    created_at: now,
  });
  return {
    id: Number(r.lastInsertRowid),
    sourceId: 'manual',
    sourceName: args.sourceName ?? 'Manual',
    title: args.title,
    url: args.url ?? null,
    publishedAt: now,
    body: args.body ?? '',
    createdAt: now,
  };
}

/** Fetch specific articles by their IDs. Preserves order of returned rows (not input order). */
export function getArticlesByIds(db: DB, ids: number[]): Article[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const rows = db
    .prepare(`SELECT * FROM articles WHERE id IN (${placeholders}) ORDER BY published_at DESC`)
    .all(...ids) as ArticleRow[];
  return rows.map(rowToArticle);
}

// ---- Legacy compatibility (used by old scrape/index.ts) ----

/** @deprecated Use upsertArticles */
export function insertMany(db: DB, rows: Array<{ source_id: string; url: string; title: string; summary?: string; body: string; published_at: string }>): number {
  const mapped: NewArticle[] = rows.map((r) => ({
    source_id: r.source_id,
    source_name: '',
    url: r.url,
    title: r.title,
    body: r.body,
    published_at: r.published_at,
  }));
  return upsertArticles(db, mapped);
}

/** @deprecated Use articlesForDate */
export function todays(db: DB, date: string): Article[] {
  return articlesForDate(db, date);
}

/** @deprecated */
export function existsByUrl(db: DB, url: string): boolean {
  const row = db.prepare('SELECT 1 FROM articles WHERE url = ? LIMIT 1').get(url);
  return row !== undefined;
}
