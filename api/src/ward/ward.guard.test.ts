import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

import { buildApp } from '../server.js';
import { resetDb } from '../lib/db.js';
import { createFakeWard, type FakeWard } from './fake-ward.js';
import { WardUnavailableError } from './ward.types.js';

/**
 * The guard's three outcomes, and the fact that `/uploads/*` is no longer one
 * of the exceptions.
 *
 * These are the assertions that would notice a regression in the cutover's most
 * consequential changes, and each is here because collapsing it into another
 * outcome is a plausible mistake with a bad consequence.
 */

let tmpDir: string;
let app: Awaited<ReturnType<typeof buildApp>>;
let ward: FakeWard;

const TOKEN = 'guard-test-session';

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'newspapper-guard-'));
  process.env['NEWSPAPPER_DB_PATH'] = join(tmpDir, 'test.db');
});

afterAll(() => {
  resetDb();
  delete process.env['NEWSPAPPER_DB_PATH'];
  rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(async () => {
  ward = createFakeWard();
  app = await buildApp({ ward });
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

const withSession = (url: string) =>
  app.inject({ method: 'GET', url, cookies: { ward_session: TOKEN } });

describe('the guard', () => {
  it('401s a request with no session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/posts' });
    expect(res.statusCode).toBe(401);
  });

  /**
   * The distinction the whole grant model rests on. A person can hold a
   * perfectly live Ward account — registered at prm, say, which is open to the
   * public — and still have no business here. Answering 401 would send them to
   * a login page they are already past, in a loop.
   */
  it('403s a live session that holds no newspapper grant', async () => {
    ward.signIn(TOKEN, 'subject_stranger', { prm: ['user'] });

    const res = await withSession('/api/posts');
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'This account has no access to newspapper' });
  });

  it('lets a session holding any newspapper grant through', async () => {
    ward.signIn(TOKEN, 'subject_editor', { newspapper: ['editor'] });

    const res = await withSession('/api/posts');
    expect(res.statusCode).toBe(200);
  });

  /**
   * Fail closed, and say which failure it is. Reporting an unreachable Ward as
   * "signed out" sends somebody to a login page served by the service that is
   * down — a loop that reads as a rejected password.
   */
  it('503s when Ward cannot be reached, and never 401s', async () => {
    ward.breakWith(new WardUnavailableError('ward is down'));

    const res = await withSession('/api/posts');
    expect(res.statusCode).toBe(503);
    expect(res.statusCode).not.toBe(401);
  });

  it('leaves /api/health public', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
  });
});

/**
 * The security change this cutover exists to make.
 *
 * `/uploads/:ref` was `config: { public: true }` because the render browser
 * fetches images carrying no cookie. On loopback that exposure was bounded by
 * the ref's entropy **and an unreachable port**; on the shared VPS only the
 * entropy would have been left. The renderer now reads those bytes off disk
 * (`core/src/render/uploads-route.ts`), so the route could be closed.
 */
describe('/uploads is no longer public', () => {
  it('401s an anonymous upload fetch', async () => {
    const res = await app.inject({ method: 'GET', url: '/uploads/anything-at-all' });
    expect(res.statusCode).toBe(401);
  });

  it('401s the original-bytes variant too', async () => {
    const res = await app.inject({ method: 'GET', url: '/uploads/anything-at-all/original' });
    expect(res.statusCode).toBe(401);
  });
});

/**
 * Brief 77. The guard used to decide from the **raw** URL while Fastify routes
 * the **percent-decoded** one, so `/%61pi/posts` (`%61` = `a`) skipped
 * authentication and reached the real `/api/posts` handler: anonymous read and
 * write of the whole API. Every spelling below must be refused before any
 * handler runs. A handler that ran would answer 200, 201 or 404, never 401.
 */
describe('percent-encoded paths are guarded like the decoded ones', () => {
  const encoded: Array<[string, string]> = [
    ['GET', '/%61pi/posts'],
    ['GET', '/a%70i/settings'],
    ['POST', '/%61pi/posts'],
    ['PUT', '/%61pi/settings'],
    ['GET', '/%6Futput/x/slide-01.jpg'],
    ['GET', '/%75ploads/some-ref'],
    ['GET', '/%75ploads/some-ref/original'],
    ['GET', '/%2561pi/posts'],
  ];

  for (const [method, url] of encoded) {
    it(`401s ${method} ${url} with no session`, async () => {
      const res = await app.inject({
        method: method as 'GET',
        url,
        ...(method === 'GET' ? {} : { payload: { markup: '' } }),
      });
      if (url.startsWith('/%2561')) {
        // Double-encoded, it decodes once, to the literal `/%61pi/posts`, which
        // matches no route. It must not reach the posts handler: the answer is a
        // 404, or (when `ui/dist` is built) the public SPA shell from the
        // not-found handler. Either way, no API data.
        expect(res.statusCode).not.toBe(201);
        if (res.statusCode === 200) expect(res.headers['content-type']).toMatch(/text\/html/);
        else expect([401, 404]).toContain(res.statusCode);
      } else {
        expect(res.statusCode).toBe(401);
      }
    });
  }

  it('the decoded spellings still 401 without a session', async () => {
    for (const url of ['/api/posts', '/output/x/slide-01.jpg', '/uploads/some-ref']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode, url).toBe(401);
    }
  });

  it('a granted session still gets through, at either spelling', async () => {
    ward.signIn(TOKEN, 'subject_editor', { newspapper: ['editor'] });
    expect((await withSession('/api/posts')).statusCode).toBe(200);
    expect((await withSession('/%61pi/posts')).statusCode).toBe(200);
    // Static and upload routes get past the guard to their handlers, which
    // can't find the file. (A missing static file falls through to the
    // not-found handler, which serves the SPA shell when `ui/dist` is built.)
    for (const url of ['/%6Futput/x/slide-01.jpg', '/%75ploads/some-ref']) {
      expect([200, 404], url).toContain((await withSession(url)).statusCode);
    }
  });

  it('/api/health stays public at either spelling', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/%61pi/health' })).statusCode).toBe(200);
  });
});
