/**
 * Shared DB accessor for the API.
 * Provides a single open connection per-process (module-level singleton).
 *
 * The path is `NEWSPAPPER_DB_PATH` (`resolveDbPath` in `config.ts`), read at the
 * first open, so a test can point it at a scratch file before building the app.
 */
import { getDb } from "@newspapper/core";
import type { DB } from "@newspapper/core";
import { resolveDbPath } from "../config.js";

let _db: DB | null = null;

export function db(): DB {
  if (_db === null || !_db.open) {
    _db = getDb(resolveDbPath());
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
