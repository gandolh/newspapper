import { loadConfig } from '../util/config.js';
import { log } from '../util/logger.js';
import { open } from '../storage/db.js';
import { recent } from '../storage/posts.js';

export async function listCmd(): Promise<void> {
  const config = loadConfig();
  const db = open(config.dbPath);
  const posts = recent(db, 20);
  db.close();
  if (posts.length === 0) {
    log.info('No posts yet. Run `newspapper run`.');
    return;
  }
  for (const p of posts) {
    const slides = p.payload.slides.length;
    process.stdout.write(
      `${p.date} #${p.run_number}  ${String(slides).padStart(2, ' ')} slides  ${p.payload.title}\n` +
        `              → ${p.output_dir}\n`,
    );
  }
}
