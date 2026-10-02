/**
 * Brief 90. `POST /api/posts/:id/render` is the only production call site that
 * hands the render pipeline its `db`, and `db` is what lets the render browser
 * read `<Image>` bytes from disk now that `/uploads/*` is guarded (brief 88). A
 * refactor dropping it compiles and every other test stays green while
 * production renders come out blank. This drives the real route, with real
 * Chromium behind the shared guard, and looks at the pixels it wrote.
 *
 * Also `GET /api/me`, the one place Ward's estate-wide grant map is narrowed to
 * what the browser may see.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createPost, saveUpload } from '@newspapper/core';

import { buildApp } from '../server.js';
import { db, resetDb } from '../lib/db.js';
import { createFakeWard } from '../ward/fake-ward.js';
import {
  probeChromium,
  type ChromiumGuard,
} from '../../../core/src/render/test-support/chromium.js';

const TOKEN = 'render-test-session';
const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');

let tmp: string;
let app: Awaited<ReturnType<typeof buildApp>>;
let chromium: ChromiumGuard;
const createdOutputDirs: string[] = [];

beforeAll(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'np-render-route-'));
  process.env['NEWSPAPPER_DB_PATH'] = join(tmp, 'test.db');
  process.env['UPLOADS_DIR'] = join(tmp, 'uploads');
  chromium = await probeChromium(
    'render route test',
    'that the render route writes real image pixels',
  );
});

afterAll(async () => {
  await chromium.close();
  resetDb();
  delete process.env['NEWSPAPPER_DB_PATH'];
  delete process.env['UPLOADS_DIR'];
  for (const dir of createdOutputDirs) rmSync(dir, { recursive: true, force: true });
  rmSync(tmp, { recursive: true, force: true });
});

beforeEach(async () => {
  const ward = createFakeWard();
  ward.signIn(TOKEN, 'subject_render', { newspapper: ['editor'], prm: ['admin'] });
  app = await buildApp({ ward });
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

const post = (url: string) => app.inject({ method: 'POST', url, cookies: { ward_session: TOKEN } });

/** The SSE frames of a finished stream, in order. */
function events(body: string): { event: string; data: unknown }[] {
  return body
    .split('\n\n')
    .filter((block) => block.trim())
    .map((block) => {
      const event = /^event: (.*)$/m.exec(block)?.[1] ?? 'message';
      const raw = /^data: (.*)$/m.exec(block)?.[1] ?? '';
      let data: unknown = raw;
      try {
        data = JSON.parse(raw);
      } catch {
        // a bare string
      }
      return { event, data };
    });
}

describe('POST /api/posts/:id/render', () => {
  it('streams progress then done, and an <Image> renders from the upload store', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const red = await sharp({
      create: { width: 300, height: 300, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();
    const { ref } = await saveUpload(db(), { filename: 'red.png', data: red });
    const created = createPost(db(), {
      title: 'Red',
      markup: `<head><title>Red</title></head><body><Slide><Image src="${ref}" size="xl" /></Slide></body>`,
    });

    const res = await post(`/api/posts/${created.id}/render`);
    const stream = events(res.body);
    expect(stream.map((e) => e.event)).toEqual(['progress', 'done']);
    const done = stream[1]!.data as { files: string[] };
    expect(done.files).toHaveLength(1);
    const file = join(repoRoot, done.files[0]!);
    createdOutputDirs.push(resolve(file, '..'));
    expect(existsSync(file)).toBe(true);

    // The image is somewhere on the slide; count clearly-red pixels.
    const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
    let redPixels = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i]! > 200 && data[i + 1]! < 60 && data[i + 2]! < 60) redPixels += 1;
    }
    expect(redPixels).toBeGreaterThan(10_000);
  });

  it('a missing post is an SSE error', async () => {
    const stream = events((await post('/api/posts/999999/render')).body);
    expect(stream.map((e) => e.event)).toEqual(['error']);
  });

  it('an unknown theme is an SSE error', async () => {
    const created = createPost(db(), {
      title: 'T',
      markup: '<head><title>T</title></head><body><Slide /></body>',
    });
    db().prepare('UPDATE posts SET theme = ? WHERE id = ?').run('no-such-theme', created.id);
    const stream = events((await post(`/api/posts/${created.id}/render`)).body);
    expect(stream.map((e) => e.event)).toEqual(['error']);
    expect(JSON.stringify(stream[0]!.data)).toMatch(/Theme not found/);
  });

  it('a post that does not compile is an SSE error, not a render', async () => {
    const created = createPost(db(), {
      title: 'T',
      markup: '<head><title>T</title></head><body></body>',
    });
    db().prepare('UPDATE posts SET markup = ? WHERE id = ?').run('<body><Slide>', created.id);
    const stream = events((await post(`/api/posts/${created.id}/render`)).body);
    expect(stream.map((e) => e.event)).toEqual(['error']);
  });
});

describe('GET /api/me', () => {
  it('answers exactly { user: { subject, username } }, never the grant map, uncached', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/me',
      cookies: { ward_session: TOKEN },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { user: Record<string, unknown> };
    expect(Object.keys(body)).toEqual(['user']);
    expect(Object.keys(body.user).sort()).toEqual(['subject', 'username']);
    expect(body.user['subject']).toBe('subject_render');
    expect(res.body).not.toContain('grants');
    expect(res.body).not.toContain('prm');
    expect(res.headers['cache-control']).toBe('no-store');
  });
});
