import type { DB } from './db.js';
import type { RenderRecord } from '../types.js';

interface RenderDbRow {
  id: number;
  post_id: number;
  output_dir: string;
  slide_count: number;
  optimized: number;
  created_at: string;
}

function rowToRender(r: RenderDbRow): RenderRecord {
  return {
    id: r.id,
    postId: r.post_id,
    outputDir: r.output_dir,
    slideCount: r.slide_count,
    optimized: r.optimized !== 0,
    createdAt: r.created_at,
  };
}

export interface NewRender {
  postId: number;
  outputDir: string;
  slideCount?: number;
  optimized?: boolean;
}

export function recordRender(db: DB, input: NewRender): RenderRecord {
  const now = new Date().toISOString();
  const row = {
    post_id: input.postId,
    output_dir: input.outputDir,
    slide_count: input.slideCount ?? 0,
    optimized: input.optimized ? 1 : 0,
    created_at: now,
  };
  const r = db
    .prepare(
      `INSERT INTO renders (post_id, output_dir, slide_count, optimized, created_at)
       VALUES (@post_id, @output_dir, @slide_count, @optimized, @created_at)`,
    )
    .run(row);
  return rowToRender({ ...row, id: Number(r.lastInsertRowid) });
}

/** The render a post's export and thumbnail should read from. */
export function latestRender(db: DB, postId: number): RenderRecord | undefined {
  const row = db
    .prepare('SELECT * FROM renders WHERE post_id = ? ORDER BY id DESC LIMIT 1')
    .get(postId) as RenderDbRow | undefined;
  return row ? rowToRender(row) : undefined;
}

export function listRenders(db: DB, postId: number): RenderRecord[] {
  const rows = db
    .prepare('SELECT * FROM renders WHERE post_id = ? ORDER BY id DESC')
    .all(postId) as RenderDbRow[];
  return rows.map(rowToRender);
}

export function findRender(db: DB, id: number): RenderRecord | undefined {
  const row = db.prepare('SELECT * FROM renders WHERE id = ?').get(id) as RenderDbRow | undefined;
  return row ? rowToRender(row) : undefined;
}

/** Flag a render as having been through the publish-time optimization pass. */
export function markRenderOptimized(db: DB, id: number): RenderRecord | undefined {
  const r = db.prepare('UPDATE renders SET optimized = 1 WHERE id = ?').run(id);
  if (r.changes === 0) return undefined;
  return findRender(db, id);
}

/** Deletes the row only — the caller owns the output directory on disk. */
export function removeRender(db: DB, id: number): RenderRecord | undefined {
  const existing = findRender(db, id);
  if (!existing) return undefined;
  db.prepare('DELETE FROM renders WHERE id = ?').run(id);
  return existing;
}
