import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Where everything lives, from one place (brief 99).
 *
 * Eight files used to reach the repo root by counting `..` from their own depth
 * (two, three or four levels), and all had to land on the same directory. Move
 * one route a folder deeper and its root came out one level short, silently:
 * the render route string-slices output paths by it. Now only this file knows
 * its own depth. ESM, from `import.meta.url`, never `process.cwd()`.
 */
const REPO_ROOT = resolve(fileURLToPath(new URL('../../..', import.meta.url)));

export function repoRoot(): string {
  return REPO_ROOT;
}

/** An override path: absolute as given, relative to the repo root otherwise. */
function fromEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value) return null;
  return isAbsolute(value) ? resolve(value) : resolve(REPO_ROOT, value);
}

/**
 * Rendered runs. `OUTPUT_DIR` overrides it, mirroring `UPLOADS_DIR`. Not
 * `NEWSPAPPER_OUTPUT_DIR`: the compose file already uses that name for the
 * *host* side of the output bind mount, and its `env_file` hands it to the
 * process, so reading it here would write renders to an unmounted path inside
 * the container.
 */
export function outputRoot(): string {
  return fromEnv('OUTPUT_DIR') ?? resolve(REPO_ROOT, 'output');
}

/** The upload store. `UPLOADS_DIR` overrides it. */
export function uploadsRoot(): string {
  return fromEnv('UPLOADS_DIR') ?? resolve(REPO_ROOT, 'uploads');
}

/** The SQLite file. `NEWSPAPPER_DB_PATH` overrides it, and tests must set it. */
export function dbPath(): string {
  const override = process.env['NEWSPAPPER_DB_PATH'];
  if (override !== undefined && override !== '') return resolve(override);
  return resolve(REPO_ROOT, 'data', 'newspapper.db');
}

/** The v2 sources list, read once to seed the `sources` table. */
export function sourcesSeedPath(): string {
  return resolve(REPO_ROOT, 'data', 'sources.json');
}

export function fontsDir(): string {
  return resolve(REPO_ROOT, 'assets', 'fonts');
}

export function designSystemsDir(): string {
  return resolve(REPO_ROOT, 'assets', 'design-systems');
}

export function uiDistDir(): string {
  return resolve(REPO_ROOT, 'ui', 'dist');
}

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

export function nextOutputDir(
  outputRoot: string,
  date: string,
): { dir: string; runNumber: number } {
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
