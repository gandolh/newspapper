/**
 * The Reader's two environment variables, read where they are used (the
 * `util/config.ts` convention: no shared Config object). A missing, blank or
 * unparseable value falls back to the default rather than throwing, so a typo
 * cannot stop the API from booting.
 */

/** Minutes between background refreshes. `0` turns the loop off. */
export const READER_REFRESH_MINUTES_DEFAULT = 30;

/** Days an item is kept after it was fetched (the newest 50 per source are
 * kept regardless). */
export const READER_RETENTION_DAYS_DEFAULT = 30;

function nonNegative(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** `READER_REFRESH_MINUTES`, default 30; `0` = off. */
export function readerRefreshMinutes(env: NodeJS.ProcessEnv = process.env): number {
  return nonNegative(env['READER_REFRESH_MINUTES'], READER_REFRESH_MINUTES_DEFAULT);
}

/** `READER_RETENTION_DAYS`, default 30. */
export function readerRetentionDays(env: NodeJS.ProcessEnv = process.env): number {
  return nonNegative(env['READER_RETENTION_DAYS'], READER_RETENTION_DAYS_DEFAULT);
}
