import type { Source, SourceConfig } from '../types.js';
import { getDb, type DB } from './db.js';

interface SourceDbRow {
  id: string;
  name: string;
  rss_url: string;
  enabled: number;
  created_at: string;
  category: string | null;
  etag: string | null;
  last_modified: string | null;
  last_fetched_at: string | null;
  last_error: string | null;
}

function rowToSource(r: SourceDbRow): Source {
  return {
    id: r.id,
    name: r.name,
    rss: r.rss_url,
    enabled: r.enabled !== 0,
    category: r.category,
    lastFetchedAt: r.last_fetched_at,
    lastError: r.last_error,
  };
}

/** A category as stored: trimmed, and blank means uncategorized (NULL). */
export function normalizeCategory(category: string | null | undefined): string | null {
  const trimmed = (category ?? '').trim();
  return trimmed === '' ? null : trimmed;
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

export function listSources(db?: DB): Source[] {
  return withDb(db, (d) => {
    const rows = d
      .prepare('SELECT * FROM sources ORDER BY name COLLATE NOCASE')
      .all() as SourceDbRow[];
    return rows.map(rowToSource);
  });
}

export function getSource(id: string, db?: DB): Source | undefined {
  return withDb(db, (d) => {
    const row = d.prepare('SELECT * FROM sources WHERE id = ?').get(id) as SourceDbRow | undefined;
    return row ? rowToSource(row) : undefined;
  });
}

export function addSource(src: SourceConfig, db?: DB): Source[] {
  return withDb(db, (d) => {
    const exists = d.prepare('SELECT 1 FROM sources WHERE id = ?').get(src.id);
    if (exists) throw new Error(`Source with id "${src.id}" already exists`);
    d.prepare(
      `INSERT INTO sources (id, name, rss_url, enabled, created_at, category)
       VALUES (@id, @name, @rss_url, @enabled, @created_at, @category)`,
    ).run({
      id: src.id,
      name: src.name,
      rss_url: src.rss,
      enabled: src.enabled ? 1 : 0,
      created_at: new Date().toISOString(),
      category: normalizeCategory(src.category),
    });
    return listSources(d);
  });
}

/**
 * Patch a source's config. The Reader's bookkeeping (validators, last fetch,
 * last error) is never touched from here, except that a changed feed URL drops
 * the validators: an ETag belongs to the URL that sent it.
 */
export function updateSource(
  id: string,
  patch: Partial<Omit<SourceConfig, 'id'>>,
  db?: DB,
): Source[] {
  return withDb(db, (d) => {
    const current = getSource(id, d);
    if (!current) throw new Error(`Source "${id}" not found`);
    const next = { ...current, ...patch };
    const urlChanged = next.rss !== current.rss;
    d.prepare(
      `UPDATE sources
          SET name = @name, rss_url = @rss_url, enabled = @enabled, category = @category
              ${urlChanged ? ', etag = NULL, last_modified = NULL' : ''}
        WHERE id = @id`,
    ).run({
      id,
      name: next.name,
      rss_url: next.rss,
      enabled: next.enabled ? 1 : 0,
      category: normalizeCategory(next.category),
    });
    return listSources(d);
  });
}

export function removeSource(id: string, db?: DB): Source[] {
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
      `INSERT INTO sources (id, name, rss_url, enabled, created_at, category)
       VALUES (@id, @name, @rss_url, @enabled, @created_at, @category)`,
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
          category: normalizeCategory(row.category),
        });
      }
    });
    tx(all);
  });
}

// ---- The Reader's per-source bookkeeping (brief 105) ----
// Used by `reader/refresh.ts`; not part of the public barrel.

/** An enabled source as a refresh needs it: where to fetch, and the stored
 * validators for a conditional GET. */
export interface RefreshTarget {
  id: string;
  name: string;
  rss: string;
  etag: string | null;
  lastModified: string | null;
}

/** Enabled sources to refresh, in list order; just `sourceId` when given. */
export function listRefreshTargets(db: DB, sourceId?: string): RefreshTarget[] {
  const rows = db
    .prepare(
      `SELECT id, name, rss_url, etag, last_modified FROM sources
        WHERE enabled = 1 ${sourceId === undefined ? '' : 'AND id = @id'}
        ORDER BY name COLLATE NOCASE`,
    )
    .all(sourceId === undefined ? {} : { id: sourceId }) as Array<
    Pick<SourceDbRow, 'id' | 'name' | 'rss_url' | 'etag' | 'last_modified'>
  >;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    rss: r.rss_url,
    etag: r.etag,
    lastModified: r.last_modified,
  }));
}

/** A fetch that reached the feed (a 200 or a 304): clears the error, stamps
 * the time, and keeps whatever validators the server sent. */
export function recordSourceFetched(
  db: DB,
  id: string,
  outcome: { fetchedAt: string; etag: string | null; lastModified: string | null },
): void {
  db.prepare(
    `UPDATE sources
        SET last_fetched_at = @fetchedAt, last_error = NULL,
            etag = @etag, last_modified = @lastModified
      WHERE id = @id`,
  ).run({ id, ...outcome });
}

/** Longest error text kept on a source. A feed can make an error message long
 * (a parser quoting the document); the rail only needs to know it failed. */
const MAX_ERROR_CHARS = 500;

/** A failed fetch: records why. `last_fetched_at` keeps the last success, and
 * the validators are kept for the next attempt. */
export function recordSourceError(db: DB, id: string, error: string): void {
  db.prepare(`UPDATE sources SET last_error = @error WHERE id = @id`).run({
    id,
    error: error.slice(0, MAX_ERROR_CHARS) || 'Unknown error',
  });
}
