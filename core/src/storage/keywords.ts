import type { DB } from './db.js';
import type { Keyword } from '../types.js';

interface KeywordDbRow {
  id: number;
  name: string;
  post_count: number;
}

function rowToKeyword(r: KeywordDbRow): Keyword {
  return { id: r.id, name: r.name, postCount: r.post_count };
}

/** Trim, drop empties, and collapse case-insensitive duplicates, keeping first spelling. */
export function normalizeKeywords(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/**
 * Upsert `names` into `keywords` and replace the post's join rows, in one
 * transaction. Returns the normalized names now attached to the post.
 */
export function setPostKeywords(db: DB, postId: number, names: string[]): string[] {
  const normalized = normalizeKeywords(names);

  const insertKeyword = db.prepare('INSERT OR IGNORE INTO keywords (name) VALUES (?)');
  const findKeyword = db.prepare('SELECT id FROM keywords WHERE name = ?');
  const clearJoin = db.prepare('DELETE FROM post_keywords WHERE post_id = ?');
  const insertJoin = db.prepare(
    'INSERT OR IGNORE INTO post_keywords (post_id, keyword_id) VALUES (?, ?)',
  );

  const tx = db.transaction((items: string[]) => {
    clearJoin.run(postId);
    for (const name of items) {
      insertKeyword.run(name);
      const row = findKeyword.get(name) as { id: number } | undefined;
      if (row) insertJoin.run(postId, row.id);
    }
  });
  tx(normalized);

  return normalized;
}

/** The keyword names attached to a post, alphabetical. */
export function keywordsForPost(db: DB, postId: number): string[] {
  const rows = db
    .prepare(
      `SELECT k.name AS name
       FROM post_keywords pk
       JOIN keywords k ON k.id = pk.keyword_id
       WHERE pk.post_id = ?
       ORDER BY k.name COLLATE NOCASE`,
    )
    .all(postId) as Array<{ name: string }>;
  return rows.map((r) => r.name);
}

/** Every keyword with the number of posts using it, most used first. */
export function listKeywords(db: DB): Keyword[] {
  const rows = db
    .prepare(
      `SELECT k.id AS id, k.name AS name, COUNT(pk.post_id) AS post_count
       FROM keywords k
       LEFT JOIN post_keywords pk ON pk.keyword_id = k.id
       GROUP BY k.id
       ORDER BY post_count DESC, k.name COLLATE NOCASE`,
    )
    .all() as KeywordDbRow[];
  return rows.map(rowToKeyword);
}

/** Delete keywords no post references any more. Returns the number removed. */
export function pruneKeywords(db: DB): number {
  const r = db
    .prepare('DELETE FROM keywords WHERE id NOT IN (SELECT keyword_id FROM post_keywords)')
    .run();
  return r.changes;
}
