/**
 * Output directory management for rendered runs.
 *
 * Convention: output/YYYY-MM-DD-N/  where N starts at 1 and increments.
 * Same-day re-runs never overwrite existing directories.
 */

import { existsSync, readdirSync, mkdirSync, unlinkSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { outputRoot } from '../util/paths.js';

/** Resolve the repo root (four levels up from core/src/render/output.ts). */
function defaultOutputRoot(): string {
  return outputRoot();
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

/**
 * Pick the next `YYYY-MM-DD-N` directory **and create it**, so no other render
 * can pick the same one.
 *
 * `nextOutputDir` only computes a name; creating it used to wait for
 * `writeRun`, after a multi-second render loop. Two renders started together
 * (a double-clicked Render, or two posts at once) both picked the same `N`, and
 * both wrote their slides into one directory: last write won per file, and a
 * post's export could show another post's images. A non-recursive `mkdir` is
 * the reservation: it fails with `EEXIST` if anyone, in this process or
 * another, got there first, and then the next number is tried.
 */
export function reserveOutputDir(date: string, outputRoot?: string): string {
  const root = outputRoot ?? defaultOutputRoot();
  mkdirSync(root, { recursive: true });
  let dir = nextOutputDir(date, root);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      mkdirSync(dir);
      return dir;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      const n = Number(dir.slice(dir.lastIndexOf('-') + 1));
      dir = resolve(join(root, `${date}-${n + 1}`));
    }
  }
  throw new Error(`Could not reserve an output directory for ${date}`);
}

export interface OutputFile {
  name: string;
  data: Buffer | string;
}

/**
 * Slides are JPEG-only; a `.png` left over from an older render (or a rerun
 * that reused this directory) is stale and must not survive alongside it.
 */
function removeStalePngs(dir: string): void {
  for (const name of readdirSync(dir)) {
    if (name.toLowerCase().endsWith('.png')) {
      unlinkSync(join(dir, name));
    }
  }
}

/**
 * mkdir -p `dir`, clear any stale `.png` files, then write every file in `files`.
 */
export async function writeRun(dir: string, files: OutputFile[]): Promise<void> {
  mkdirSync(dir, { recursive: true });
  removeStalePngs(dir);
  await Promise.all(files.map((f) => writeFile(join(dir, f.name), f.data)));
}
