import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Config } from '../util/config.js';
import { log } from '../util/logger.js';
import { ensureParent, todayLocal } from '../util/paths.js';
import { open } from '../storage/db.js';
import { existsByUrl, insertMany, type NewArticle } from '../storage/articles.js';
import { fetchFeed } from './rss.js';
import { fetchBody } from './body.js';
import type { SourceConfig } from '../types.js';

/** @deprecated Use SourceConfig from types.ts */
export type Source = SourceConfig;

export interface ScrapeOptions {
  maxPerSource: number;
}

const SOURCES_PATH = './data/sources.json';

export function loadSources(): SourceConfig[] {
  if (!existsSync(SOURCES_PATH)) {
    ensureParent(SOURCES_PATH);
    writeFileSync(SOURCES_PATH, '[]\n');
    return [];
  }
  const raw = readFileSync(resolve(SOURCES_PATH), 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('sources.json must be a JSON array');
  return parsed as Source[];
}

export async function scrape(config: Config, opts: ScrapeOptions): Promise<{ inserted: number }> {
  const sources = loadSources().filter((s) => s.enabled);
  if (sources.length === 0) {
    log.warn('No enabled sources in data/sources.json — nothing to scrape.');
    return { inserted: 0 };
  }

  const today = todayLocal();
  const db = open(config.dbPath);
  let totalInserted = 0;

  for (const source of sources) {
    log.info(`scrape: ${source.id} (${source.rss})`);
    let items;
    try {
      items = await fetchFeed(source.rss, config.userAgent, config.requestTimeoutMs);
    } catch (err) {
      log.error(`feed failed for ${source.id}:`, (err as Error).message);
      continue;
    }
    const todays = items.filter((i) => i.publishedAt.slice(0, 10) === today).slice(0, opts.maxPerSource);
    if (todays.length === 0) {
      log.info(`  no items dated ${today}`);
      continue;
    }

    const fresh = todays.filter((i) => !existsByUrl(db, i.url));
    if (fresh.length === 0) {
      log.info(`  ${todays.length} items, all already in DB`);
      continue;
    }

    const rows: NewArticle[] = [];
    for (const item of fresh) {
      const body = await fetchBody(item.url, config.userAgent, config.requestTimeoutMs);
      rows.push({
        source_id: source.id,
        url: item.url,
        title: item.title,
        summary: item.summary,
        body,
        published_at: item.publishedAt,
      });
    }
    const inserted = insertMany(db, rows);
    totalInserted += inserted;
    log.info(`  inserted ${inserted}/${fresh.length}`);
  }

  db.close();
  log.info(`scrape: ${totalInserted} new article(s)`);
  return { inserted: totalInserted };
}
