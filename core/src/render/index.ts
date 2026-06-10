/**
 * Render orchestration: HTML strings → PNGs → output directory + ZIP export.
 *
 * Re-exports all public symbols from the render sub-modules so callers can
 * import everything from '@newspapper/core/render' (or directly from the
 * core barrel at '@newspapper/core').
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { zipSync } from 'fflate';
import { htmlToPng } from './screenshot.js';
import { nextOutputDir, writeRun } from './output.js';

// ---- Public types ----

export interface RenderedRun {
  /** Absolute path to the output directory. */
  dir: string;
  /** Absolute paths to each written file, PNGs first in slide order. */
  files: string[];
}

export interface RenderSlidesOptions {
  /** YYYY-MM-DD — used to name the output directory. */
  date: string;
  /** Written as slides.json (pretty-printed). */
  slidesJson: unknown;
  /** Written as caption.txt when present. */
  caption?: string;
  /** Override default <repo>/output root; useful for tests. */
  outputRoot?: string;
  /** Called after each PNG is written: (done, total). */
  onProgress?: (done: number, total: number) => void;
}

// ---- Orchestration ----

/**
 * Render an array of fully self-contained HTML strings to PNGs and write them
 * (along with slides.json and an optional caption.txt) to a fresh run dir.
 *
 * PNGs are rendered sequentially for predictable memory usage and ordered
 * progress events.
 */
export async function renderSlides(
  html: string[],
  opts: RenderSlidesOptions,
): Promise<RenderedRun> {
  const dir = nextOutputDir(opts.date, opts.outputRoot);

  const pngBuffers: Buffer[] = [];
  for (let i = 0; i < html.length; i++) {
    const buf = await htmlToPng(html[i]);
    pngBuffers.push(buf);
    opts.onProgress?.(i + 1, html.length);
  }

  const outputFiles: { name: string; data: Buffer | string }[] = [
    ...pngBuffers.map((buf, i) => ({ name: `${i + 1}.png`, data: buf })),
    { name: 'slides.json', data: JSON.stringify(opts.slidesJson, null, 2) },
  ];

  if (opts.caption !== undefined) {
    outputFiles.push({ name: 'caption.txt', data: opts.caption });
  }

  await writeRun(dir, outputFiles);

  const writtenFiles = outputFiles.map((f) => join(dir, f.name));
  return { dir, files: writtenFiles };
}

// ---- ZIP export ----

/**
 * Build a ZIP archive of every file inside `dir` and return the Buffer.
 * Uses fflate's synchronous zipSync — suitable for typical run sizes (<10 MB).
 */
export async function zipRun(dir: string): Promise<Buffer> {
  const entries = readdirSync(dir);
  const zipInput: Record<string, Uint8Array> = {};
  for (const name of entries) {
    const data = readFileSync(join(dir, name));
    zipInput[name] = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return Buffer.from(zipSync(zipInput));
}

// ---- Re-exports ----

export { getBrowser, closeBrowser } from './browser.js';
export { htmlToPng } from './screenshot.js';
export type { HtmlToPngOptions } from './screenshot.js';
export { nextOutputDir, writeRun } from './output.js';
export type { OutputFile } from './output.js';
