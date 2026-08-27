import 'dotenv/config';

export interface Config {
  maxArticlesPerSource: number;
  userAgent: string;
  requestTimeoutMs: number;
  maxRetries: number;
  theme: string;
  outputDir: string;
  dbPath: string;
  defaultRetentionDays: number;
}

function num(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function loadConfig(): Config {
  return Object.freeze({
    maxArticlesPerSource: num(process.env.MAX_ARTICLES_PER_SOURCE, 5),
    userAgent: process.env.USER_AGENT ?? 'Newspapper/2.0',
    requestTimeoutMs: num(process.env.REQUEST_TIMEOUT, 30_000),
    maxRetries: num(process.env.MAX_RETRIES, 3),
    theme: process.env.THEME ?? 'warm-industrial',
    outputDir: process.env.OUTPUT_DIR ?? './output',
    dbPath: process.env.DB_PATH ?? './data/newspapper.db',
    defaultRetentionDays: num(process.env.DEFAULT_RETENTION_DAYS, 30),
  });
}
