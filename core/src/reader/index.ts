// The Reader (brief 105): stored feed items, refreshed in the background.
// Storage for items lives in `storage/feed-items.ts`; this is the fetching side.

export { refreshSources, isRefreshing } from './refresh.js';
export type { RefreshOptions, RefreshResult, RefreshProgressEvent } from './refresh.js';
export { startReaderSchedule, READER_FIRST_RUN_DELAY_MS } from './schedule.js';
export type { ReaderSchedule, ReaderScheduleOptions } from './schedule.js';
export {
  readerRefreshMinutes,
  readerRetentionDays,
  READER_REFRESH_MINUTES_DEFAULT,
  READER_RETENTION_DAYS_DEFAULT,
} from './config.js';
