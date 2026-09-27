# Task 86 — A crash mid-migration bricks the database

## Context

Found in the 2026-09 sweep and reproduced against better-sqlite3 12.10.0. The
v3→v4 migration rebuilds the `posts` table with a single multi-statement
`db.exec()` — [core/src/storage/db.ts:270-297](../../../core/src/storage/db.ts):

```
CREATE TABLE posts_migrating (…);
INSERT INTO posts_migrating SELECT … FROM posts;
DROP TABLE posts;
ALTER TABLE posts_migrating RENAME TO posts;
CREATE INDEX …;
```

wrapped only in a `foreign_keys OFF/ON` try/finally — **not a transaction**.
`db.exec()` does not wrap multiple statements atomically (each auto-commits). If
the process dies between `DROP TABLE posts` and the `RENAME` (an OOM-kill or
`kill -9` during a container boot — now realistic on the shared VPS), the file is
left with a populated `posts_migrating` and **no `posts` table**, while
`user_version` is still 3 (it is bumped only after the migration returns, line
348). On next boot `migrate()` re-enters v3→v4, whose first statement hits the
missing `posts` and throws — `getDb()` throws forever, and the app cannot start
against that file without manual SQL.

Reproduced: built a v3 DB, ran CREATE+INSERT+DROP, then called the real `open()`
→ `SqliteError: no such table: posts`. Also confirmed `db.exec` non-atomicity
directly. `migrateV1ToV2`/`V2ToV3` happen to be resumable (column-presence
guards); v3→v4 is the one that rebuilds a table, so it is the dangerous one.

## What to do

1. Wrap the v3→v4 rebuild in `db.transaction(() => { db.exec(`…`); })();` — SQLite
   DDL is transactional, so DROP+CREATE+RENAME become atomic and a crash rolls
   back to the intact v3 table. Keep the `foreign_keys OFF/ON` handling correct
   relative to the transaction (PRAGMA `foreign_keys` cannot be changed inside a
   transaction — set it outside, then run the transaction).
2. Make the whole `migrate()` sequence robust: bump `user_version` **inside** the
   same transaction as each step's work, so a version and its schema can never
   disagree. Ideally wrap each version step so an interrupted upgrade either fully
   lands (and bumps) or fully rolls back (and does not bump).
3. Keep every step idempotent/resumable as V1→V3 already are.

## Acceptance

- A test that simulates interruption: run the v3→v4 body inside a transaction and
  force a throw before the RENAME (e.g. a failing statement appended), then assert
  the original `posts` table and its rows are intact and `user_version` is still 3
  — i.e. the DB is still openable and re-migratable.
- Existing migration tests (v1→…→current from real fixtures) still pass.
- A v3 fixture migrates cleanly to current and its posts survive.
- `npm test`, `npm run lint`, `npm run build`, `bash corpus/lint.sh` clean.
- If you update the schema-migration description, update `corpus/wiki/data.md`
  (coordinate with brief 83).

## Files you OWN

- `core/src/storage/db.ts`
- `core/src/storage/db.test.ts`

## Files you must NOT touch

- other storage modules' query logic
- `corpus/log.md`, `corpus/wiki/status.md`
