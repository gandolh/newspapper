import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDb, type DB } from './db.js';
import { createPost } from './posts.js';
import {
  setPostKeywords,
  keywordsForPost,
  listKeywords,
  pruneKeywords,
  normalizeKeywords,
} from './keywords.js';

let tmpDir: string;
let db: DB;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-keywords-test-'));
  db = getDb(join(tmpDir, 'test.db'));
});

afterEach(() => {
  db.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

function newPost(title = 'Post') {
  return createPost(db, { title, markup: '<head></head><body></body>' });
}

function keywordCount(): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM keywords').get() as { n: number }).n;
}

describe('normalizeKeywords', () => {
  it('trims, drops empties, and collapses case-insensitive duplicates', () => {
    expect(normalizeKeywords([' budget ', 'Budget', '', '  ', 'economy'])).toEqual([
      'budget',
      'economy',
    ]);
  });
});

describe('setPostKeywords', () => {
  it('upserts into keywords and links them to the post', () => {
    const post = newPost();
    const names = setPostKeywords(db, post.id, ['budget', 'economy']);
    expect(names).toEqual(['budget', 'economy']);
    expect(keywordsForPost(db, post.id)).toEqual(['budget', 'economy']);
    expect(keywordCount()).toBe(2);
  });

  it('reuses an existing keyword row across posts', () => {
    const a = newPost('A');
    const b = newPost('B');
    setPostKeywords(db, a.id, ['budget']);
    setPostKeywords(db, b.id, ['budget']);
    expect(keywordCount()).toBe(1);

    const links = db.prepare('SELECT COUNT(*) AS n FROM post_keywords').get() as { n: number };
    expect(links.n).toBe(2);
  });

  it('matches case-insensitively so "Budget" and "budget" are one keyword', () => {
    const a = newPost('A');
    const b = newPost('B');
    setPostKeywords(db, a.id, ['Budget']);
    setPostKeywords(db, b.id, ['budget']);
    expect(keywordCount()).toBe(1);
  });

  it('replaces the post links rather than appending to them', () => {
    const post = newPost();
    setPostKeywords(db, post.id, ['budget', 'economy']);
    setPostKeywords(db, post.id, ['tax']);
    expect(keywordsForPost(db, post.id)).toEqual(['tax']);
  });

  it('clears every link when given an empty list', () => {
    const post = newPost();
    setPostKeywords(db, post.id, ['budget']);
    expect(setPostKeywords(db, post.id, [])).toEqual([]);
    expect(keywordsForPost(db, post.id)).toEqual([]);
  });

  it('leaves the previous links intact when the replacement throws', () => {
    const post = newPost();
    setPostKeywords(db, post.id, ['budget']);
    expect(() => setPostKeywords(db, 9999, ['tax'])).toThrow(/FOREIGN KEY constraint failed/);
    expect(keywordsForPost(db, post.id)).toEqual(['budget']);
  });
});

describe('listKeywords', () => {
  it('reports how many posts use each keyword, most used first', () => {
    const a = newPost('A');
    const b = newPost('B');
    setPostKeywords(db, a.id, ['budget', 'economy']);
    setPostKeywords(db, b.id, ['budget']);

    const all = listKeywords(db);
    expect(all.map((k) => [k.name, k.postCount])).toEqual([
      ['budget', 2],
      ['economy', 1],
    ]);
  });
});

describe('pruneKeywords', () => {
  it('removes keywords no post references any more', () => {
    const post = newPost();
    setPostKeywords(db, post.id, ['budget', 'economy']);
    setPostKeywords(db, post.id, ['budget']);
    expect(pruneKeywords(db)).toBe(1);
    expect(listKeywords(db).map((k) => k.name)).toEqual(['budget']);
  });
});
