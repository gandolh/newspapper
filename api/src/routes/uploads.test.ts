import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import sharp from 'sharp';
import { MAX_UPLOAD_BYTES, closeBrowser, getBrowser, htmlToPng } from '@newspapper/core';
import uploadsRoutes from './uploads.js';
import { db, resetDb } from '../lib/db.js';

let tmpDir: string;
let store: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-uploads-api-'));
  store = join(tmpDir, 'store');
  process.env['NEWSPAPPER_DB_PATH'] = join(tmpDir, 'test.db');
  process.env['UPLOADS_DIR'] = store;
});

afterAll(() => {
  resetDb();
  delete process.env['NEWSPAPPER_DB_PATH'];
  delete process.env['UPLOADS_DIR'];
  rmSync(tmpDir, { recursive: true, force: true });
});

let app: FastifyInstance;

beforeEach(async () => {
  app = Fastify();
  await app.register(uploadsRoutes);
  await app.ready();
});

afterEach(async () => {
  await app.close();
  db().prepare('DELETE FROM uploads').run();
  rmSync(store, { recursive: true, force: true });
});

function makeImage(format: 'jpeg' | 'png' | 'webp', width = 120, height = 60): Promise<Buffer> {
  const base = sharp({
    create: { width, height, channels: 3, background: { r: 20, g: 220, b: 120 } },
  });
  if (format === 'jpeg') return base.jpeg().toBuffer();
  if (format === 'png') return base.png().toBuffer();
  return base.webp().toBuffer();
}

async function multipart(filename: string, data: Buffer, contentType: string) {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(data)], { type: contentType }), filename);
  const encoded = new Response(form);
  return {
    payload: Buffer.from(await encoded.arrayBuffer()),
    headers: { 'content-type': encoded.headers.get('content-type') as string },
  };
}

async function upload(filename: string, data: Buffer, contentType = 'application/octet-stream') {
  const { payload, headers } = await multipart(filename, data, contentType);
  return app.inject({ method: 'POST', url: '/api/uploads', payload, headers });
}

describe('POST /api/uploads', () => {
  it.each(['jpeg', 'png', 'webp'] as const)('accepts %s and serves it back', async (format) => {
    const data = await makeImage(format);
    const res = await upload(`photo.${format}`, data, `image/${format}`);
    expect(res.statusCode).toBe(201);

    const body = res.json();
    expect(body).toMatchObject({
      filename: `photo.${format}`,
      mime: `image/${format}`,
      width: 120,
      height: 60,
      src: body.ref,
      url: `/uploads/${body.ref}`,
      originalUrl: `/uploads/${body.ref}/original`,
      original: { width: 120, height: 60, bytes: data.length },
    });

    const served = await app.inject({ method: 'GET', url: body.url });
    expect(served.statusCode).toBe(200);
    expect(served.headers['content-type']).toBe(`image/${format}`);
    expect(served.headers['x-content-type-options']).toBe('nosniff');
    expect(served.rawPayload.length).toBe(body.bytes);

    const original = await app.inject({ method: 'GET', url: body.originalUrl });
    expect(original.statusCode).toBe(200);
    expect(Buffer.from(original.rawPayload).equals(data)).toBe(true);
  });

  it('rejects a text file that claims to be a PNG', async () => {
    const res = await upload('shell.png', Buffer.from('<?php echo 1; ?>'), 'image/png');
    expect(res.statusCode).toBe(415);
    expect(res.json().code).toBe('unreadable_image');
    expect(existsSync(join(store, 'originals'))).toBe(false);
  });

  it('rejects a GIF even though sharp can decode it', async () => {
    const gif = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#fff' },
    })
      .gif()
      .toBuffer();
    const res = await upload('anim.png', gif, 'image/png');
    expect(res.statusCode).toBe(415);
    expect(res.json().code).toBe('unsupported_format');
  });

  it('rejects a file over the 10MB cap with a 413', async () => {
    const res = await upload('huge.png', Buffer.alloc(MAX_UPLOAD_BYTES + 1024, 7), 'image/png');
    expect(res.statusCode).toBe(413);
    expect(res.json().error).toMatch(/10 MB/);
  });

  it('rejects a non-multipart body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/uploads',
      payload: { file: 'nope' },
    });
    expect(res.statusCode).toBe(415);
  });

  it('rejects multipart with no file part', async () => {
    const form = new FormData();
    form.append('caption', 'hello');
    const encoded = new Response(form);
    const res = await app.inject({
      method: 'POST',
      url: '/api/uploads',
      payload: Buffer.from(await encoded.arrayBuffer()),
      headers: { 'content-type': encoded.headers.get('content-type') as string },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/uploads', () => {
  it('lists uploads newest first', async () => {
    await upload('one.png', await makeImage('png'), 'image/png');
    await upload('two.png', await makeImage('png'), 'image/png');

    const res = await app.inject({ method: 'GET', url: '/api/uploads' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(2);
    expect(body[0].filename).toBe('two.png');
    expect(body[0].url).toBe(`/uploads/${body[0].ref}`);
  });

  it('honours limit and offset', async () => {
    await upload('one.png', await makeImage('png'), 'image/png');
    await upload('two.png', await makeImage('png'), 'image/png');
    const res = await app.inject({ method: 'GET', url: '/api/uploads?limit=1&offset=1' });
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].filename).toBe('one.png');
  });

  it('404s an unknown id and 400s a non-numeric one', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/uploads/999' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/uploads/abc' })).statusCode).toBe(400);
  });
});

describe('GET /uploads/:ref', () => {
  it('refuses anything that is not a ref', async () => {
    for (const path of [
      '/uploads/..%2f..%2fetc%2fpasswd',
      '/uploads/nope',
      '/uploads/Harbour-9f3a1c2b',
      '/uploads/missing-00000000',
    ]) {
      const res = await app.inject({ method: 'GET', url: path });
      expect(res.statusCode, path).toBe(404);
    }
  });
});

describe('DELETE /api/uploads/:id', () => {
  it('removes both files and the row', async () => {
    const created = (await upload('gone.png', await makeImage('png'), 'image/png')).json();

    const res = await app.inject({ method: 'DELETE', url: `/api/uploads/${created.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: created.id, deleted: true });

    expect(readdirSync(join(store, 'originals'))).toHaveLength(0);
    expect(readdirSync(join(store, 'normalized'))).toHaveLength(0);
    expect((await app.inject({ method: 'GET', url: created.url })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/uploads' })).json()).toHaveLength(0);
    expect(
      (await app.inject({ method: 'DELETE', url: `/api/uploads/${created.id}` })).statusCode,
    ).toBe(404);
  });
});

describe('the upload URL is reachable from headless Chromium', () => {
  let browserAvailable = true;

  beforeAll(async () => {
    try {
      const browser = await getBrowser();
      if (!browser.isConnected()) throw new Error('browser not connected');
    } catch (err) {
      browserAvailable = false;
      console.warn('[uploads.test] Chromium unavailable — render test skipped.', err);
    }
  });

  afterAll(async () => {
    if (browserAvailable) await closeBrowser();
  });

  it('loads <img> from /uploads/:ref during a render', async () => {
    if (!browserAvailable) return;

    const hits: { url: string; status: number }[] = [];
    const server = Fastify();
    server.addHook('onResponse', async (req, reply) => {
      if (req.url.startsWith('/uploads/')) hits.push({ url: req.url, status: reply.statusCode });
    });
    await server.register(uploadsRoutes);
    await server.listen({ port: 0, host: '127.0.0.1' });

    try {
      const address = server.addresses()[0];
      const origin = `http://127.0.0.1:${address.port}`;

      const form = new FormData();
      const data = await makeImage('png', 400, 400);
      form.append('file', new Blob([new Uint8Array(data)], { type: 'image/png' }), 'green.png');
      const encoded = new Response(form);
      const posted = await fetch(`${origin}/api/uploads`, {
        method: 'POST',
        body: Buffer.from(await encoded.arrayBuffer()),
        headers: { 'content-type': encoded.headers.get('content-type') as string },
      });
      expect(posted.status).toBe(201);
      const created = (await posted.json()) as { ref: string; url: string };

      const page = (src: string) =>
        `<html><body style="margin:0;background:#fff">` +
        `<img src="${src}" style="width:1080px;height:1080px" />` +
        `</body></html>`;

      const rendered = await htmlToPng(page(`${origin}${created.url}`));
      const missing = await htmlToPng(page(`${origin}/uploads/absent-00000000`));

      expect(hits.some((h) => h.url === created.url && h.status === 200)).toBe(true);
      expect(rendered.equals(missing)).toBe(false);
    } finally {
      await server.close();
    }
  }, 120_000);
});
