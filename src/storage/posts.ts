import type { DB } from './db.js';

export interface PostPayload {
  date: string;
  title: string;
  theme: string;
  slides: SlideBlock[];
}

export type SlideBlock =
  | { type: 'title'; variant: 'title-main' | 'title-statement' | 'title-question'; text: string; kicker?: string }
  | { type: 'body'; variant: 'body-text'; heading: string; body: string }
  | { type: 'body'; variant: 'body-list'; heading: string; items: string[] }
  | {
      type: 'body';
      variant: 'body-comparison';
      heading: string;
      left: { label: string; body: string };
      right: { label: string; body: string };
    }
  | { type: 'quote'; variant: 'quote-classic' | 'quote-pullout' | 'quote-reaction'; quote: string; attribution: string };

export interface Post {
  id: number;
  date: string;
  run_number: number;
  payload: PostPayload;
  output_dir: string;
  created_at: string;
}

export function nextRunNumber(db: DB, date: string): number {
  const row = db
    .prepare('SELECT COALESCE(MAX(run_number), 0) AS max FROM posts WHERE date = ?')
    .get(date) as { max: number };
  return row.max + 1;
}

export function insert(
  db: DB,
  args: { date: string; runNumber: number; payload: PostPayload; outputDir: string },
): Post {
  const createdAt = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO posts (date, run_number, payload, output_dir, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const r = stmt.run(args.date, args.runNumber, JSON.stringify(args.payload), args.outputDir, createdAt);
  return {
    id: Number(r.lastInsertRowid),
    date: args.date,
    run_number: args.runNumber,
    payload: args.payload,
    output_dir: args.outputDir,
    created_at: createdAt,
  };
}

export function recent(db: DB, limit: number): Post[] {
  const rows = db
    .prepare('SELECT * FROM posts ORDER BY date DESC, run_number DESC LIMIT ?')
    .all(limit) as Array<{
    id: number;
    date: string;
    run_number: number;
    payload: string;
    output_dir: string;
    created_at: string;
  }>;
  return rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) as PostPayload }));
}
