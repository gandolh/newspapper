import Database from 'better-sqlite3';
import type { Database as DB } from 'better-sqlite3';
import { ensureParent } from '../util/paths.js';

export type { DB };

export function open(path: string): DB {
  ensureParent(path);
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

export function migrate(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id     TEXT NOT NULL,
      url           TEXT NOT NULL UNIQUE,
      title         TEXT NOT NULL,
      summary       TEXT NOT NULL DEFAULT '',
      body          TEXT NOT NULL DEFAULT '',
      published_at  TEXT NOT NULL,
      scraped_at    TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
    CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id);

    CREATE TABLE IF NOT EXISTS posts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      date         TEXT NOT NULL,
      run_number   INTEGER NOT NULL,
      payload      TEXT NOT NULL,
      output_dir   TEXT NOT NULL,
      created_at   TEXT NOT NULL,
      UNIQUE(date, run_number)
    );

    CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(date);
  `);
}
