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
import { resetSessionSecret } from './auth/secret.js';
import { SESSION_COOKIE } from './auth/session.js';

// Every /api/* route is behind the session guard, so these tests sign in once
// and replay the cookie. Auth itself is covered in routes/auth.test.ts.
const USERNAME = 'tester';
const PASSWORD = 'correct-horse-9';
const SECRET = 'server-test-session-secret-value';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
interface InjectOpts {
  method: Method;
  url: string;
  payload?: unknown;
  cookies?: Record<string, string>;
}

// Use an isolated temp DB for tests to avoid collisions with dev data.
let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'newspapper-test-'));
  process.env['NEWSPAPPER_DB_PATH'] = join(tmpDir, 'test.db');
  process.env['SESSION_SECRET'] = SECRET;
  process.env['ADMIN_USERNAME'] = USERNAME;
  process.env['ADMIN_PASSWORD'] = PASSWORD;
});

afterAll(() => {
  resetDb();
  resetSessionSecret();
  delete process.env['NEWSPAPPER_DB_PATH'];
  delete process.env['SESSION_SECRET'];
  delete process.env['ADMIN_USERNAME'];
  delete process.env['ADMIN_PASSWORD'];
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('API server', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let cookie = '';

  beforeEach(async () => {
    app = await buildApp();
    await app.ready();
    if (!cookie) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/login',
        payload: { username: USERNAME, password: PASSWORD },
      });
      cookie = res.cookies.find((c) => c.name === SESSION_COOKIE)?.value ?? '';
    }
  });

  afterEach(async () => {
    await app.close();
  });

  async function inject(opts: InjectOpts) {
    const { cookies, ...rest } = opts;
    return app.inject({ ...rest, cookies: { [SESSION_COOKIE]: cookie, ...cookies } });
  }

  // =========================================================================
  // Health
  // =========================================================================
  describe('GET /api/health', () => {
    it('returns ok:true', async () => {
      const res = await inject({ method: 'GET', url: '/api/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });
    });
  });

  // =========================================================================
  // Articles
  // =========================================================================
  describe('GET /api/articles', () => {
    it('returns an array', async () => {
      const res = await inject({ method: 'GET', url: '/api/articles' });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.json())).toBe(true);
    });

    it('filters by sourceId and search', async () => {
      await inject({
        method: 'POST',
        url: '/api/articles',
        payload: { title: 'Budget day', body: 'about tax and spend', sourceName: 'BBC' },
      });
      const bySearch = await inject({ method: 'GET', url: '/api/articles?search=tax' });
      expect(bySearch.statusCode).toBe(200);
      const titles = (bySearch.json() as Array<{ title: string }>).map((a) => a.title);
      expect(titles).toContain('Budget day');

      const bySource = await inject({
        method: 'GET',
        url: '/api/articles?sourceId=no-such-source',
      });
      expect(bySource.json()).toEqual([]);
    });
  });

  describe('POST /api/articles', () => {
    it('400 when title missing', async () => {
      const res = await inject({
        method: 'POST',
        url: '/api/articles',
        payload: { body: 'some content' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toHaveProperty('error');
    });

    it('201 with just a title — body defaults to empty', async () => {
      const res = await inject({
        method: 'POST',
        url: '/api/articles',
        payload: { title: 'Test article' },
      });
      expect(res.statusCode).toBe(201);
      const article = res.json();
      expect(article.title).toBe('Test article');
      expect(article.body).toBe('');
    });

    it('201 with valid title and body, defaulting sourceName to Manual', async () => {
      const res = await inject({
        method: 'POST',
        url: '/api/articles',
        payload: { title: 'Manual test article', body: 'Test body content' },
      });
      expect(res.statusCode).toBe(201);
      const article = res.json();
      expect(article).toHaveProperty('id');
      expect(article.title).toBe('Manual test article');
      expect(article.sourceId).toBeNull();
      expect(article.sourceName).toBe('Manual');
    });

    it('is idempotent on (source_id, guid) — saving twice leaves one row', async () => {
      const payload = { title: 'Dup test', sourceId: 'bbc', guid: 'dup-1' };
      const first = await inject({ method: 'POST', url: '/api/articles', payload });
      const second = await inject({ method: 'POST', url: '/api/articles', payload });
      expect(first.json().id).toBe(second.json().id);
    });
  });

  describe('DELETE /api/articles/:id', () => {
    it('404 for a non-existent article', async () => {
      const res = await inject({ method: 'DELETE', url: '/api/articles/999999' });
      expect(res.statusCode).toBe(404);
    });

    it('deletes a saved article', async () => {
      const created = await inject({
        method: 'POST',
        url: '/api/articles',
        payload: { title: 'To delete', guid: 'delete-me' },
      });
      const { id } = created.json();
      const res = await inject({ method: 'DELETE', url: `/api/articles/${id}` });
      expect(res.statusCode).toBe(200);
      const after = await inject({ method: 'GET', url: '/api/articles?search=To delete' });
      expect(after.json()).toEqual([]);
    });
  });

  // =========================================================================
  // Scrape (SSE)
  // =========================================================================
  describe('POST /api/scrape', () => {
    it('errors over SSE when no keywords are given', async () => {
      const res = await inject({ method: 'POST', url: '/api/scrape', payload: {} });
      expect(res.body).toContain('event: error');
    });

    // The keyword-match ranking and the "nothing is persisted" guarantee are
    // covered against mocked feeds in core/src/scrape/scrape.test.ts — a real
    // scrape here would hit the network via the seeded data/sources.json rows.
  });

  // =========================================================================
  // Posts
  // =========================================================================
  describe('GET /api/posts', () => {
    it('returns an array', async () => {
      const res = await inject({ method: 'GET', url: '/api/posts' });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.json())).toBe(true);
    });
  });

  describe('GET /api/posts/:id', () => {
    it('404 for non-existent post', async () => {
      const res = await inject({ method: 'GET', url: '/api/posts/999999' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/posts + PUT /api/posts/:id', () => {
    const markup = `<head>
  <title>A saved post</title>
  <description>Derived, not sent.</description>
  <keywords>budget, tax</keywords>
</head>

<body>
  <Slide>
    <Heading>A saved post</Heading>
  </Slide>
</body>
`;

    it('400 when the body carries no markup', async () => {
      const res = await inject({ method: 'POST', url: '/api/posts', payload: { theme: 'x' } });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toMatch(/markup/);
    });

    it('derives the index columns from the markup head', async () => {
      const created = await inject({ method: 'POST', url: '/api/posts', payload: { markup } });
      expect(created.statusCode).toBe(201);
      const post = created.json();
      expect(post.title).toBe('A saved post');
      expect(post.description).toBe('Derived, not sent.');
      expect(post.keywords.sort()).toEqual(['budget', 'tax']);
      expect(post.markup).toBe(markup);

      const renamed = markup.replace('<title>A saved post</title>', '<title>Renamed</title>');
      const updated = await inject({
        method: 'PUT',
        url: `/api/posts/${post.id}`,
        payload: { markup: renamed },
      });
      expect(updated.statusCode).toBe(200);
      expect(updated.json().title).toBe('Renamed');

      const removed = await inject({ method: 'DELETE', url: `/api/posts/${post.id}` });
      expect(removed.statusCode).toBe(200);
    });

    it('falls back rather than refusing a half-typed head', async () => {
      const res = await inject({
        method: 'POST',
        url: '/api/posts',
        payload: { markup: '<body>\n  <Slide />\n</body>\n' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().title).toBe('Untitled post');
      await inject({ method: 'DELETE', url: `/api/posts/${res.json().id}` });
    });

    it('400 when markup is missing on an update', async () => {
      const res = await inject({ method: 'PUT', url: '/api/posts/1', payload: {} });
      expect(res.statusCode).toBe(400);
    });

    it('404 for a non-existent post even with valid markup', async () => {
      const res = await inject({ method: 'PUT', url: '/api/posts/999999', payload: { markup } });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('404 for non-existent post', async () => {
      const res = await inject({ method: 'DELETE', url: '/api/posts/999999' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('post theme validation', () => {
    const markup = '<body>\n  <Slide />\n</body>\n';

    it('400 rather than storing a theme loadTheme would later throw on', async () => {
      const res = await inject({
        method: 'POST',
        url: '/api/posts',
        payload: { markup, theme: 'no-such-theme' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toMatch(/theme/i);
    });

    it('treats a blank theme as "use the default" rather than rejecting it', async () => {
      const res = await inject({
        method: 'POST',
        url: '/api/posts',
        payload: { markup, theme: '' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().theme).toBe('warm-industrial-1');
      await inject({ method: 'DELETE', url: `/api/posts/${res.json().id}` });
    });

    it('400 on an update to an unknown theme, leaving the stored one alone', async () => {
      const created = await inject({ method: 'POST', url: '/api/posts', payload: { markup } });
      const { id, theme } = created.json();
      const res = await inject({
        method: 'PUT',
        url: `/api/posts/${id}`,
        payload: { markup, theme: 'no-such-theme' },
      });
      expect(res.statusCode).toBe(400);
      const after = await inject({ method: 'GET', url: `/api/posts/${id}` });
      expect(after.json().theme).toBe(theme);
      await inject({ method: 'DELETE', url: `/api/posts/${id}` });
    });
  });

  describe('PUT /api/posts/:id/status', () => {
    it('moves a post between draft and published', async () => {
      const created = await inject({
        method: 'POST',
        url: '/api/posts',
        payload: { markup: '<body>\n  <Slide />\n</body>\n' },
      });
      const { id } = created.json();
      expect(created.json().status).toBe('draft');

      const published = await inject({
        method: 'PUT',
        url: `/api/posts/${id}/status`,
        payload: { status: 'published' },
      });
      expect(published.statusCode).toBe(200);
      expect(published.json().status).toBe('published');

      const bad = await inject({
        method: 'PUT',
        url: `/api/posts/${id}/status`,
        payload: { status: 'rendered' },
      });
      expect(bad.statusCode).toBe(400);

      await inject({ method: 'DELETE', url: `/api/posts/${id}` });
    });

    it('404 for a non-existent post', async () => {
      const res = await inject({
        method: 'PUT',
        url: '/api/posts/999999/status',
        payload: { status: 'published' },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // =========================================================================
  // Renders — the post library's thumbnail + "can this be exported" source
  // =========================================================================
  describe('GET /api/renders', () => {
    it('returns an array', async () => {
      const res = await inject({ method: 'GET', url: '/api/renders' });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.json())).toBe(true);
    });

    it('is empty for a post that has never been rendered', async () => {
      const created = await inject({
        method: 'POST',
        url: '/api/posts',
        payload: { markup: '<body>\n  <Slide />\n</body>\n' },
      });
      const { id } = created.json();
      const res = await inject({ method: 'GET', url: `/api/renders?postId=${id}` });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
      await inject({ method: 'DELETE', url: `/api/posts/${id}` });
    });

    it('400 when postId is not an integer', async () => {
      const res = await inject({ method: 'GET', url: '/api/renders?postId=abc' });
      expect(res.statusCode).toBe(400);
    });
  });

  // =========================================================================
  // Publish
  // =========================================================================
  describe('POST /api/posts/:id/publish', () => {
    it('404 for a non-existent post', async () => {
      const res = await inject({ method: 'POST', url: '/api/posts/999999/publish' });
      expect(res.statusCode).toBe(404);
    });

    it('409 for a post that has not been rendered', async () => {
      const created = await inject({
        method: 'POST',
        url: '/api/posts',
        payload: { markup: '<body>\n  <Slide />\n</body>\n' },
      });
      const { id } = created.json();
      const res = await inject({ method: 'POST', url: `/api/posts/${id}/publish` });
      expect(res.statusCode).toBe(409);
      await inject({ method: 'DELETE', url: `/api/posts/${id}` });
    });
  });

  // =========================================================================
  // Settings
  // =========================================================================
  describe('GET /api/settings', () => {
    it('returns settings with defaultTheme', async () => {
      const res = await inject({ method: 'GET', url: '/api/settings' });
      expect(res.statusCode).toBe(200);
      const s = res.json();
      expect(typeof s.defaultTheme).toBe('string');
    });
  });

  describe('PUT /api/settings', () => {
    it('persists a defaultTheme patch', async () => {
      await inject({
        method: 'PUT',
        url: '/api/settings',
        payload: { defaultTheme: 'warm-industrial-1' },
      });
      const res = await inject({ method: 'GET', url: '/api/settings' });
      expect(res.json().defaultTheme).toBe('warm-industrial-1');
    });

    it('400 on a theme that is not on disk, leaving the stored one alone', async () => {
      const res = await inject({
        method: 'PUT',
        url: '/api/settings',
        payload: { defaultTheme: 'no-such-theme' },
      });
      expect(res.statusCode).toBe(400);
      const after = await inject({ method: 'GET', url: '/api/settings' });
      expect(after.json().defaultTheme).toBe('warm-industrial-1');
    });
  });

  // =========================================================================
  // Export.zip — 404 when draft
  // =========================================================================
  describe('GET /api/posts/:id/export.zip', () => {
    it('404 for non-existent post', async () => {
      const res = await inject({ method: 'GET', url: '/api/posts/999999/export.zip' });
      expect(res.statusCode).toBe(404);
    });

    it('404 for a draft post (not rendered)', async () => {
      // Create an article first
      const artRes = await inject({
        method: 'POST',
        url: '/api/articles',
        payload: { title: 'Draft test', body: 'Body text' },
      });
      const article = artRes.json();

      expect(article.id).toBeGreaterThan(0);
      const res = await inject({ method: 'GET', url: `/api/posts/999998/export.zip` });
      expect(res.statusCode).toBe(404);
    });
  });

  // =========================================================================
  // Sources
  // =========================================================================
  describe('GET /api/sources', () => {
    it('returns an array', async () => {
      const res = await inject({ method: 'GET', url: '/api/sources' });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.json())).toBe(true);
    });
  });

  describe('POST /api/sources validation', () => {
    it('400 when id missing', async () => {
      const res = await inject({
        method: 'POST',
        url: '/api/sources',
        payload: { name: 'Test', rss: 'https://example.com/feed' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('400 when rss missing', async () => {
      const res = await inject({
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
    it('returns array with warm-industrial-1', async () => {
      const res = await inject({ method: 'GET', url: '/api/themes' });
      expect(res.statusCode).toBe(200);
      const themes = res.json() as Array<{ name: string; tokens: unknown }>;
      expect(Array.isArray(themes)).toBe(true);
      const names = themes.map((t) => t.name);
      expect(names).toContain('warm-industrial-1');
    });
  });
});
