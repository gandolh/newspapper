import type { SourceConfig } from '../types.js';
import { getDb, type DB } from './db.js';

interface SourceDbRow {
  id: string;
  name: string;
  rss_url: string;
  enabled: number;
  created_at: string;
}

function rowToSource(r: SourceDbRow): SourceConfig {
  return { id: r.id, name: r.name, rss: r.rss_url, enabled: r.enabled !== 0 };
}

/**
 * Sources live in the DB as of schema v3 (seeded once from data/sources.json).
 * `db` is optional so callers that hold no handle — settings pages, one-shot
 * scripts — behave the way `getSettings` does: open the default DB and close it.
 */
function withDb<T>(db: DB | undefined, fn: (db: DB) => T): T {
  if (db) return fn(db);
  const owned = getDb();
  try {
    return fn(owned);
  } finally {
    owned.close();
  }
}

export function listSources(db?: DB): SourceConfig[] {
  return withDb(db, (d) => {
    const rows = d
      .prepare('SELECT * FROM sources ORDER BY name COLLATE NOCASE')
      .all() as SourceDbRow[];
    return rows.map(rowToSource);
  });
}

export function getSource(id: string, db?: DB): SourceConfig | undefined {
  return withDb(db, (d) => {
    const row = d.prepare('SELECT * FROM sources WHERE id = ?').get(id) as SourceDbRow | undefined;
    return row ? rowToSource(row) : undefined;
  });
}

export function addSource(src: SourceConfig, db?: DB): SourceConfig[] {
  return withDb(db, (d) => {
    const exists = d.prepare('SELECT 1 FROM sources WHERE id = ?').get(src.id);
    if (exists) throw new Error(`Source with id "${src.id}" already exists`);
    d.prepare(
      `INSERT INTO sources (id, name, rss_url, enabled, created_at)
       VALUES (@id, @name, @rss_url, @enabled, @created_at)`,
    ).run({
      id: src.id,
      name: src.name,
      rss_url: src.rss,
      enabled: src.enabled ? 1 : 0,
      created_at: new Date().toISOString(),
    });
    return listSources(d);
  });
}

export function updateSource(
  id: string,
  patch: Partial<Omit<SourceConfig, 'id'>>,
  db?: DB,
): SourceConfig[] {
  return withDb(db, (d) => {
    const current = getSource(id, d);
    if (!current) throw new Error(`Source "${id}" not found`);
    const next = { ...current, ...patch };
    d.prepare(
      `UPDATE sources SET name = @name, rss_url = @rss_url, enabled = @enabled WHERE id = @id`,
    ).run({ id, name: next.name, rss_url: next.rss, enabled: next.enabled ? 1 : 0 });
    return listSources(d);
  });
}

export function removeSource(id: string, db?: DB): SourceConfig[] {
  return withDb(db, (d) => {
    const r = d.prepare('DELETE FROM sources WHERE id = ?').run(id);
    if (r.changes === 0) throw new Error(`Source "${id}" not found`);
    return listSources(d);
  });
}

/** Replace the whole source list. */
export function saveSources(all: SourceConfig[], db?: DB): void {
  withDb(db, (d) => {
    const now = new Date().toISOString();
    const clear = d.prepare('DELETE FROM sources');
    const insert = d.prepare(
      `INSERT INTO sources (id, name, rss_url, enabled, created_at)
       VALUES (@id, @name, @rss_url, @enabled, @created_at)`,
    );
    const tx = d.transaction((rows: SourceConfig[]) => {
      clear.run();
      for (const row of rows) {
        insert.run({
          id: row.id,
          name: row.name,
          rss_url: row.rss,
          enabled: row.enabled ? 1 : 0,
          created_at: now,
        });
      }
    });
    tx(all);
  });
}
