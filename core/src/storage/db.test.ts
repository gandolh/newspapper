import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
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

function columns(db: ReturnType<typeof getDb>, table: string): string[] {
  return (db.pragma(`table_info(${table})`) as Array<{ name: string }>).map((c) => c.name);
}

function tableNames(db: ReturnType<typeof getDb>): string[] {
  return (
    db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>
  ).map((r) => r.name);
}

function indexNames(db: ReturnType<typeof getDb>): string[] {
  return (
    db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as Array<{ name: string }>
  ).map((r) => r.name);
}

describe('getDb — fresh install', () => {
  it('sets user_version to 4', () => {
    const db = getDb(join(tmpDir, 'fresh.db'));
    const ver = db.pragma('user_version', { simple: true }) as number;
    db.close();
    expect(ver).toBe(4);
  });

  it('defaults posts.theme to the renamed theme', () => {
    const db = getDb(join(tmpDir, 'fresh.db'));
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO posts (title, markup, created_at, updated_at) VALUES (?, ?, ?, ?)`).run(
      'T',
      '<head></head><body></body>',
      now,
      now,
    );
    const row = db.prepare('SELECT theme FROM posts').get() as { theme: string };
    db.close();
    expect(row.theme).toBe('warm-industrial-1');
  });

  it('creates every v3 table', () => {
    const db = getDb(join(tmpDir, 'fresh.db'));
    const tables = tableNames(db);
    db.close();
    for (const t of [
      'users',
      'posts',
      'keywords',
      'post_keywords',
      'renders',
      'sources',
      'articles',
      'uploads',
      'settings',
    ]) {
      expect(tables).toContain(t);
    }
  });

  it('creates posts with the authored-document columns and no payload', () => {
    const db = getDb(join(tmpDir, 'fresh.db'));
    const cols = columns(db, 'posts');
    db.close();
    expect(cols).toEqual([
      'id',
      'title',
      'description',
      'markup',
      'theme',
      'status',
      'created_at',
      'updated_at',
      'published_at',
    ]);
    expect(cols).not.toContain('payload');
    expect(cols).not.toContain('output_dir');
    expect(cols).not.toContain('date');
  });

  it('creates articles with guid, saved_at and the denormalized source name', () => {
    const db = getDb(join(tmpDir, 'fresh.db'));
    const cols = columns(db, 'articles');
    db.close();
    expect(cols).toEqual([
      'id',
      'source_id',
      'source_name',
      'guid',
      'title',
      'url',
      'body',
      'published_at',
      'saved_at',
    ]);
  });

  it('creates the listing indexes named in the schema', () => {
    const db = getDb(join(tmpDir, 'fresh.db'));
    const idx = indexNames(db);
    db.close();
    expect(idx).toContain('idx_posts_status_updated_at');
    expect(idx).toContain('idx_articles_saved_at');
    expect(idx).toContain('idx_post_keywords_keyword_id');
  });

  it('enforces the posts.status CHECK constraint', () => {
    const db = getDb(join(tmpDir, 'fresh.db'));
    const now = new Date().toISOString();
    const insert = () =>
      db
        .prepare(
          `INSERT INTO posts (title, markup, theme, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run('T', '<head></head><body></body>', 'warm-industrial-1', 'rendered', now, now);
    expect(insert).toThrow(/CHECK constraint failed/);
    db.close();
  });

  it('enforces foreign keys', () => {
    const db = getDb(join(tmpDir, 'fresh.db'));
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    const orphan = () =>
      db
        .prepare(
          `INSERT INTO renders (post_id, output_dir, slide_count, created_at)
           VALUES (?, ?, ?, ?)`,
        )
        .run(9999, '/tmp/nope', 1, new Date().toISOString());
    expect(orphan).toThrow(/FOREIGN KEY constraint failed/);
    db.close();
  });

  it('does not seed sources from data/sources.json into a non-default DB', () => {
    const db = getDb(join(tmpDir, 'fresh.db'));
    const row = db.prepare('SELECT COUNT(*) AS n FROM sources').get() as { n: number };
    db.close();
    expect(row.n).toBe(0);
  });
});

describe('migrate — idempotence', () => {
  it('re-running migrate on a current DB changes nothing', () => {
    const dbPath = join(tmpDir, 'again.db');
    const db = getDb(dbPath);
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO posts (title, markup, theme, status, created_at, updated_at)
       VALUES (?, ?, ?, 'draft', ?, ?)`,
    ).run('Kept', '<head></head><body></body>', 'warm-industrial-1', now, now);

    migrate(db);
    migrate(db);

    const ver = db.pragma('user_version', { simple: true }) as number;
    const rows = db.prepare('SELECT title FROM posts').all() as Array<{ title: string }>;
    db.close();
    expect(ver).toBe(4);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Kept');
  });
});

describe('migrate — v3 → v4 (the warm-industrial rename)', () => {
  /** A v3 DB, built from the schema as it shipped: legacy theme default and all. */
  function buildV3Db(dbPath: string) {
    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE posts (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        title        TEXT NOT NULL,
        description  TEXT NOT NULL DEFAULT '',
        markup       TEXT NOT NULL,
        theme        TEXT NOT NULL DEFAULT 'warm-industrial',
        status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL,
        published_at TEXT
      );
      CREATE INDEX idx_posts_status_updated_at ON posts(status, updated_at);
      CREATE TABLE keywords (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE
      );
      CREATE TABLE post_keywords (
        post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
        PRIMARY KEY (post_id, keyword_id)
      );
      CREATE TABLE renders (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        output_dir  TEXT NOT NULL,
        slide_count INTEGER NOT NULL DEFAULT 0,
        optimized   INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL
      );
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
    const now = '2026-08-01T00:00:00.000Z';
    const post = db.prepare(
      `INSERT INTO posts (title, markup, theme, status, created_at, updated_at)
       VALUES (?, ?, ?, 'draft', ?, ?)`,
    );
    post.run('Legacy', '<head></head><body></body>', 'warm-industrial', now, now);
    post.run('Already moved', '<head></head><body></body>', 'warm-industrial-2', now, now);
    db.prepare(`INSERT INTO keywords (id, name) VALUES (1, 'news')`).run();
    db.prepare(`INSERT INTO post_keywords (post_id, keyword_id) VALUES (1, 1)`).run();
    db.prepare(
      `INSERT INTO renders (post_id, output_dir, slide_count, created_at) VALUES (1, ?, 3, ?)`,
    ).run('/output/2026-08-01-1', now);
    db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`).run(
      'defaultTheme',
      'warm-industrial',
    );
    db.pragma('user_version = 3');
    db.close();
  }

  it('rewrites stored rows and leaves the other family members alone', () => {
    const dbPath = join(tmpDir, 'v3.db');
    buildV3Db(dbPath);
    const db = getDb(dbPath);
    const rows = db.prepare('SELECT title, theme FROM posts ORDER BY id').all() as Array<{
      title: string;
      theme: string;
    }>;
    const ver = db.pragma('user_version', { simple: true }) as number;
    db.close();
    expect(ver).toBe(4);
    expect(rows).toEqual([
      { title: 'Legacy', theme: 'warm-industrial-1' },
      { title: 'Already moved', theme: 'warm-industrial-2' },
    ]);
  });

  it('rewrites the defaultTheme setting', () => {
    const dbPath = join(tmpDir, 'v3.db');
    buildV3Db(dbPath);
    const db = getDb(dbPath);
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('defaultTheme') as {
      value: string;
    };
    db.close();
    expect(row.value).toBe('warm-industrial-1');
  });

  it('rewrites the posts.theme column default', () => {
    const dbPath = join(tmpDir, 'v3.db');
    buildV3Db(dbPath);
    const db = getDb(dbPath);
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO posts (title, markup, created_at, updated_at) VALUES (?, ?, ?, ?)`).run(
      'Fresh',
      '<head></head><body></body>',
      now,
      now,
    );
    const row = db.prepare(`SELECT theme FROM posts WHERE title = 'Fresh'`).get() as {
      theme: string;
    };
    db.close();
    expect(row.theme).toBe('warm-industrial-1');
  });

  it('keeps the child rows the table rebuild could have cascaded away', () => {
    const dbPath = join(tmpDir, 'v3.db');
    buildV3Db(dbPath);
    const db = getDb(dbPath);
    const keywords = db.prepare('SELECT COUNT(*) AS n FROM post_keywords').get() as { n: number };
    const renders = db.prepare('SELECT COUNT(*) AS n FROM renders').get() as { n: number };
    const violations = db.pragma('foreign_key_check') as unknown[];
    const idx = indexNames(db);
    const fk = db.pragma('foreign_keys', { simple: true });
    db.close();
    expect(keywords.n).toBe(1);
    expect(renders.n).toBe(1);
    expect(violations).toEqual([]);
    expect(idx).toContain('idx_posts_status_updated_at');
    expect(fk).toBe(1);
  });

  it('still enforces the status CHECK on the rebuilt table', () => {
    const dbPath = join(tmpDir, 'v3.db');
    buildV3Db(dbPath);
    const db = getDb(dbPath);
    const now = new Date().toISOString();
    const insert = () =>
      db
        .prepare(
          `INSERT INTO posts (title, markup, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        )
        .run('Bad', '<head></head><body></body>', 'rendered', now, now);
    expect(insert).toThrow(/CHECK constraint failed/);
    db.close();
  });

  it('is a no-op when run again — including on a DB that never held the old value', () => {
    const dbPath = join(tmpDir, 'v3.db');
    buildV3Db(dbPath);
    const first = getDb(dbPath);
    const before = first.prepare(`SELECT sql FROM sqlite_master WHERE name = 'posts'`).get();
    migrate(first);
    migrate(first);
    const after = first.prepare(`SELECT sql FROM sqlite_master WHERE name = 'posts'`).get();
    const rows = first.prepare('SELECT COUNT(*) AS n FROM posts').get() as { n: number };
    first.close();
    expect(after).toEqual(before);
    expect(rows.n).toBe(2);

    const fresh = getDb(join(tmpDir, 'never-legacy.db'));
    migrate(fresh);
    const ver = fresh.pragma('user_version', { simple: true }) as number;
    fresh.close();
    expect(ver).toBe(4);
  });
});

describe('migrate — v2 schema (payload posts) with existing rows', () => {
  function buildV2Db(dbPath: string) {
    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE articles (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id     TEXT NOT NULL,
        source_name   TEXT NOT NULL DEFAULT '',
        title         TEXT NOT NULL,
        url           TEXT UNIQUE,
        published_at  TEXT NOT NULL,
        body          TEXT NOT NULL DEFAULT '',
        created_at    TEXT NOT NULL
      );
      CREATE INDEX idx_articles_published_at ON articles(published_at);
      CREATE INDEX idx_articles_source_id ON articles(source_id);
      CREATE TABLE posts (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        date         TEXT NOT NULL,
        title        TEXT NOT NULL DEFAULT '',
        theme        TEXT NOT NULL DEFAULT 'warm-industrial',
        payload      TEXT NOT NULL,
        status       TEXT NOT NULL DEFAULT 'draft',
        output_dir   TEXT,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );
      CREATE INDEX idx_posts_date ON posts(date);
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
    db.prepare(
      `INSERT INTO posts (date, title, theme, payload, status, output_dir, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'rendered', ?, ?, ?)`,
    ).run(
      '2026-06-10',
      'Old post',
      'warm-industrial',
      '{"date":"2026-06-10","title":"Old post","theme":"warm-industrial","slides":[]}',
      '/output/2026-06-10-1',
      '2026-06-10T00:00:00.000Z',
      '2026-06-10T00:00:00.000Z',
    );
    db.prepare(
      `INSERT INTO articles (source_id, source_name, title, url, published_at, body, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'bbc',
      'BBC News',
      'Old article',
      'https://bbc.co.uk/1',
      '2026-06-10T09:00:00.000Z',
      'body',
      '2026-06-10T09:00:00.000Z',
    );
    db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`).run(
      'defaultTheme',
      'warm-industrial',
    );
    db.pragma('user_version = 2');
    db.close();
  }

  it('migrates to the current version without throwing', () => {
    const dbPath = join(tmpDir, 'v2.db');
    buildV2Db(dbPath);
    const db = getDb(dbPath);
    const ver = db.pragma('user_version', { simple: true }) as number;
    db.close();
    expect(ver).toBe(4);
  });

  it('drops every payload post — they carry no markup to derive from', () => {
    const dbPath = join(tmpDir, 'v2.db');
    buildV2Db(dbPath);
    const db = getDb(dbPath);
    const cols = columns(db, 'posts');
    const row = db.prepare('SELECT COUNT(*) AS n FROM posts').get() as { n: number };
    db.close();
    expect(cols).not.toContain('payload');
    expect(row.n).toBe(0);
  });

  it('drops every scraped article — v3 persists only saved ones', () => {
    const dbPath = join(tmpDir, 'v2.db');
    buildV2Db(dbPath);
    const db = getDb(dbPath);
    const row = db.prepare('SELECT COUNT(*) AS n FROM articles').get() as { n: number };
    db.close();
    expect(row.n).toBe(0);
  });

  it('keeps settings rows', () => {
    const dbPath = join(tmpDir, 'v2.db');
    buildV2Db(dbPath);
    const db = getDb(dbPath);
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('defaultTheme') as
      | { value: string }
      | undefined;
    db.close();
    expect(row?.value).toBe('warm-industrial-1');
  });

  it('adds the tables v3 introduced', () => {
    const dbPath = join(tmpDir, 'v2.db');
    buildV2Db(dbPath);
    const db = getDb(dbPath);
    const tables = tableNames(db);
    db.close();
    for (const t of ['users', 'keywords', 'post_keywords', 'renders', 'sources', 'uploads']) {
      expect(tables).toContain(t);
    }
  });

  it('is safe to open twice', () => {
    const dbPath = join(tmpDir, 'v2.db');
    buildV2Db(dbPath);
    getDb(dbPath).close();
    const db = getDb(dbPath);
    const ver = db.pragma('user_version', { simple: true }) as number;
    const tables = tableNames(db);
    db.close();
    expect(ver).toBe(4);
    expect(tables).toContain('post_keywords');
  });
});

describe('migrate — v1 schema (old CLI era)', () => {
  function buildV1Db(dbPath: string) {
    const db = new Database(dbPath);
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
    db.prepare(
      `INSERT INTO posts (date, run_number, payload, output_dir, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run(
      '2024-01-01',
      1,
      '{"date":"2024-01-01","title":"t","theme":"w","slides":[]}',
      '/output/2024-01-01-1',
      '2024-01-01T00:00:00.000Z',
    );
    db.pragma('user_version = 1');
    db.close();
  }

  it('walks all the way forward to the current version in one boot', () => {
    const dbPath = join(tmpDir, 'v1.db');
    buildV1Db(dbPath);
    const db = getDb(dbPath);
    const ver = db.pragma('user_version', { simple: true }) as number;
    const cols = columns(db, 'posts');
    const rows = db.prepare('SELECT COUNT(*) AS n FROM posts').get() as { n: number };
    db.close();
    expect(ver).toBe(4);
    expect(cols).toContain('markup');
    expect(rows.n).toBe(0);
  });
});

describe('default db path', () => {
  const original = process.env['NEWSPAPPER_DB_PATH'];

  afterEach(() => {
    if (original === undefined) delete process.env['NEWSPAPPER_DB_PATH'];
    else process.env['NEWSPAPPER_DB_PATH'] = original;
  });

  it('opens NEWSPAPPER_DB_PATH rather than the repo database', () => {
    const dir = mkdtempSync(join(tmpdir(), 'newspapper-dbpath-'));
    const target = join(dir, 'override.db');
    process.env['NEWSPAPPER_DB_PATH'] = target;

    const db = getDb();
    db.close();

    expect(existsSync(target)).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});
