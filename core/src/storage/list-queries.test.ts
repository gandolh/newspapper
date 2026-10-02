/**
 * Brief 95: the list queries load in O(1) statements and carry only what the
 * lists show.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getDb, type DB } from './db.js';
import { createPost, queryPostSummaries, queryPosts } from './posts.js';
import { keywordsForPosts } from './keywords.js';
import { latestRenders, recordRender } from './renders.js';
import { listArticleSummaries, saveArticle } from './articles.js';

let tmp: string;
let db: DB;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'np-list-'));
  db = getDb(join(tmp, 'test.db'));
});

afterEach(() => {
  db.close();
  rmSync(tmp, { recursive: true, force: true });
});

/** Count statements executed through `db` while `fn` runs. */
function countStatements<T>(fn: () => T): { result: T; statements: number } {
  const target = db as unknown as { prepare: (...a: unknown[]) => unknown };
  const original = target.prepare;
  let statements = 0;
  target.prepare = (...args: unknown[]) => {
    const stmt = original.apply(db, args) as Record<string, (...x: unknown[]) => unknown>;
    for (const method of ['all', 'get', 'run'] as const) {
      const run = stmt[method]!.bind(stmt);
      stmt[method] = (...x: unknown[]) => {
        statements += 1;
        return run(...x);
      };
    }
    return stmt;
  };
  try {
    return { result: fn(), statements };
  } finally {
    target.prepare = original;
  }
}

function seed(n: number) {
  const ids: number[] = [];
  for (let i = 0; i < n; i++) {
    const post = createPost(db, {
      title: `P${i}`,
      markup: `<head><title>P${i}</title></head><body><Slide /></body>`,
      keywords: i % 2 ? ['news', 'world'] : ['sport'],
    });
    ids.push(post.id);
  }
  return ids;
}

describe('post lists', () => {
  it('summaries carry no markup, keep keywords, and cost two statements for any N', () => {
    seed(30);
    const { result, statements } = countStatements(() => queryPostSummaries(db));
    expect(result).toHaveLength(30);
    expect(statements).toBe(2);
    expect(result.every((p) => !('markup' in p))).toBe(true);
    expect(result.find((p) => p.title === 'P1')!.keywords).toEqual(['news', 'world']);
    expect(result.find((p) => p.title === 'P0')!.keywords).toEqual(['sport']);
  });

  it('full posts keep their markup and are no longer N+1', () => {
    seed(30);
    const { result, statements } = countStatements(() => queryPosts(db));
    expect(statements).toBe(2);
    expect(result[0]!.markup).toContain('<Slide />');
  });

  it('summaries match the full posts field for field, minus markup', () => {
    seed(5);
    const full = queryPosts(db).map(({ markup: _markup, ...rest }) => rest);
    expect(queryPostSummaries(db)).toEqual(full);
  });

  it('keywordsForPosts gives [] for a post with none, and handles no ids', () => {
    const [id] = seed(1);
    const bare = createPost(db, {
      title: 'bare',
      markup: '<head><title>b</title></head><body /></body>',
    });
    const map = keywordsForPosts(db, [id!, bare.id]);
    expect(map.get(id!)).toEqual(['sport']);
    expect(map.get(bare.id)).toEqual([]);
    expect(keywordsForPosts(db, []).size).toBe(0);
  });
});

describe('latestRenders', () => {
  it("returns each post's newest render, in one statement", () => {
    const [a, b, c] = seed(3);
    recordRender(db, { postId: a!, outputDir: '/out/a1', slideCount: 1 });
    recordRender(db, { postId: a!, outputDir: '/out/a2', slideCount: 2 });
    recordRender(db, { postId: b!, outputDir: '/out/b1', slideCount: 3 });
    void c; // no render
    const { result, statements } = countStatements(() => latestRenders(db));
    expect(statements).toBe(1);
    expect(result.map((r) => [r.postId, r.outputDir])).toEqual([
      [a, '/out/a2'],
      [b, '/out/b1'],
    ]);
  });
});

describe('listArticleSummaries', () => {
  it('cuts each body to an excerpt and drops the body', () => {
    saveArticle(db, {
      sourceId: 'm',
      sourceName: 'M',
      guid: 'g1',
      title: 'Long',
      url: 'https://e.x/1',
      body: 'b'.repeat(5000),
      publishedAt: '2026-01-01T00:00:00Z',
    });
    saveArticle(db, {
      sourceId: 'm',
      sourceName: 'M',
      guid: 'g2',
      title: 'Short',
      url: 'https://e.x/2',
      body: 'short body',
      publishedAt: '2026-01-02T00:00:00Z',
    });
    const list = listArticleSummaries(db);
    const long = list.find((a) => a.title === 'Long')!;
    expect('body' in long).toBe(false);
    expect(long.excerpt.length).toBeLessThanOrEqual(301);
    expect(long.excerpt.endsWith('…')).toBe(true);
    expect(list.find((a) => a.title === 'Short')!.excerpt).toBe('short body');
  });
});
