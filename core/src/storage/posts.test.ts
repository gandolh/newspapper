import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDb, type DB } from './db.js';
import {
  createPost,
  findPost,
  queryPosts,
  updatePost,
  setPostStatus,
  removePost,
  countPosts,
} from './posts.js';
import { recordRender } from './renders.js';

let tmpDir: string;
let db: DB;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-posts-test-'));
  db = getDb(join(tmpDir, 'test.db'));
});

afterEach(() => {
  db.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

const MARKUP = `<head>
  <title>Three Things About the Budget</title>
  <description>What actually changed, minus the spin.</description>
  <keywords>budget, economy</keywords>
</head>

<body>
  <Slide><Heading>Three things</Heading></Slide>
</body>`;

function makeInput(override: Partial<Parameters<typeof createPost>[1]> = {}) {
  return {
    title: 'Three Things About the Budget',
    description: 'What actually changed, minus the spin.',
    markup: MARKUP,
    theme: 'warm-industrial',
    keywords: ['budget', 'economy'],
    ...override,
  };
}

describe('posts repository', () => {
  it('createPost → findPost round-trip keeps the markup verbatim', () => {
    const created = createPost(db, makeInput());
    expect(created.id).toBeGreaterThan(0);
    expect(created.status).toBe('draft');
    expect(created.publishedAt).toBeNull();
    expect(created.markup).toBe(MARKUP);

    const fetched = findPost(db, created.id);
    expect(fetched).toBeDefined();
    expect(fetched!.markup).toBe(MARKUP);
    expect(fetched!.title).toBe('Three Things About the Budget');
    expect(fetched!.description).toBe('What actually changed, minus the spin.');
    expect(fetched!.keywords).toEqual(['budget', 'economy']);
  });

  it('defaults description, theme and keywords', () => {
    const created = createPost(db, { title: 'Bare', markup: '<head></head><body></body>' });
    expect(created.description).toBe('');
    expect(created.theme).toBe('warm-industrial');
    expect(created.keywords).toEqual([]);
  });

  it('findPost returns undefined for an unknown id', () => {
    expect(findPost(db, 9999)).toBeUndefined();
  });

  it('updatePost re-derives the index columns and the keywords', async () => {
    const created = createPost(db, makeInput());
    await new Promise((r) => setTimeout(r, 10));

    const updated = updatePost(db, created.id, {
      title: 'Four Things About the Budget',
      description: 'Now with a fourth thing.',
      markup: MARKUP.replaceAll('Three', 'Four').replaceAll('three', 'four'),
      keywords: ['budget', 'tax'],
    });

    expect(updated).toBeDefined();
    expect(updated!.title).toBe('Four Things About the Budget');
    expect(updated!.description).toBe('Now with a fourth thing.');
    expect(updated!.markup).toContain('Four things');
    expect(updated!.keywords).toEqual(['budget', 'tax']);
    expect(updated!.updatedAt).not.toBe(created.updatedAt);
  });

  it('updatePost returns undefined for an unknown id and writes nothing', () => {
    expect(updatePost(db, 9999, makeInput())).toBeUndefined();
    expect(countPosts(db)).toBe(0);
  });

  it('setPostStatus publishes and unpublishes, stamping published_at', () => {
    const created = createPost(db, makeInput());
    const published = setPostStatus(db, created.id, 'published');
    expect(published!.status).toBe('published');
    expect(published!.publishedAt).toBeTruthy();

    const back = setPostStatus(db, created.id, 'draft');
    expect(back!.status).toBe('draft');
    expect(back!.publishedAt).toBeNull();
  });

  it('rejects a status outside the CHECK constraint', () => {
    const created = createPost(db, makeInput());
    expect(() =>
      db.prepare('UPDATE posts SET status = ? WHERE id = ?').run('rendered', created.id),
    ).toThrow(/CHECK constraint failed/);
  });

  it('queryPosts filters by status', () => {
    const a = createPost(db, makeInput({ title: 'A' }));
    createPost(db, makeInput({ title: 'B' }));
    setPostStatus(db, a.id, 'published');

    expect(queryPosts(db, { status: 'published' }).map((p) => p.title)).toEqual(['A']);
    expect(queryPosts(db, { status: 'draft' }).map((p) => p.title)).toEqual(['B']);
    expect(queryPosts(db)).toHaveLength(2);
  });

  it('queryPosts filters by keyword, case-insensitively', () => {
    createPost(db, makeInput({ title: 'Budget', keywords: ['Budget'] }));
    createPost(db, makeInput({ title: 'Sport', keywords: ['sport'] }));

    expect(queryPosts(db, { keyword: 'budget' }).map((p) => p.title)).toEqual(['Budget']);
    expect(queryPosts(db, { keyword: 'SPORT' }).map((p) => p.title)).toEqual(['Sport']);
  });

  it('queryPosts searches title, description and markup', () => {
    createPost(db, makeInput({ title: 'Needle in the title' }));
    createPost(db, makeInput({ title: 'Other', description: 'needle in the description' }));
    createPost(db, makeInput({ title: 'Third', description: '', markup: '<head></head><body>needle</body>' }));

    expect(queryPosts(db, { search: 'needle' })).toHaveLength(3);
    expect(queryPosts(db, { search: 'haystack' })).toHaveLength(0);
  });

  it('queryPosts orders newest-updated first and honours limit/offset', async () => {
    const first = createPost(db, makeInput({ title: 'First' }));
    await new Promise((r) => setTimeout(r, 10));
    const second = createPost(db, makeInput({ title: 'Second' }));

    const all = queryPosts(db);
    expect(all[0].id).toBe(second.id);
    expect(all[1].id).toBe(first.id);
    expect(queryPosts(db, { limit: 1 }).map((p) => p.id)).toEqual([second.id]);
    expect(queryPosts(db, { limit: 1, offset: 1 }).map((p) => p.id)).toEqual([first.id]);
  });

  it('removePost returns the deleted post and cascades its keyword links and renders', () => {
    const created = createPost(db, makeInput());
    recordRender(db, { postId: created.id, outputDir: '/output/x', slideCount: 2 });

    const deleted = removePost(db, created.id);
    expect(deleted!.id).toBe(created.id);
    expect(findPost(db, created.id)).toBeUndefined();

    const links = db.prepare('SELECT COUNT(*) AS n FROM post_keywords').get() as { n: number };
    const renders = db.prepare('SELECT COUNT(*) AS n FROM renders').get() as { n: number };
    expect(links.n).toBe(0);
    expect(renders.n).toBe(0);
  });

  it('removePost returns undefined for an unknown id', () => {
    expect(removePost(db, 9999)).toBeUndefined();
  });

  it('countPosts counts all posts or one status', () => {
    const a = createPost(db, makeInput());
    createPost(db, makeInput());
    setPostStatus(db, a.id, 'published');
    expect(countPosts(db)).toBe(2);
    expect(countPosts(db, 'published')).toBe(1);
    expect(countPosts(db, 'draft')).toBe(1);
  });
});
