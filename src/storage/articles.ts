import type { DB } from './db.js';

export interface NewArticle {
  source_id: string;
  url: string;
  title: string;
  summary: string;
  body: string;
  published_at: string;
}

export interface Article extends NewArticle {
  id: number;
  scraped_at: string;
}

export function insertMany(db: DB, rows: NewArticle[]): number {
  if (rows.length === 0) return 0;
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO articles
      (source_id, url, title, summary, body, published_at, scraped_at)
    VALUES
      (@source_id, @url, @title, @summary, @body, @published_at, @scraped_at)
  `);
  const now = new Date().toISOString();
  let inserted = 0;
  const tx = db.transaction((items: NewArticle[]) => {
    for (const row of items) {
      const r = stmt.run({ ...row, scraped_at: now });
      if (r.changes > 0) inserted += 1;
    }
  });
  tx(rows);
  return inserted;
}

export function existsByUrl(db: DB, url: string): boolean {
  const row = db.prepare('SELECT 1 FROM articles WHERE url = ? LIMIT 1').get(url);
  return row !== undefined;
}

export function todays(db: DB, date: string): Article[] {
  return db
    .prepare(
      `SELECT * FROM articles
       WHERE substr(published_at, 1, 10) = ?
       ORDER BY published_at DESC`,
    )
    .all(date) as Article[];
}
