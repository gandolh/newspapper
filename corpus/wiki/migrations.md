---
summary: The schema's version history (v1 CLI era through the current version) and how migrate() walks it, one transaction per step so a crash rolls back instead of bricking the database.
updated: 2026-10-02
---

# Migrations

Split out of [data.md](data.md) on 2026-10-02, when the per-step transaction
note pushed that page past the cap.

## History

| Version | Shape |
|---|---|
| 1 | CLI era: `posts(date, run_number, payload, output_dir)`, `articles(scraped_at)` |
| 2 | Web app: `posts.payload` + `status draft\|rendered` + `output_dir`, `settings` |
| 3 | Authored posts: `posts.markup`, `keywords`, `post_keywords`, `renders`, `users`, `uploads`, `sources` in the DB |
| 4 | The theme family: `warm-industrial` → `warm-industrial-1` in `posts.theme`, the column default, and the `defaultTheme` setting |

A fresh database is created at version 4 directly; an existing one walks every
step in one boot. `migrate()` (`core/src/storage/db.ts`) keys on
`PRAGMA user_version` and uses `IF NOT EXISTS` throughout, so re-running is a
no-op. **Each step is one transaction** together with its `user_version` bump
(`runMigrationStep`, brief 86): a crash mid-step rolls back to the previous
version's intact schema, and the step runs again on the next boot. The v3 → v4
table rebuild turns foreign keys off *around* its transaction, because SQLite
ignores that pragma inside one.

**v2 → v3 destroys rows on purpose.** A v2 post held a composed slide payload
with no markup to derive it from, and v2 articles were transient scrape output.
Both tables are dropped and recreated, so **every v2 post row and every v2
article row is deleted**. `settings` survives untouched. A v1 database walks
v1 → v2 → v3 in one boot and loses its posts the same way.
