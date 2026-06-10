import type { DB } from './db.js';
import type { PostPayload, PostRow } from '../types.js';

// ---- Raw DB row shape ----
interface PostDbRow {
  id: number;
  date: string;
  title: string;
  theme: string;
  payload: string;
  status: string;
  output_dir: string | null;
  created_at: string;
  updated_at: string;
}

function rowToPostRow(r: PostDbRow): PostRow {
  return {
    id: r.id,
    date: r.date,
    title: r.title,
    theme: r.theme,
    payload: JSON.parse(r.payload) as PostPayload,
    status: r.status as 'draft' | 'rendered',
    outputDir: r.output_dir,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ---- Public API ----

/** Create a new draft post from a PostPayload. Returns the persisted PostRow. */
export function createDraft(db: DB, payload: PostPayload): PostRow {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO posts (date, title, theme, payload, status, output_dir, created_at, updated_at)
    VALUES (@date, @title, @theme, @payload, 'draft', NULL, @created_at, @updated_at)
  `);
  const r = stmt.run({
    date: payload.date,
    title: payload.title,
    theme: payload.theme,
    payload: JSON.stringify(payload),
    created_at: now,
    updated_at: now,
  });
  return {
    id: Number(r.lastInsertRowid),
    date: payload.date,
    title: payload.title,
    theme: payload.theme,
    payload,
    status: 'draft',
    outputDir: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Fetch a single post by ID. Returns undefined if not found. */
export function getPost(db: DB, id: number): PostRow | undefined {
  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as PostDbRow | undefined;
  if (!row) return undefined;
  return rowToPostRow(row);
}

/** List posts newest first. */
export function listPosts(db: DB, opts: { limit?: number } = {}): PostRow[] {
  const limit = opts.limit ?? 50;
  const rows = db
    .prepare('SELECT * FROM posts ORDER BY id DESC LIMIT ?')
    .all(limit) as PostDbRow[];
  return rows.map(rowToPostRow);
}

/**
 * Replace the payload of a post (draft or rendered) and reset status to 'draft'.
 * Bumps updated_at.
 */
export function updatePostPayload(db: DB, id: number, payload: PostPayload): PostRow | undefined {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE posts
    SET payload = @payload, title = @title, theme = @theme,
        status = 'draft', output_dir = NULL, updated_at = @updated_at
    WHERE id = @id
  `).run({
    payload: JSON.stringify(payload),
    title: payload.title,
    theme: payload.theme,
    updated_at: now,
    id,
  });
  return getPost(db, id);
}

/** Mark a post as rendered and record its output directory. Bumps updated_at. */
export function markRendered(db: DB, id: number, outputDir: string): PostRow | undefined {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE posts
    SET status = 'rendered', output_dir = @output_dir, updated_at = @updated_at
    WHERE id = @id
  `).run({ output_dir: outputDir, updated_at: now, id });
  return getPost(db, id);
}

/**
 * Delete a post and return the deleted row (so callers can clean up its output dir).
 * Returns undefined if no such post exists.
 */
export function deletePost(db: DB, id: number): PostRow | undefined {
  const existing = getPost(db, id);
  if (!existing) return undefined;
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  return existing;
}

// ---- Legacy compatibility ----

/** @deprecated Use createDraft */
export function insert(
  db: DB,
  args: { date: string; runNumber: number; payload: PostPayload; outputDir: string },
): PostRow {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO posts (date, title, theme, payload, status, output_dir, created_at, updated_at)
    VALUES (@date, @title, @theme, @payload, 'rendered', @output_dir, @created_at, @updated_at)
  `);
  const r = stmt.run({
    date: args.date,
    title: args.payload.title ?? '',
    theme: args.payload.theme ?? 'warm-industrial',
    payload: JSON.stringify(args.payload),
    output_dir: args.outputDir,
    created_at: now,
    updated_at: now,
  });
  return {
    id: Number(r.lastInsertRowid),
    date: args.date,
    title: args.payload.title ?? '',
    theme: args.payload.theme ?? 'warm-industrial',
    payload: args.payload,
    status: 'rendered',
    outputDir: args.outputDir,
    createdAt: now,
    updatedAt: now,
  };
}

/** @deprecated Use listPosts */
export function recent(db: DB, limit: number): PostRow[] {
  return listPosts(db, { limit });
}

/** @deprecated */
export function nextRunNumber(db: DB, date: string): number {
  const row = db
    .prepare("SELECT COUNT(*) AS cnt FROM posts WHERE date = ?")
    .get(date) as { cnt: number };
  return row.cnt + 1;
}
