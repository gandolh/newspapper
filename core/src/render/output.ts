/**
 * Output directory management for rendered runs.
 *
 * Convention: output/YYYY-MM-DD-N/  where N starts at 1 and increments.
 * Same-day re-runs never overwrite existing directories.
 */

import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Resolve the repo root (four levels up from core/src/render/output.ts). */
function defaultOutputRoot(): string {
  // output.ts → render/ → src/ → core/ → repo root (4 x '..')
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(thisFile, '..', '..', '..', '..', 'output');
}

/**
 * Return the next free run directory path for the given date.
 * Scans `outputRoot` for existing `YYYY-MM-DD-N` dirs and picks max(N)+1.
 * Does NOT create the directory.
 */
export function nextOutputDir(date: string, outputRoot?: string): string {
  const root = outputRoot ?? defaultOutputRoot();
  const prefix = `${date}-`;

  let maxN = 0;
  if (existsSync(root)) {
    readdirSync(root)
      .filter((n) => n.startsWith(prefix))
      .forEach((n) => {
        const rest = n.slice(prefix.length);
        const num = Number(rest);
        if (Number.isInteger(num) && num > 0 && num > maxN) {
          maxN = num;
        }
      });
  }

  const runNumber = maxN + 1;
  return resolve(join(root, `${date}-${runNumber}`));
}

export interface OutputFile {
  name: string;
  data: Buffer | string;
}

/**
 * mkdir -p `dir`, then write every file in `files`.
 */
export async function writeRun(
  dir: string,
  files: OutputFile[],
): Promise<void> {
  mkdirSync(dir, { recursive: true });
  await Promise.all(
    files.map((f) => writeFile(join(dir, f.name), f.data)),
  );
}
