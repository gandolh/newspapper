/**
 * Brief 97: `GET /api/renders` points the grid at the run's small thumbnail,
 * and falls back to the first slide for runs made before thumbnails existed.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPost, recordRender } from '@newspapper/core';

import { buildApp } from '../server.js';
import { db, resetDb } from '../lib/db.js';
import { createFakeWard } from '../ward/fake-ward.js';

const outputRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../output');
const dirs = ['1999-01-01-1', '1999-01-01-2'].map((d) => join(outputRoot, d));
let tmp: string;
let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'np-renders-'));
  process.env['NEWSPAPPER_DB_PATH'] = join(tmp, 'test.db');
  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'slide-01.jpg'), 'jpg');
  }
  writeFileSync(join(dirs[0]!, 'thumb.jpg'), 'thumb');
});

afterAll(() => {
  resetDb();
  delete process.env['NEWSPAPPER_DB_PATH'];
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  rmSync(tmp, { recursive: true, force: true });
});

beforeEach(async () => {
  const ward = createFakeWard();
  ward.signIn('t', 's', { newspapper: ['editor'] });
  app = await buildApp({ ward });
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

describe('GET /api/renders thumbnails', () => {
  it('uses thumb.jpg when the run has one, and the first slide when it does not', async () => {
    const markup = '<head><title>T</title></head><body><Slide /></body>';
    const withThumb = createPost(db(), { title: 'new', markup });
    const older = createPost(db(), { title: 'old', markup });
    recordRender(db(), { postId: withThumb.id, outputDir: dirs[0]!, slideCount: 1 });
    recordRender(db(), { postId: older.id, outputDir: dirs[1]!, slideCount: 1 });

    const res = await app.inject({
      method: 'GET',
      url: '/api/renders',
      cookies: { ward_session: 't' },
    });
    const byPost = new Map(
      (res.json() as Array<{ postId: number; thumb: string | null; files: string[] }>).map((r) => [
        r.postId,
        r,
      ]),
    );
    expect(byPost.get(withThumb.id)!.thumb).toBe('/output/1999-01-01-1/thumb.jpg');
    expect(byPost.get(withThumb.id)!.files).toEqual(['/output/1999-01-01-1/slide-01.jpg']);
    expect(byPost.get(older.id)!.thumb).toBe('/output/1999-01-01-2/slide-01.jpg');
  });
});
