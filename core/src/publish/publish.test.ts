import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { getDb, type DB } from '../storage/db.js';
import { createPost, findPost } from '../storage/posts.js';
import { recordRender, latestRender } from '../storage/renders.js';
import { publishPost } from './index.js';

let tmpDir: string;
let outputDir: string;
let db: DB;

async function noisyJpeg(width: number, height: number, quality: number): Promise<Buffer> {
  const raw = randomBytes(width * height * 3);
  return sharp(raw, { raw: { width, height, channels: 3 } }).jpeg({ quality }).toBuffer();
}

beforeEach(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-publish-test-'));
  outputDir = join(tmpDir, '2026-06-10-1');
  db = getDb(join(tmpDir, 'test.db'));

  await import('node:fs').then(({ mkdirSync }) => mkdirSync(outputDir, { recursive: true }));
  writeFileSync(join(outputDir, 'slide-01.jpg'), await noisyJpeg(200, 200, 100));
  writeFileSync(join(outputDir, 'slide-02.jpg'), await noisyJpeg(200, 200, 100));
  writeFileSync(join(outputDir, 'caption.txt'), 'hello');
});

afterEach(() => {
  db.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

function newPost() {
  return createPost(db, { title: 'Post', markup: '<head></head><body></body>' });
}

describe('publishPost', () => {
  it('throws for a post with no post row', async () => {
    await expect(publishPost(db, 9999)).rejects.toThrow(/not found/);
  });

  it('throws for a post that has not been rendered', async () => {
    const post = newPost();
    await expect(publishPost(db, post.id)).rejects.toThrow(/not been rendered/);
  });

  it('re-encodes the slides, flags the render optimized, and publishes the post', async () => {
    const post = newPost();
    recordRender(db, { postId: post.id, outputDir, slideCount: 2 });

    const before1 = readFileSync(join(outputDir, 'slide-01.jpg'));
    const before2 = readFileSync(join(outputDir, 'slide-02.jpg'));

    const result = await publishPost(db, post.id);

    expect(result.reencoded).toBe(2);
    expect(result.render.optimized).toBe(true);
    expect(result.post.status).toBe('published');
    expect(result.post.publishedAt).not.toBeNull();
    expect(findPost(db, post.id)!.status).toBe('published');
    expect(latestRender(db, post.id)!.optimized).toBe(true);

    expect(readFileSync(join(outputDir, 'slide-01.jpg')).equals(before1)).toBe(false);
    expect(readFileSync(join(outputDir, 'slide-02.jpg')).equals(before2)).toBe(false);
  });

  it('is idempotent: publishing twice never re-encodes and leaves the files byte-identical', async () => {
    const post = newPost();
    recordRender(db, { postId: post.id, outputDir, slideCount: 2 });

    const first = await publishPost(db, post.id);
    expect(first.reencoded).toBe(2);

    const afterFirst1 = readFileSync(join(outputDir, 'slide-01.jpg'));
    const afterFirst2 = readFileSync(join(outputDir, 'slide-02.jpg'));

    const second = await publishPost(db, post.id);
    expect(second.reencoded).toBe(0);

    expect(readFileSync(join(outputDir, 'slide-01.jpg')).equals(afterFirst1)).toBe(true);
    expect(readFileSync(join(outputDir, 'slide-02.jpg')).equals(afterFirst2)).toBe(true);
  });

  it('re-optimizes a fresh render even after the post was already published once', async () => {
    const post = newPost();
    recordRender(db, { postId: post.id, outputDir, slideCount: 2 });
    await publishPost(db, post.id);

    const reRenderDir = join(tmpDir, '2026-06-11-1');
    await import('node:fs').then(({ mkdirSync }) => mkdirSync(reRenderDir, { recursive: true }));
    writeFileSync(join(reRenderDir, 'slide-01.jpg'), await noisyJpeg(200, 200, 100));
    recordRender(db, { postId: post.id, outputDir: reRenderDir, slideCount: 1 });

    const result = await publishPost(db, post.id);
    expect(result.reencoded).toBe(1);
    expect(result.render.outputDir).toBe(reRenderDir);
  });
});
