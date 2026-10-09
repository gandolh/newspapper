import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDb, type DB } from './db.js';
import {
  listSources,
  getSource,
  saveSources,
  addSource,
  updateSource,
  removeSource,
} from './sources.js';
import { insertFeedItems } from './feed-items.js';
import type { SourceConfig } from '../types.js';

let tmpDir: string;
let db: DB;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-sources-test-'));
  db = getDb(join(tmpDir, 'test.db'));
});

afterEach(() => {
  db.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

const src1: SourceConfig = {
  id: 'bbc',
  name: 'BBC News',
  rss: 'https://bbc.co.uk/rss',
  enabled: true,
};
const src2: SourceConfig = { id: 'cnn', name: 'CNN', rss: 'https://cnn.com/rss', enabled: false };

/** What listSources adds to a config that has never been refreshed. */
const neverRefreshed = { category: null, lastFetchedAt: null, lastError: null };

describe('sources — DB-backed CRUD', () => {
  it('listSources returns an empty array on a fresh DB', () => {
    expect(listSources(db)).toEqual([]);
  });

  it('saveSources then listSources round-trips, including the enabled flag', () => {
    saveSources([src1, src2], db);
    const all = listSources(db);
    expect(all).toHaveLength(2);
    expect(all.find((s) => s.id === 'bbc')).toEqual({ ...src1, ...neverRefreshed });
    expect(all.find((s) => s.id === 'cnn')).toEqual({ ...src2, ...neverRefreshed });
  });

  it('addSource appends and returns all sources', () => {
    saveSources([src1], db);
    const all = addSource(src2, db);
    expect(all).toHaveLength(2);
    expect(listSources(db)).toHaveLength(2);
  });

  it('addSource throws on duplicate id', () => {
    saveSources([src1], db);
    expect(() => addSource(src1, db)).toThrow(/already exists/);
  });

  it('rss_url is unique', () => {
    saveSources([src1], db);
    expect(() => addSource({ ...src1, id: 'bbc2' }, db)).toThrow(/UNIQUE constraint failed/);
  });

  it('getSource returns one source or undefined', () => {
    saveSources([src1], db);
    expect(getSource('bbc', db)?.name).toBe('BBC News');
    expect(getSource('nope', db)).toBeUndefined();
  });

  it('updateSource patches a source and leaves the rest alone', () => {
    saveSources([src1, src2], db);
    updateSource('bbc', { name: 'BBC World', enabled: false }, db);
    const bbc = getSource('bbc', db)!;
    expect(bbc.name).toBe('BBC World');
    expect(bbc.enabled).toBe(false);
    expect(bbc.rss).toBe(src1.rss);
  });

  it('updateSource throws when id not found', () => {
    expect(() => updateSource('nonexistent', { enabled: false }, db)).toThrow(/not found/);
  });

  it('removeSource removes by id and returns remaining', () => {
    saveSources([src1, src2], db);
    const remaining = removeSource('bbc', db);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('cnn');
  });

  it('removeSource throws when id not found', () => {
    expect(() => removeSource('nonexistent', db)).toThrow(/not found/);
  });

  it('deleting a source orphans its saved articles rather than deleting them', () => {
    saveSources([src1], db);
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO articles (source_id, source_name, guid, title, url, body, published_at, saved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('bbc', 'BBC News', 'g1', 'Kept', 'https://bbc.co.uk/1', '', now, now);

    removeSource('bbc', db);

    const row = db.prepare('SELECT source_id, source_name FROM articles').get() as {
      source_id: string | null;
      source_name: string;
    };
    expect(row.source_id).toBeNull();
    expect(row.source_name).toBe('BBC News');
  });

  it('deleting a source deletes its stored Reader items', () => {
    saveSources([src1], db);
    insertFeedItems(db, 'bbc', [{ title: 'A', url: 'https://bbc.co.uk/a' }], now());
    removeSource('bbc', db);
    expect(db.prepare('SELECT COUNT(*) AS n FROM feed_items').get()).toEqual({ n: 0 });
  });
});

function now(): string {
  return new Date().toISOString();
}

describe('sources — the Reader category (schema v6)', () => {
  it('stores a category trimmed, and a blank one as uncategorized', () => {
    addSource({ ...src1, category: '  Romania ' }, db);
    addSource({ ...src2, category: '   ' }, db);
    expect(getSource('bbc', db)?.category).toBe('Romania');
    expect(getSource('cnn', db)?.category).toBeNull();
  });

  it('saveSources keeps categories', () => {
    saveSources([{ ...src1, category: 'World' }, src2], db);
    expect(getSource('bbc', db)?.category).toBe('World');
    expect(getSource('cnn', db)?.category).toBeNull();
  });

  it('updateSource sets and clears a category, and leaves it alone when not patched', () => {
    saveSources([{ ...src1, category: 'World' }], db);
    updateSource('bbc', { name: 'BBC World' }, db);
    expect(getSource('bbc', db)?.category).toBe('World');
    updateSource('bbc', { category: 'Tech' }, db);
    expect(getSource('bbc', db)?.category).toBe('Tech');
    updateSource('bbc', { category: null }, db);
    expect(getSource('bbc', db)?.category).toBeNull();
  });

  it('updateSource never touches the refresh bookkeeping, but a new URL drops the validators', () => {
    saveSources([src1], db);
    db.prepare(
      `UPDATE sources SET etag = 'e1', last_modified = 'lm1',
         last_fetched_at = '2026-10-01T00:00:00.000Z', last_error = 'boom' WHERE id = 'bbc'`,
    ).run();
    const validators = () =>
      db.prepare(`SELECT etag, last_modified FROM sources WHERE id = 'bbc'`).get();

    updateSource('bbc', { name: 'Renamed', enabled: false }, db);
    expect(validators()).toEqual({ etag: 'e1', last_modified: 'lm1' });
    expect(getSource('bbc', db)).toMatchObject({
      lastFetchedAt: '2026-10-01T00:00:00.000Z',
      lastError: 'boom',
    });

    updateSource('bbc', { rss: 'https://bbc.co.uk/world/rss' }, db);
    expect(validators()).toEqual({ etag: null, last_modified: null });
  });
});
