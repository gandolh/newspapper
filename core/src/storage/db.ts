import Database from 'better-sqlite3';
import type { Database as DB } from 'better-sqlite3';
import { ensureParent } from '../util/paths.js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SourceConfig } from '../types.js';

export type { DB };

/**
 * Default DB path. NEWSPAPPER_DB_PATH wins so tests and alternate instances can
 * point somewhere else; otherwise resolved from this file's location so it lands
 * on repo_root/data/newspapper.db regardless of the process CWD.
 * (db.ts → storage/ → src/ → core/ → repo root)
 */
function defaultDbPath(): string {
  const override = process.env['NEWSPAPPER_DB_PATH'];
  if (override !== undefined && override !== '') return resolve(override);
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(thisFile, '..', '..', '..', '..', 'data', 'newspapper.db');
}

function defaultSourcesPath(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(thisFile, '..', '..', '..', '..', 'data', 'sources.json');
}

const CURRENT_SCHEMA_VERSION = 4;

export function getDb(dbPath?: string): DB {
  const p = resolve(dbPath ?? defaultDbPath());
  ensureParent(p);
  const db = new Database(p);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

/** @deprecated Use getDb instead */
export function open(path: string): DB {
  return getDb(path);
}

const SCHEMA_CURRENT = `
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS posts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    markup       TEXT NOT NULL,
    theme        TEXT NOT NULL DEFAULT 'warm-industrial-1',
    status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    published_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_posts_status_updated_at ON posts(status, updated_at);

  CREATE TABLE IF NOT EXISTS keywords (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
  );

  CREATE TABLE IF NOT EXISTS post_keywords (
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, keyword_id)
  );

  CREATE INDEX IF NOT EXISTS idx_post_keywords_keyword_id ON post_keywords(keyword_id);

  CREATE TABLE IF NOT EXISTS renders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    output_dir  TEXT NOT NULL,
    slide_count INTEGER NOT NULL DEFAULT 0,
    optimized   INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_renders_post_id ON renders(post_id);

  CREATE TABLE IF NOT EXISTS sources (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    rss_url    TEXT NOT NULL UNIQUE,
    enabled    INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS articles (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id    TEXT REFERENCES sources(id) ON DELETE SET NULL,
    source_name  TEXT NOT NULL DEFAULT '',
    guid         TEXT NOT NULL,
    title        TEXT NOT NULL,
    url          TEXT,
    body         TEXT NOT NULL DEFAULT '',
    published_at TEXT NOT NULL,
    saved_at     TEXT NOT NULL,
    UNIQUE (source_id, guid)
  );

  CREATE INDEX IF NOT EXISTS idx_articles_saved_at ON articles(saved_at);

  CREATE TABLE IF NOT EXISTS uploads (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    filename        TEXT NOT NULL,
    stored_path     TEXT NOT NULL,
    normalized_path TEXT,
    mime            TEXT NOT NULL,
    width           INTEGER,
    height          INTEGER,
    bytes           INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

/**
 * Copy data/sources.json into the sources table. Runs only for the default
 * installation DB — a caller-supplied path (tests, throwaway DBs) never picks
 * up the developer's feed list.
 */
function seedSourcesFromJson(db: DB): void {
  if (resolve(db.name) !== defaultDbPath()) return;
  const jsonPath = defaultSourcesPath();
  if (!existsSync(jsonPath)) return;

  const raw = readFileSync(jsonPath, 'utf8').trim();
  if (!raw) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  if (!Array.isArray(parsed)) return;

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO sources (id, name, rss_url, enabled, created_at)
    VALUES (@id, @name, @rss_url, @enabled, @created_at)
  `);
  const tx = db.transaction((rows: SourceConfig[]) => {
    for (const row of rows) {
      if (!row?.id || !row?.rss) continue;
      stmt.run({
        id: row.id,
        name: row.name ?? row.id,
        rss_url: row.rss,
        enabled: row.enabled === false ? 0 : 1,
        created_at: now,
      });
    }
  });
  tx(parsed as SourceConfig[]);
}

/**
 * v1 → v2: the CLI-era schema gains the columns the web app expects.
 * Kept so a very old DB can still be walked forward to v3 in one boot.
 */
function migrateV1ToV2(db: DB): void {
  const postCols = (db.pragma('table_info(posts)') as Array<{ name: string }>).map((c) => c.name);
  if (!postCols.includes('title')) {
    db.exec(`ALTER TABLE posts ADD COLUMN title TEXT NOT NULL DEFAULT ''`);
  }
  if (!postCols.includes('theme')) {
    db.exec(`ALTER TABLE posts ADD COLUMN theme TEXT NOT NULL DEFAULT 'warm-industrial'`);
  }
  if (!postCols.includes('status')) {
    db.exec(`ALTER TABLE posts ADD COLUMN status TEXT NOT NULL DEFAULT 'rendered'`);
  }
  if (!postCols.includes('updated_at')) {
    db.exec(`ALTER TABLE posts ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`);
    db.exec(`UPDATE posts SET updated_at = created_at WHERE updated_at = ''`);
  }
  db.exec(`UPDATE posts SET status = 'rendered' WHERE status = ''`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const articleCols = (db.pragma('table_info(articles)') as Array<{ name: string }>).map((c) => c.name);
  if (!articleCols.includes('source_name')) {
    db.exec(`ALTER TABLE articles ADD COLUMN source_name TEXT NOT NULL DEFAULT ''`);
  }
  if (!articleCols.includes('created_at')) {
    db.exec(`ALTER TABLE articles ADD COLUMN created_at TEXT NOT NULL DEFAULT ''`);
    if (articleCols.includes('scraped_at')) {
      db.exec(`UPDATE articles SET created_at = scraped_at WHERE created_at = ''`);
    }
  }
}

/**
 * v2 → v3: posts become authored `.wzd` documents and articles become a saved
 * library. Neither old table has a forward-compatible row:
 *
 * - `posts.payload` held a composed slide tree with no markup to derive it
 *   from, so every v2 post row is dropped with the column.
 * - `articles` held transient scrape output, which v3 no longer persists, so
 *   every v2 article row is dropped too.
 *
 * `settings` survives untouched.
 */
function migrateV2ToV3(db: DB): void {
  db.exec(`
    DROP TABLE IF EXISTS posts;
    DROP TABLE IF EXISTS articles;
    DROP INDEX IF EXISTS idx_posts_date;
    DROP INDEX IF EXISTS idx_articles_published_at;
    DROP INDEX IF EXISTS idx_articles_source_id;
  `);
  db.exec(SCHEMA_CURRENT);
}

/**
 * v3 → v4: the single `warm-industrial` theme became the three-strong family
 * `warm-industrial-{1,2,3}`, and the unsuffixed JSON is gone — so a stored
 * `'warm-industrial'` would now throw `Theme not found` at render time.
 *
 * Rewrites the stored rows, the `defaultTheme` setting, and the `posts.theme`
 * column default. Only the column default needs a table rebuild, so that half
 * is skipped unless the legacy default is actually still in the schema, which
 * makes re-running this a no-op. Foreign keys go off for the rebuild: with
 * them on, `DROP TABLE posts` would cascade `post_keywords` and `renders` away.
 */
const LEGACY_THEME = 'warm-industrial';
const RENAMED_THEME = 'warm-industrial-1';

function migrateV3ToV4(db: DB): void {
  db.prepare(`UPDATE posts SET theme = ? WHERE theme = ?`).run(RENAMED_THEME, LEGACY_THEME);
  db.prepare(`UPDATE settings SET value = ? WHERE key = 'defaultTheme' AND value = ?`).run(
    RENAMED_THEME,
    LEGACY_THEME,
  );

  const schema = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'posts'`)
    .get() as { sql: string } | undefined;
  if (!schema?.sql.includes(`DEFAULT '${LEGACY_THEME}'`)) return;

  const foreignKeys = db.pragma('foreign_keys', { simple: true }) === 1;
  if (foreignKeys) db.pragma('foreign_keys = OFF');
  try {
    db.exec(`
      CREATE TABLE posts_migrating (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        title        TEXT NOT NULL,
        description  TEXT NOT NULL DEFAULT '',
        markup       TEXT NOT NULL,
        theme        TEXT NOT NULL DEFAULT '${RENAMED_THEME}',
        status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL,
        published_at TEXT
      );

      INSERT INTO posts_migrating
        (id, title, description, markup, theme, status, created_at, updated_at, published_at)
        SELECT id, title, description, markup, theme, status, created_at, updated_at, published_at
        FROM posts;

      DROP TABLE posts;
      ALTER TABLE posts_migrating RENAME TO posts;

      CREATE INDEX IF NOT EXISTS idx_posts_status_updated_at ON posts(status, updated_at);
    `);
  } finally {
    if (foreignKeys) db.pragma('foreign_keys = ON');
  }
}

export function migrate(db: DB): void {
  let version = (db.pragma('user_version', { simple: true }) as number) ?? 0;
  if (version >= CURRENT_SCHEMA_VERSION) return;

  if (version === 0) {
    db.exec(SCHEMA_CURRENT);
    db.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
    seedSourcesFromJson(db);
    return;
  }

  if (version === 1) {
    migrateV1ToV2(db);
    version = 2;
  }

  if (version === 2) {
    migrateV2ToV3(db);
    version = 3;
  }

  if (version === 3) {
    migrateV3ToV4(db);
    version = 4;
  }

  db.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
  seedSourcesFromJson(db);
}
