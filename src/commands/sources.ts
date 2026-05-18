import { loadConfig } from '../util/config.js';
import { log } from '../util/logger.js';
import { loadSources } from '../scrape/index.js';

export async function sourcesCmd(): Promise<void> {
  const config = loadConfig();
  const sources = loadSources();
  if (sources.length === 0) {
    log.warn('No sources in data/sources.json');
    return;
  }
  log.info(`${sources.length} source(s) configured:`);
  for (const s of sources) {
    const tag = s.enabled ? 'on ' : 'off';
    process.stdout.write(`  [${tag}] ${s.id.padEnd(20)} ${s.rss}\n`);
    if (!s.enabled) continue;
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), config.requestTimeoutMs);
      const res = await fetch(s.rss, {
        method: 'HEAD',
        headers: { 'User-Agent': config.userAgent },
        signal: ctl.signal,
        redirect: 'follow',
      });
      clearTimeout(t);
      process.stdout.write(`        → ${res.status} ${res.statusText}\n`);
    } catch (err) {
      process.stdout.write(`        → error: ${(err as Error).message}\n`);
    }
  }
}
