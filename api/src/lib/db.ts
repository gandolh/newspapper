/**
 * Shared DB accessor for the API.
 * Provides a single open connection per-process (module-level singleton).
 *
 * Tests can override the DB path via the NEWSPAPPER_DB_PATH env variable.
 */
import { getDb } from '@newspapper/core';
import type { DB } from '@newspapper/core';

let _db: DB | null = null;

export function db(): DB {
  if (_db === null || !_db.open) {
    const dbPath = process.env['NEWSPAPPER_DB_PATH'];
    _db = getDb(dbPath);
  }
  return _db;
}

/** Reset the singleton (used in tests to force a fresh connection). */
export function resetDb(): void {
  if (_db !== null && _db.open) {
    _db.close();
  }
  _db = null;
}
