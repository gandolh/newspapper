import type { DB } from './db.js';
import type { Upload } from '../types.js';

interface UploadDbRow {
  id: number;
  filename: string;
  stored_path: string;
  normalized_path: string | null;
  mime: string;
  width: number | null;
  height: number | null;
  bytes: number;
  created_at: string;
}

function rowToUpload(r: UploadDbRow): Upload {
  return {
    id: r.id,
    filename: r.filename,
    storedPath: r.stored_path,
    normalizedPath: r.normalized_path,
    mime: r.mime,
    width: r.width,
    height: r.height,
    bytes: r.bytes,
    createdAt: r.created_at,
  };
}

export interface NewUpload {
  filename: string;
  storedPath: string;
  normalizedPath?: string | null;
  mime: string;
  width?: number | null;
  height?: number | null;
  bytes?: number;
}

export function createUpload(db: DB, input: NewUpload): Upload {
  const now = new Date().toISOString();
  const row = {
    filename: input.filename,
    stored_path: input.storedPath,
    normalized_path: input.normalizedPath ?? null,
    mime: input.mime,
    width: input.width ?? null,
    height: input.height ?? null,
    bytes: input.bytes ?? 0,
    created_at: now,
  };
  const r = db
    .prepare(
      `INSERT INTO uploads
         (filename, stored_path, normalized_path, mime, width, height, bytes, created_at)
       VALUES
         (@filename, @stored_path, @normalized_path, @mime, @width, @height, @bytes, @created_at)`,
    )
    .run(row);
  return rowToUpload({ ...row, id: Number(r.lastInsertRowid) });
}

export function findUpload(db: DB, id: number): Upload | undefined {
  const row = db.prepare('SELECT * FROM uploads WHERE id = ?').get(id) as UploadDbRow | undefined;
  return row ? rowToUpload(row) : undefined;
}

export function listUploads(db: DB, opts: { limit?: number; offset?: number } = {}): Upload[] {
  const rows = db
    .prepare('SELECT * FROM uploads ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?')
    .all(opts.limit ?? 100, opts.offset ?? 0) as UploadDbRow[];
  return rows.map(rowToUpload);
}

/** Record the normalized derivative Sharp produced for an upload. */
export function setUploadNormalizedPath(
  db: DB,
  id: number,
  normalizedPath: string | null,
): Upload | undefined {
  const r = db
    .prepare('UPDATE uploads SET normalized_path = ? WHERE id = ?')
    .run(normalizedPath, id);
  if (r.changes === 0) return undefined;
  return findUpload(db, id);
}

/** Deletes the row only — the caller owns the files on disk. */
export function removeUpload(db: DB, id: number): Upload | undefined {
  const existing = findUpload(db, id);
  if (!existing) return undefined;
  db.prepare('DELETE FROM uploads WHERE id = ?').run(id);
  return existing;
}
