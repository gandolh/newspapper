import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDb, type DB } from './db.js';
import { createPost } from './posts.js';
import {
  recordRender,
  latestRender,
  listRenders,
  findRender,
  markRenderOptimized,
  removeRender,
} from './renders.js';

let tmpDir: string;
let db: DB;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-renders-test-'));
  db = getDb(join(tmpDir, 'test.db'));
});

afterEach(() => {
  db.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

function newPost() {
  return createPost(db, { title: 'Post', markup: '<head></head><body></body>' });
}

describe('renders', () => {
  it('recordRender stores a run and latestRender returns the newest', () => {
    const post = newPost();
    recordRender(db, { postId: post.id, outputDir: '/output/2026-06-10-1', slideCount: 3 });
    const second = recordRender(db, {
      postId: post.id,
      outputDir: '/output/2026-06-10-2',
      slideCount: 4,
    });

    expect(latestRender(db, post.id)!.id).toBe(second.id);
    expect(latestRender(db, post.id)!.slideCount).toBe(4);
    expect(listRenders(db, post.id)).toHaveLength(2);
  });

  it('defaults optimized to false and flips it on the publish pass', () => {
    const post = newPost();
    const r = recordRender(db, { postId: post.id, outputDir: '/output/x' });
    expect(r.optimized).toBe(false);
    expect(markRenderOptimized(db, r.id)!.optimized).toBe(true);
    expect(markRenderOptimized(db, 9999)).toBeUndefined();
  });

  it('requires a real post', () => {
    expect(() => recordRender(db, { postId: 9999, outputDir: '/output/x' })).toThrow(
      /FOREIGN KEY constraint failed/,
    );
  });

  it('removeRender deletes the row and leaves the post alone', () => {
    const post = newPost();
    const r = recordRender(db, { postId: post.id, outputDir: '/output/x' });
    expect(removeRender(db, r.id)!.id).toBe(r.id);
    expect(findRender(db, r.id)).toBeUndefined();
    expect(latestRender(db, post.id)).toBeUndefined();
  });
});
