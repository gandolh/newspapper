/**
 * The publish-time optimization pass: re-encode rendered slide JPEGs at a
 * smaller quality, in place, for whatever `output/` directory a render wrote.
 *
 * Draft renders use a high quality (~92) because they only need to look
 * right on screen. Publishing is what a person does once, when a post is
 * actually going out — that's when file size starts to matter, so this pass
 * re-encodes down to ~85. It never touches anything outside `output/`: the
 * `uploads/` store is inputs, not outputs, and is normalized once at upload
 * time (see `core/src/uploads`).
 */

import sharp from 'sharp';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const PUBLISH_JPEG_QUALITY = 85;

const SLIDE_FILE_RE = /^slide-\d+\.jpg$/i;

/** The rendered slide files in `dir`, in filename order. */
export function slideFilesIn(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => SLIDE_FILE_RE.test(name))
    .sort();
}

/** Re-encode one JPEG file in place at the given quality. */
export async function optimizeSlideFile(
  path: string,
  quality: number = PUBLISH_JPEG_QUALITY,
): Promise<void> {
  const input = readFileSync(path);
  const output = await sharp(input).jpeg({ quality, mozjpeg: true }).toBuffer();
  writeFileSync(path, output);
}

/**
 * Re-encode every rendered slide in `dir` at `quality`. Returns the number of
 * files touched. Callers are responsible for not calling this twice on the
 * same render — see `publishPost`, which guards on the `optimized` flag.
 */
export async function optimizeOutputDir(
  dir: string,
  quality: number = PUBLISH_JPEG_QUALITY,
): Promise<number> {
  const files = slideFilesIn(dir);
  for (const name of files) {
    await optimizeSlideFile(join(dir, name), quality);
  }
  return files.length;
}
