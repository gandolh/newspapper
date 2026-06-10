import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { getDb, migrate } from './db.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-db-test-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('getDb — fresh install', () => {
  it('sets user_version to 2', () => {
    const dbPath = join(tmpDir, 'fresh.db');
    const db = getDb(dbPath);
    const ver = db.pragma('user_version', { simple: true }) as number;
    db.close();
    expect(ver).toBe(2);
  });

  it('creates articles table with expected columns', () => {
    const dbPath = join(tmpDir, 'fresh.db');
    const db = getDb(dbPath);
    const cols = (db.pragma('table_info(articles)') as Array<{ name: string }>).map((c) => c.name);
    db.close();
    expect(cols).toContain('id');
    expect(cols).toContain('source_id');
    expect(cols).toContain('source_name');
    expect(cols).toContain('title');
    expect(cols).toContain('url');
    expect(cols).toContain('published_at');
    expect(cols).toContain('body');
    expect(cols).toContain('created_at');
  });

  it('creates posts table with expected columns', () => {
    const dbPath = join(tmpDir, 'fresh.db');
    const db = getDb(dbPath);
    const cols = (db.pragma('table_info(posts)') as Array<{ name: string }>).map((c) => c.name);
    db.close();
    expect(cols).toContain('id');
    expect(cols).toContain('date');
    expect(cols).toContain('title');
    expect(cols).toContain('theme');
    expect(cols).toContain('payload');
    expect(cols).toContain('status');
    expect(cols).toContain('output_dir');
    expect(cols).toContain('created_at');
    expect(cols).toContain('updated_at');
  });

  it('creates settings table', () => {
    const dbPath = join(tmpDir, 'fresh.db');
    const db = getDb(dbPath);
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>).map((r) => r.name);
    db.close();
    expect(tables).toContain('settings');
  });
});

describe('migrate — v1 schema (old CLI era)', () => {
  function buildV1Db(dbPath: string) {
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    // Create old schema
    db.exec(`
      CREATE TABLE articles (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id     TEXT NOT NULL,
        url           TEXT NOT NULL UNIQUE,
        title         TEXT NOT NULL,
        summary       TEXT NOT NULL DEFAULT '',
        body          TEXT NOT NULL DEFAULT '',
        published_at  TEXT NOT NULL,
        scraped_at    TEXT NOT NULL
      );
      CREATE TABLE posts (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        date         TEXT NOT NULL,
        run_number   INTEGER NOT NULL,
        payload      TEXT NOT NULL,
        output_dir   TEXT NOT NULL,
        created_at   TEXT NOT NULL,
        UNIQUE(date, run_number)
      );
    `);
    // Insert old rows
    db.prepare(`INSERT INTO posts (date, run_number, payload, output_dir, created_at) VALUES (?, ?, ?, ?, ?)`).run(
      '2024-01-01', 1, '{"date":"2024-01-01","title":"t","theme":"w","slides":[]}', '/output/2024-01-01-1', '2024-01-01T00:00:00.000Z'
    );
    db.pragma(`user_version = 1`);
    db.close();
  }

  it('adds missing columns to posts and updates user_version', () => {
    const dbPath = join(tmpDir, 'v1.db');
    buildV1Db(dbPath);
    const db = getDb(dbPath);
    const ver = db.pragma('user_version', { simple: true }) as number;
    const cols = (db.pragma('table_info(posts)') as Array<{ name: string }>).map((c) => c.name);
    db.close();
    expect(ver).toBe(2);
    expect(cols).toContain('status');
    expect(cols).toContain('updated_at');
    expect(cols).toContain('title');
    expect(cols).toContain('theme');
  });

  it('marks existing rows as status=rendered', () => {
    const dbPath = join(tmpDir, 'v1.db');
    buildV1Db(dbPath);
    const db = getDb(dbPath);
    const rows = db.prepare("SELECT status FROM posts").all() as Array<{ status: string }>;
    db.close();
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe('rendered');
  });

  it('adds created_at to articles (from scraped_at)', () => {
    const dbPath = join(tmpDir, 'v1.db');
    buildV1Db(dbPath);
    const db = getDb(dbPath);
    const cols = (db.pragma('table_info(articles)') as Array<{ name: string }>).map((c) => c.name);
    db.close();
    expect(cols).toContain('created_at');
    expect(cols).toContain('source_name');
  });
});
