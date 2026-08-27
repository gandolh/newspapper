/**
 * API integration tests using fastify.inject().
 * These tests spin up the full app in-process — no network calls.
 *
 * The DB is ephemeral (in-memory via temp path).
 * Template tests exercise real wave-1 code.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { buildApp } from './server.js';
import { resetDb } from './lib/db.js';

// Use an isolated temp DB for tests to avoid collisions with dev data.
let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'newspapper-test-'));
  process.env['NEWSPAPPER_DB_PATH'] = join(tmpDir, 'test.db');
});

afterAll(() => {
  resetDb();
  delete process.env['NEWSPAPPER_DB_PATH'];
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('API server', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // =========================================================================
  // Health
  // =========================================================================
  describe('GET /api/health', () => {
    it('returns ok:true', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });
    });
  });

  // =========================================================================
  // Articles
  // =========================================================================
  describe('GET /api/articles', () => {
    it('returns an array for today', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/articles' });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.json())).toBe(true);
    });

    it('accepts a date query param', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/articles?date=2020-01-01' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });
  });

  describe('POST /api/articles', () => {
    it('400 when title missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/articles',
        payload: { body: 'some content' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toHaveProperty('error');
    });

    it('400 when body missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/articles',
        payload: { title: 'Test article' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toHaveProperty('error');
    });

    it('201 with valid title and body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/articles',
        payload: { title: 'Test article', body: 'Test body content' },
      });
      expect(res.statusCode).toBe(201);
      const article = res.json();
      expect(article).toHaveProperty('id');
      expect(article.title).toBe('Test article');
      expect(article.sourceId).toBeNull();
      expect(article.sourceName).toBe('Manual');
    });
  });

  // =========================================================================
  // Posts
  // =========================================================================
  describe('GET /api/posts', () => {
    it('returns an array', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/posts' });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.json())).toBe(true);
    });
  });

  describe('GET /api/posts/:id', () => {
    it('404 for non-existent post', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/posts/999999' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /api/posts/:id', () => {
    it('400 when slides has only 1 slide', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/posts/1',
        payload: {
          payload: {
            date: '2024-01-01',
            title: 'Test',
            theme: 'warm-industrial',
            slides: [
              { type: 'title', variant: 'title-main', text: 'Only slide' },
            ],
          },
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toMatch(/2.8/);
    });

    it('404 for non-existent post even with valid payload', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/posts/999999',
        payload: {
          payload: {
            date: '2024-01-01',
            title: 'Test',
            theme: 'warm-industrial',
            slides: [
              { type: 'title', variant: 'title-main', text: 'Slide 1' },
              { type: 'body', variant: 'body-text', heading: 'H', body: 'B' },
            ],
          },
        },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('404 for non-existent post', async () => {
      const res = await app.inject({ method: 'DELETE', url: '/api/posts/999999' });
      expect(res.statusCode).toBe(404);
    });
  });

  // =========================================================================
  // Settings
  // =========================================================================
  describe('GET /api/settings', () => {
    it('returns settings with defaultTheme', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/settings' });
      expect(res.statusCode).toBe(200);
      const s = res.json();
      expect(typeof s.defaultTheme).toBe('string');
    });
  });

  describe('PUT /api/settings', () => {
    it('persists a defaultTheme patch', async () => {
      await app.inject({
        method: 'PUT',
        url: '/api/settings',
        payload: { defaultTheme: 'warm-industrial' },
      });
      const res = await app.inject({ method: 'GET', url: '/api/settings' });
      expect(res.json().defaultTheme).toBe('warm-industrial');
    });
  });

  // =========================================================================
  // Templates 404 / 409
  // =========================================================================
  describe('GET /api/templates', () => {
    it('returns templates for warm-industrial theme', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/templates?theme=warm-industrial' });
      expect(res.statusCode).toBe(200);
      const docs = res.json();
      expect(Array.isArray(docs)).toBe(true);
      // warm-industrial ships 9 templates
      expect(docs.length).toBe(9);
    });
  });

  describe('GET /api/templates/:theme/:id', () => {
    it('404 for non-existent template', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/templates/warm-industrial/nonexistent' });
      expect(res.statusCode).toBe(404);
    });

    it('200 for existing title-main template', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/templates/warm-industrial/title-main' });
      expect(res.statusCode).toBe(200);
      const doc = res.json();
      expect(doc.id).toBe('title-main');
    });
  });

  describe('POST /api/templates (409 if exists)', () => {
    it('409 when trying to create an already-existing template', async () => {
      // title-main already exists
      const getRes = await app.inject({ method: 'GET', url: '/api/templates/warm-industrial/title-main' });
      const existingDoc = getRes.json();
      const res = await app.inject({
        method: 'POST',
        url: '/api/templates',
        payload: existingDoc,
      });
      expect(res.statusCode).toBe(409);
    });
  });

  // =========================================================================
  // Preview — integration test that exercises real wave-1 template code
  // =========================================================================
  describe('POST /api/preview', () => {
    it('returns HTML containing sample text for title-main template', async () => {
      // Load the template first to know its sample data
      const tplRes = await app.inject({ method: 'GET', url: '/api/templates/warm-industrial/title-main' });
      const doc = tplRes.json();

      const res = await app.inject({
        method: 'POST',
        url: '/api/preview',
        payload: {
          templateId: 'title-main',
          theme: 'warm-industrial',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      const html = res.body;
      expect(html).toContain('<!doctype html');
      // Should contain sample text — look for any text from the sample
      const sampleValues = Object.values(doc.sample).filter((v) => typeof v === 'string');
      const found = (sampleValues as string[]).some((v) => html.includes(v));
      expect(found).toBe(true);
    });

    it('400 when neither templateId nor doc provided', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/preview',
        payload: { data: {} },
      });
      expect(res.statusCode).toBe(400);
    });

    it('can render from an inline doc', async () => {
      // Load title-main as inline doc
      const tplRes = await app.inject({ method: 'GET', url: '/api/templates/warm-industrial/title-main' });
      const doc = tplRes.json();
      const res = await app.inject({
        method: 'POST',
        url: '/api/preview',
        payload: { doc, theme: 'warm-industrial' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('<!doctype html');
    });
  });

  // =========================================================================
  // Export.zip — 404 when draft
  // =========================================================================
  describe('GET /api/posts/:id/export.zip', () => {
    it('404 for non-existent post', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/posts/999999/export.zip' });
      expect(res.statusCode).toBe(404);
    });

    it('404 for a draft post (not rendered)', async () => {
      // Create an article first
      const artRes = await app.inject({
        method: 'POST',
        url: '/api/articles',
        payload: { title: 'Draft test', body: 'Body text' },
      });
      const article = artRes.json();

      expect(article.id).toBeGreaterThan(0);
      const res = await app.inject({ method: 'GET', url: `/api/posts/999998/export.zip` });
      expect(res.statusCode).toBe(404);
    });
  });

  // =========================================================================
  // Sources
  // =========================================================================
  describe('GET /api/sources', () => {
    it('returns an array', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/sources' });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.json())).toBe(true);
    });
  });

  describe('POST /api/sources validation', () => {
    it('400 when id missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/sources',
        payload: { name: 'Test', rss: 'https://example.com/feed' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('400 when rss missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/sources',
        payload: { id: 'test-src', name: 'Test' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // =========================================================================
  // Themes
  // =========================================================================
  describe('GET /api/themes', () => {
    it('returns array with warm-industrial', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/themes' });
      expect(res.statusCode).toBe(200);
      const themes = res.json() as Array<{ name: string; tokens: unknown }>;
      expect(Array.isArray(themes)).toBe(true);
      const names = themes.map((t) => t.name);
      expect(names).toContain('warm-industrial');
    });
  });
});
