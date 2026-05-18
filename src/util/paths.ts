import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

export function ensureParent(path: string): void {
  ensureDir(dirname(path));
}

export function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function nextOutputDir(outputRoot: string, date: string): { dir: string; runNumber: number } {
  ensureDir(outputRoot);
  const prefix = `${date}-`;
  const existing = readdirSync(outputRoot)
    .filter((n) => n.startsWith(prefix))
    .map((n) => Number(n.slice(prefix.length)))
    .filter((n) => Number.isInteger(n) && n > 0);
  const runNumber = existing.length === 0 ? 1 : Math.max(...existing) + 1;
  const dir = resolve(join(outputRoot, `${date}-${runNumber}`));
  ensureDir(dir);
  return { dir, runNumber };
}
