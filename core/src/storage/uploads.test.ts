import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDb, type DB } from './db.js';
import {
  createUpload,
  findUpload,
  listUploads,
  setUploadNormalizedPath,
  removeUpload,
} from './uploads.js';

let tmpDir: string;
let db: DB;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-uploads-test-'));
  db = getDb(join(tmpDir, 'test.db'));
});

afterEach(() => {
  db.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('uploads', () => {
  it('createUpload round-trips every column', () => {
    const upload = createUpload(db, {
      filename: 'chart.png',
      storedPath: '/uploads/abc.png',
      mime: 'image/png',
      width: 1200,
      height: 800,
      bytes: 45_000,
    });
    expect(upload.id).toBeGreaterThan(0);
    expect(upload.normalizedPath).toBeNull();
    expect(findUpload(db, upload.id)).toEqual(upload);
  });

  it('setUploadNormalizedPath records the derived copy', () => {
    const upload = createUpload(db, {
      filename: 'chart.png',
      storedPath: '/uploads/abc.png',
      mime: 'image/png',
    });
    const updated = setUploadNormalizedPath(db, upload.id, '/uploads/abc.norm.jpg');
    expect(updated!.normalizedPath).toBe('/uploads/abc.norm.jpg');
    expect(setUploadNormalizedPath(db, 9999, '/x')).toBeUndefined();
  });

  it('listUploads returns newest first', () => {
    const a = createUpload(db, { filename: 'a.png', storedPath: '/a', mime: 'image/png' });
    const b = createUpload(db, { filename: 'b.png', storedPath: '/b', mime: 'image/png' });
    expect(listUploads(db).map((u) => u.id)).toEqual([b.id, a.id]);
  });

  it('removeUpload deletes the row only', () => {
    const upload = createUpload(db, { filename: 'a.png', storedPath: '/a', mime: 'image/png' });
    expect(removeUpload(db, upload.id)!.filename).toBe('a.png');
    expect(findUpload(db, upload.id)).toBeUndefined();
    expect(removeUpload(db, upload.id)).toBeUndefined();
  });
});
