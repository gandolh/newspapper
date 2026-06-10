import Database from 'better-sqlite3';
import type { Database as DB } from 'better-sqlite3';
import { ensureParent } from '../util/paths.js';
import { resolve } from 'node:path';

export type { DB };

const DEFAULT_DB_PATH = './data/newspapper.db';
const CURRENT_SCHEMA_VERSION = 2;

export function getDb(dbPath?: string): DB {
  const p = resolve(dbPath ?? DEFAULT_DB_PATH);
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

export function migrate(db: DB): void {
  const version = (db.pragma('user_version', { simple: true }) as number) ?? 0;

  if (version === 0) {
    // Fresh install — create all tables at current schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id     TEXT NOT NULL,
        source_name   TEXT NOT NULL DEFAULT '',
        title         TEXT NOT NULL,
        url           TEXT UNIQUE,
        published_at  TEXT NOT NULL,
        body          TEXT NOT NULL DEFAULT '',
        created_at    TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
      CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id);

      CREATE TABLE IF NOT EXISTS posts (
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

      CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(date);

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    db.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
  } else if (version === 1) {
    // Migrate from v2 CLI schema:
    // posts had: id, date, run_number, payload, output_dir, created_at
    // articles had different column names (no source_name, scraped_at instead of created_at)
    // Add missing columns to posts
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
    if (!postCols.includes('output_dir')) {
      // Old schema had output_dir as NOT NULL — it already exists; no-op
    }
    if (!postCols.includes('updated_at')) {
      db.exec(`ALTER TABLE posts ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`);
      // Backfill updated_at from created_at
      db.exec(`UPDATE posts SET updated_at = created_at WHERE updated_at = ''`);
    }
    // Mark existing rows as rendered
    db.exec(`UPDATE posts SET status = 'rendered' WHERE status = ''`);

    // Add settings table if missing
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Migrate articles: add source_name and created_at columns if needed
    const articleCols = (db.pragma('table_info(articles)') as Array<{ name: string }>).map((c) => c.name);
    if (!articleCols.includes('source_name')) {
      db.exec(`ALTER TABLE articles ADD COLUMN source_name TEXT NOT NULL DEFAULT ''`);
    }
    if (!articleCols.includes('created_at')) {
      // Old schema had scraped_at; add created_at as alias
      if (articleCols.includes('scraped_at')) {
        db.exec(`ALTER TABLE articles ADD COLUMN created_at TEXT NOT NULL DEFAULT ''`);
        db.exec(`UPDATE articles SET created_at = scraped_at WHERE created_at = ''`);
      } else {
        db.exec(`ALTER TABLE articles ADD COLUMN created_at TEXT NOT NULL DEFAULT ''`);
      }
    }

    db.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
  }
  // version === CURRENT_SCHEMA_VERSION → nothing to do
}
