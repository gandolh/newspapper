/**
 * Render orchestration: HTML strings → JPEGs → output directory + ZIP export.
 *
 * Re-exports all public symbols from the render sub-modules so callers can
 * import everything from '@newspapper/core/render' (or directly from the
 * core barrel at '@newspapper/core').
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { zipSync } from 'fflate';
import sharp from 'sharp';
import { DEFAULT_JPEG_QUALITY, htmlToJpeg } from './screenshot.js';
import type { DB } from '../storage/db.js';
import { reserveOutputDir, writeRun } from './output.js';
import { rmSync } from 'node:fs';

// ---- Public types ----

export interface RenderedRun {
  /** Absolute path to the output directory. */
  dir: string;
  /** Absolute paths to each written file, JPEGs first in slide order. */
  files: string[];
  /** Absolute path of the grid thumbnail (`THUMB_FILE`), when one was made. */
  thumb?: string;
}

/**
 * The post grid's thumbnail, written beside the slides at render time. Not a
 * `slide-NN.jpg`, so nothing that lists, optimizes or publishes slides sees it,
 * and the export zip leaves it out.
 */
export const THUMB_FILE = 'thumb.jpg';

/** 2x the grid's 104 px cell, so it is sharp on a high-DPR screen. */
const THUMB_SIZE = 220;

/**
 * A small JPEG of the first slide. The grid used to load each post's full
 * 1080x1080 `slide-01.jpg` (~150-950 KB) to show a 104 px stamp (brief 97).
 */
export async function makeThumbnail(slide: Buffer): Promise<Buffer> {
  return sharp(slide)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer();
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
  /** JPEG quality, 0–100. Defaults to draft quality (92) — size only matters at publish. */
  quality?: number;
  /** Called after each slide is written: (done, total). */
  onProgress?: (done: number, total: number) => void;
  /**
   * The uploads database, so image bytes reach the render browser from disk
   * rather than over HTTP.
   *
   * **A run that renders slides with images must pass this.** `/uploads/*` is
   * a guarded route since newspapper left loopback, and the render browser
   * carries no session — so without it every `<Image>` fetches a 401 and comes
   * out blank. See `render/uploads-route.ts`.
   */
  db?: DB;
}

// ---- Orchestration ----

/** Zero-padded slide filename: slide-01.jpg, slide-02.jpg, … */
function slideFileName(index: number, total: number): string {
  const width = Math.max(2, String(total).length);
  return `slide-${String(index).padStart(width, '0')}.jpg`;
}

/**
 * Render an array of fully self-contained HTML strings to JPEGs and write
 * them (along with slides.json and an optional caption.txt) to a fresh run
 * dir. No PNG is ever written.
 *
 * Slides are rendered sequentially for predictable memory usage and ordered
 * progress events.
 */
export async function renderSlides(
  html: string[],
  opts: RenderSlidesOptions,
): Promise<RenderedRun> {
  // Reserved (created) now, not at write time: see `reserveOutputDir`.
  const dir = reserveOutputDir(opts.date, opts.outputRoot);
  const quality = opts.quality ?? DEFAULT_JPEG_QUALITY;

  const jpegBuffers: Buffer[] = [];
  try {
    for (let i = 0; i < html.length; i++) {
      const buf = await htmlToJpeg(html[i], { quality, ...(opts.db ? { db: opts.db } : {}) });
      jpegBuffers.push(buf);
      opts.onProgress?.(i + 1, html.length);
    }
  } catch (err) {
    // A failed render must not leave its reserved, empty directory behind.
    rmSync(dir, { recursive: true, force: true });
    throw err;
  }

  const outputFiles: { name: string; data: Buffer | string }[] = [
    ...jpegBuffers.map((buf, i) => ({ name: slideFileName(i + 1, html.length), data: buf })),
    { name: 'slides.json', data: JSON.stringify(opts.slidesJson, null, 2) },
  ];

  if (opts.caption !== undefined) {
    outputFiles.push({ name: 'caption.txt', data: opts.caption });
  }

  await writeRun(dir, outputFiles);

  const writtenFiles = outputFiles.map((f) => join(dir, f.name));
  // Once, here, rather than per grid load. A thumbnail is a convenience: if it
  // fails, the grid falls back to the first slide, so the render still stands.
  let thumb: string | undefined;
  if (jpegBuffers[0]) {
    try {
      thumb = join(dir, THUMB_FILE);
      writeFileSync(thumb, await makeThumbnail(jpegBuffers[0]));
    } catch {
      thumb = undefined;
    }
  }
  return { dir, files: writtenFiles, ...(thumb ? { thumb } : {}) };
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
    // The grid thumbnail is the app's, not part of the post being exported.
    if (name === THUMB_FILE) continue;
    const data = readFileSync(join(dir, name));
    zipInput[name] = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return Buffer.from(zipSync(zipInput));
}

// ---- Re-exports ----

export { getBrowser, closeBrowser } from './browser.js';
export { htmlToPng, htmlToJpeg, DEFAULT_JPEG_QUALITY } from './screenshot.js';
export { installUploadsRoute, localUploadFile, UPLOADS_ROUTE_GLOB } from './uploads-route.js';
export type { HtmlToPngOptions, HtmlToJpegOptions } from './screenshot.js';
export { nextOutputDir, reserveOutputDir, writeRun } from './output.js';
export type { OutputFile } from './output.js';
export { resolveImageUrls } from './resolve-images.js';
