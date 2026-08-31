import type { DB } from './db.js';
import type { Post, PostPayload, PostRow, PostStatus } from '../types.js';
import { keywordsForPost, setPostKeywords } from './keywords.js';

interface PostDbRow {
  id: number;
  title: string;
  description: string;
  markup: string;
  theme: string;
  status: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

/**
 * The metadata a post's `<head>` block contributes to the index columns. The
 * markup itself stays the source of truth; these are re-derived on every save.
 */
export interface PostInput {
  title: string;
  description?: string;
  markup: string;
  theme?: string;
  keywords?: string[];
}

export interface PostFilter {
  status?: PostStatus;
  keyword?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

const DEFAULT_THEME = 'warm-industrial-1';

function rowToPost(db: DB, r: PostDbRow): Post {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    markup: r.markup,
    theme: r.theme,
    status: r.status as PostStatus,
    keywords: keywordsForPost(db, r.id),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    publishedAt: r.published_at,
  };
}

export function createPost(db: DB, input: PostInput): Post {
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO posts (title, description, markup, theme, status, created_at, updated_at)
    VALUES (@title, @description, @markup, @theme, 'draft', @created_at, @updated_at)
  `);

  const create = db.transaction((): number => {
    const r = insert.run({
      title: input.title,
      description: input.description ?? '',
      markup: input.markup,
      theme: input.theme ?? DEFAULT_THEME,
      created_at: now,
      updated_at: now,
    });
    const id = Number(r.lastInsertRowid);
    setPostKeywords(db, id, input.keywords ?? []);
    return id;
  });

  return findPost(db, create())!;
}

export function findPost(db: DB, id: number): Post | undefined {
  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as PostDbRow | undefined;
  if (!row) return undefined;
  return rowToPost(db, row);
}

/** Posts newest-updated first, optionally narrowed by status, keyword, or text. */
export function queryPosts(db: DB, filter: PostFilter = {}): Post[] {
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (filter.status) {
    where.push('p.status = @status');
    params['status'] = filter.status;
  }
  if (filter.keyword) {
    where.push(`p.id IN (
      SELECT pk.post_id FROM post_keywords pk
      JOIN keywords k ON k.id = pk.keyword_id
      WHERE k.name = @keyword
    )`);
    params['keyword'] = filter.keyword;
  }
  if (filter.search) {
    where.push('(p.title LIKE @search OR p.description LIKE @search OR p.markup LIKE @search)');
    params['search'] = `%${filter.search}%`;
  }

  params['limit'] = filter.limit ?? 100;
  params['offset'] = filter.offset ?? 0;

  const rows = db
    .prepare(
      `SELECT p.* FROM posts p
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY p.updated_at DESC, p.id DESC
       LIMIT @limit OFFSET @offset`,
    )
    .all(params) as PostDbRow[];
  return rows.map((r) => rowToPost(db, r));
}

/** Replace a post's markup and re-derive its index columns and keywords. */
export function updatePost(db: DB, id: number, input: PostInput): Post | undefined {
  const now = new Date().toISOString();
  const update = db.prepare(`
    UPDATE posts
    SET title = @title, description = @description, markup = @markup,
        theme = @theme, updated_at = @updated_at
    WHERE id = @id
  `);

  const apply = db.transaction((): boolean => {
    const r = update.run({
      id,
      title: input.title,
      description: input.description ?? '',
      markup: input.markup,
      theme: input.theme ?? DEFAULT_THEME,
      updated_at: now,
    });
    if (r.changes === 0) return false;
    setPostKeywords(db, id, input.keywords ?? []);
    return true;
  });

  if (!apply()) return undefined;
  return findPost(db, id);
}

/**
 * Move a post between `draft` and `published`. Publishing stamps
 * `published_at`; returning to draft clears it.
 */
export function setPostStatus(db: DB, id: number, status: PostStatus): Post | undefined {
  const now = new Date().toISOString();
  const r = db
    .prepare(
      `UPDATE posts
       SET status = @status,
           published_at = CASE WHEN @status = 'published' THEN @now ELSE NULL END,
           updated_at = @now
       WHERE id = @id`,
    )
    .run({ id, status, now });
  if (r.changes === 0) return undefined;
  return findPost(db, id);
}

/** Delete a post; its keywords links and render records cascade away with it. */
export function removePost(db: DB, id: number): Post | undefined {
  const existing = findPost(db, id);
  if (!existing) return undefined;
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  return existing;
}

export function countPosts(db: DB, status?: PostStatus): number {
  const row = status
    ? (db.prepare('SELECT COUNT(*) AS n FROM posts WHERE status = ?').get(status) as { n: number })
    : (db.prepare('SELECT COUNT(*) AS n FROM posts').get() as { n: number });
  return row.n;
}

// ---- Legacy compatibility ----
// Schema v3 dropped `posts.payload`; the v2 wizard routes still import these
// names. They report "no such post" because, after the v3 migration, there are
// none. Brief 62 rewires the routes and deletes this block.

/** @deprecated Payload posts no longer exist. Use findPost. */
export function getPost(_db: DB, _id: number): PostRow | undefined {
  return undefined;
}

/** @deprecated Payload posts no longer exist. Use queryPosts. */
export function listPosts(_db: DB, _opts: { limit?: number } = {}): PostRow[] {
  return [];
}

/** @deprecated Payload posts no longer exist. Use removePost. */
export function deletePost(_db: DB, _id: number): PostRow | undefined {
  return undefined;
}

/** @deprecated Payload posts no longer exist. Use updatePost with `.wzd` markup. */
export function updatePostPayload(_db: DB, _id: number, _payload: PostPayload): PostRow | undefined {
  throw new Error('posts.payload was removed in schema v3 — use updatePost with .wzd markup');
}

/** @deprecated Renders are recorded in the `renders` table. Use recordRender. */
export function markRendered(_db: DB, _id: number, _outputDir: string): PostRow | undefined {
  throw new Error('posts.output_dir was removed in schema v3 — use recordRender');
}
