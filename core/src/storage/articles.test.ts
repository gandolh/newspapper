import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDb, type DB } from './db.js';
import { saveSources } from './sources.js';
import {
  saveArticle,
  saveArticles,
  listArticles,
  findArticle,
  removeArticle,
  countArticles,
} from './articles.js';

let tmpDir: string;
let db: DB;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-articles-test-'));
  db = getDb(join(tmpDir, 'test.db'));
  saveSources([{ id: 'bbc', name: 'BBC News', rss: 'https://bbc.co.uk/rss', enabled: true }], db);
});

afterEach(() => {
  db.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('articles — the saved library', () => {
  it('saveArticle stores a row and returns it', () => {
    const a = saveArticle(db, {
      sourceId: 'bbc',
      sourceName: 'BBC News',
      guid: 'g1',
      title: 'Budget day',
      url: 'https://bbc.co.uk/1',
      body: 'text',
      publishedAt: '2026-06-10T09:00:00.000Z',
    });
    expect(a.id).toBeGreaterThan(0);
    expect(a.sourceId).toBe('bbc');
    expect(a.savedAt).toBeTruthy();
    expect(findArticle(db, a.id)).toEqual(a);
  });

  it('is idempotent on (source_id, guid)', () => {
    const input = { sourceId: 'bbc', sourceName: 'BBC News', guid: 'g1', title: 'One' };
    const first = saveArticle(db, input);
    const second = saveArticle(db, input);
    expect(second.id).toBe(first.id);
    expect(countArticles(db)).toBe(1);
  });

  it('dedupes source-less articles on guid alone', () => {
    saveArticle(db, { sourceName: 'Manual', guid: 'g-manual', title: 'One' });
    saveArticle(db, { sourceName: 'Manual', guid: 'g-manual', title: 'One' });
    expect(countArticles(db)).toBe(1);
  });

  it('stores an unknown source id as NULL but keeps the name snapshot', () => {
    const a = saveArticle(db, { sourceId: 'gone', sourceName: 'Gone Daily', guid: 'g2', title: 'X' });
    expect(a.sourceId).toBeNull();
    expect(a.sourceName).toBe('Gone Daily');
  });

  it('falls back to the URL as the guid', () => {
    const a = saveArticle(db, { sourceId: 'bbc', title: 'X', url: 'https://bbc.co.uk/2' });
    expect(a.guid).toBe('https://bbc.co.uk/2');
  });

  it('saveArticles reports only the newly inserted rows', () => {
    const rows = [
      { sourceId: 'bbc', guid: 'a', title: 'A' },
      { sourceId: 'bbc', guid: 'b', title: 'B' },
    ];
    expect(saveArticles(db, rows)).toBe(2);
    expect(saveArticles(db, rows)).toBe(0);
    expect(countArticles(db)).toBe(2);
  });

  it('listArticles returns most recently saved first and filters', () => {
    saveArticle(db, { sourceId: 'bbc', guid: 'a', title: 'Budget day', body: 'about tax' });
    saveArticle(db, { sourceName: 'Manual', guid: 'b', title: 'Sport night' });

    expect(listArticles(db).map((a) => a.title)).toEqual(['Sport night', 'Budget day']);
    expect(listArticles(db, { sourceId: 'bbc' }).map((a) => a.title)).toEqual(['Budget day']);
    expect(listArticles(db, { search: 'tax' }).map((a) => a.title)).toEqual(['Budget day']);
    expect(listArticles(db, { limit: 1 })).toHaveLength(1);
  });

  it('removeArticle deletes and returns the row', () => {
    const a = saveArticle(db, { sourceId: 'bbc', guid: 'a', title: 'A' });
    expect(removeArticle(db, a.id)!.id).toBe(a.id);
    expect(findArticle(db, a.id)).toBeUndefined();
    expect(removeArticle(db, a.id)).toBeUndefined();
  });
});
