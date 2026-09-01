/**
 * Loads `.env` into `process.env`. That is the whole job.
 *
 * **This module is load-bearing precisely because it looks like it is not.**
 * It exports nothing, so a reader skimming for a `loadConfig()` will conclude
 * it is dead and delete it. It is the *only* `dotenv` call site in the repo,
 * and it is pulled in by `core/src/index.ts` — the barrel every `api` module
 * imports. Remove either half and `.env` silently stops being read, taking
 * `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `PORT`,
 * `NEWSPAPPER_DB_PATH`, `UPLOADS_DIR`, `UPLOADS_BASE_URL` and `THEME` with it.
 * Nothing throws; the app just boots on defaults. `config.test.ts` guards both
 * halves.
 *
 * It used to also export `loadConfig()`, a CLI-era survivor called nowhere,
 * over seven environment variables (`MAX_ARTICLES_PER_SOURCE`, `USER_AGENT`,
 * `REQUEST_TIMEOUT`, `MAX_RETRIES`, `OUTPUT_DIR`, `DB_PATH`,
 * `DEFAULT_RETENTION_DAYS`) that no code path ever consulted. Brief 73 deleted
 * the function and the variables; only this side effect was real.
 *
 * There is no `Config` object. Each consumer reads the one variable it needs,
 * where it needs it: `storage/db.ts` (`NEWSPAPPER_DB_PATH`),
 * `storage/settings.ts` (`THEME`), `uploads/store.ts` (`UPLOADS_DIR`),
 * `uploads/index.ts` (`UPLOADS_BASE_URL`, `PORT`), `api/src/auth/*`
 * (`SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`).
 */
import 'dotenv/config';
