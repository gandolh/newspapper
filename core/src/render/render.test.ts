/**
 * Tests for the render service:
 *   - htmlToJpeg (Playwright / Chromium)
 *   - nextOutputDir
 *   - renderSlides (orchestration)
 *   - writeRun (stale-PNG cleanup)
 *   - zipRun
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { unzipSync } from 'fflate';

import { htmlToJpeg } from './screenshot.js';
import { nextOutputDir, writeRun } from './output.js';
import { renderSlides, zipRun } from './index.js';
import { getBrowser, closeBrowser } from './browser.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

/** Scan JPEG markers for SOF0/SOF2 to read width/height. */
function parseJpegDimensions(buf: Buffer): { width: number; height: number } {
  let offset = 2; // skip SOI (0xFFD8)
  while (offset < buf.length) {
    if (buf[offset] !== 0xff) throw new Error('Malformed JPEG marker');
    const marker = buf[offset + 1];
    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15 all carry dimensions
    // in the same layout; standard baseline/progressive JPEGs use C0 or C2.
    if (marker === 0xc0 || marker === 0xc2) {
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height };
    }
    const length = buf.readUInt16BE(offset + 2);
    offset += 2 + length;
  }
  throw new Error('No SOF marker found');
}

// ---------------------------------------------------------------------------
// Browser availability guard
// ---------------------------------------------------------------------------

let browserAvailable = true;

beforeAll(async () => {
  try {
    const browser = await getBrowser();
    if (!browser.isConnected()) throw new Error('browser not connected');
  } catch (err) {
    browserAvailable = false;
    console.warn(
      '[render.test] Chromium unavailable — browser-dependent tests will be skipped.',
      err,
    );
  }
});

afterAll(async () => {
  if (browserAvailable) {
    await closeBrowser();
  }
});

// ---------------------------------------------------------------------------
// htmlToJpeg
// ---------------------------------------------------------------------------

describe('htmlToJpeg', () => {
  it('returns a JPEG with 1080×1080 dimensions', async () => {
    if (!browserAvailable) {
      console.warn('skipping htmlToJpeg test — Chromium not available');
      return;
    }

    const html =
      '<html><body style="margin:0"><div style="width:1080px;height:1080px;background:#a2391a"></div></body></html>';
    const buf = await htmlToJpeg(html);

    expect(buf.subarray(0, 3)).toEqual(JPEG_MAGIC);

    const { width, height } = parseJpegDimensions(buf);
    expect(width).toBe(1080);
    expect(height).toBe(1080);
  });

  it('respects custom dimensions', async () => {
    if (!browserAvailable) {
      console.warn('skipping custom-dimension test — Chromium not available');
      return;
    }

    const html =
      '<html><body style="margin:0"><div style="width:400px;height:300px;background:#111"></div></body></html>';
    const buf = await htmlToJpeg(html, { width: 400, height: 300 });

    expect(buf.subarray(0, 3)).toEqual(JPEG_MAGIC);
    const { width, height } = parseJpegDimensions(buf);
    expect(width).toBe(400);
    expect(height).toBe(300);
  });

  it('a lower quality produces a smaller file for the same image', async () => {
    if (!browserAvailable) {
      console.warn('skipping quality test — Chromium not available');
      return;
    }

    // A busy gradient so JPEG quality actually affects size (a flat fill
    // compresses to roughly the same size at any quality).
    const html =
      '<html><body style="margin:0"><div style="width:600px;height:600px;' +
      'background:repeating-linear-gradient(45deg,#a2391a,#1a3ba2 3px,#2f9e44 6px,#f2b705 9px)">' +
      '</div></body></html>';

    const high = await htmlToJpeg(html, { width: 600, height: 600, quality: 95 });
    const low = await htmlToJpeg(html, { width: 600, height: 600, quality: 40 });

    expect(low.length).toBeLessThan(high.length);
  });
});

// ---------------------------------------------------------------------------
// nextOutputDir
// ---------------------------------------------------------------------------

describe('nextOutputDir', () => {
  it('returns -1 for an empty root', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'nod-empty-'));
    try {
      const dir = nextOutputDir('2024-01-15', tmpRoot);
      expect(dir).toMatch(/2024-01-15-1$/);
    } finally {
      await rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it('increments past existing dirs', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'nod-existing-'));
    try {
      // Create two existing run dirs for the same date.
      await import('node:fs').then(({ mkdirSync }) => {
        mkdirSync(join(tmpRoot, '2024-01-15-1'));
        mkdirSync(join(tmpRoot, '2024-01-15-2'));
      });

      const dir = nextOutputDir('2024-01-15', tmpRoot);
      expect(dir).toMatch(/2024-01-15-3$/);
    } finally {
      await rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it('does not create the directory', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'nod-nocreate-'));
    try {
      const dir = nextOutputDir('2024-01-15', tmpRoot);
      const entries = await readdir(tmpRoot);
      expect(entries).toHaveLength(0);
      expect(dir).toBeTruthy();
    } finally {
      await rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it('ignores other dates', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'nod-other-'));
    try {
      await import('node:fs').then(({ mkdirSync }) => {
        mkdirSync(join(tmpRoot, '2024-01-14-1'));
        mkdirSync(join(tmpRoot, '2024-01-14-99'));
      });

      // Different date — should still start at -1.
      const dir = nextOutputDir('2024-01-15', tmpRoot);
      expect(dir).toMatch(/2024-01-15-1$/);
    } finally {
      await rm(tmpRoot, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// writeRun
// ---------------------------------------------------------------------------

describe('writeRun', () => {
  it('removes stale .png files already sitting in the target directory', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'write-run-stale-png-'));
    try {
      const dir = join(tmpRoot, 'run-1');
      await import('node:fs').then(({ mkdirSync }) => mkdirSync(dir, { recursive: true }));
      await writeFile(join(dir, '1.png'), Buffer.from('stale'));
      await writeFile(join(dir, '2.png'), Buffer.from('stale'));

      await writeRun(dir, [{ name: 'slide-01.jpg', data: Buffer.from('jpeg-bytes') }]);

      const entries = await readdir(dir);
      expect(entries).toEqual(['slide-01.jpg']);
    } finally {
      await rm(tmpRoot, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// renderSlides
// ---------------------------------------------------------------------------

describe('renderSlides', () => {
  it('creates slide-01.jpg, slide-02.jpg, slides.json, caption.txt and fires progress', async () => {
    if (!browserAvailable) {
      console.warn('skipping renderSlides test — Chromium not available');
      return;
    }

    const tmpRoot = await mkdtemp(join(tmpdir(), 'render-slides-'));
    try {
      const red =
        '<html><body style="margin:0"><div style="width:1080px;height:1080px;background:red"></div></body></html>';
      const blue =
        '<html><body style="margin:0"><div style="width:1080px;height:1080px;background:blue"></div></body></html>';

      const progressCalls: [number, number][] = [];

      const result = await renderSlides([red, blue], {
        date: '2024-01-15',
        slidesJson: { title: 'Test post', slides: [] },
        caption: 'Hello caption',
        outputRoot: tmpRoot,
        onProgress: (done, total) => progressCalls.push([done, total]),
      });

      // Progress called twice (once per slide).
      expect(progressCalls).toEqual([
        [1, 2],
        [2, 2],
      ]);

      // Output dir exists, with JPEGs only.
      const entries = await readdir(result.dir);
      expect(entries).toContain('slide-01.jpg');
      expect(entries).toContain('slide-02.jpg');
      expect(entries).toContain('slides.json');
      expect(entries).toContain('caption.txt');
      expect(entries.some((n) => n.endsWith('.png'))).toBe(false);

      // files array contains absolute paths in the right order.
      expect(result.files[0]).toMatch(/slide-01\.jpg$/);
      expect(result.files[1]).toMatch(/slide-02\.jpg$/);
    } finally {
      await rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it('omits caption.txt when caption is not provided', async () => {
    if (!browserAvailable) {
      console.warn('skipping renderSlides (no-caption) test — Chromium not available');
      return;
    }

    const tmpRoot = await mkdtemp(join(tmpdir(), 'render-nocap-'));
    try {
      const html =
        '<html><body style="margin:0"><div style="width:1080px;height:1080px;background:green"></div></body></html>';

      const result = await renderSlides([html], {
        date: '2024-01-16',
        slidesJson: {},
        outputRoot: tmpRoot,
      });

      const entries = await readdir(result.dir);
      expect(entries).not.toContain('caption.txt');
    } finally {
      await rm(tmpRoot, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// zipRun
// ---------------------------------------------------------------------------

describe('zipRun', () => {
  it('round-trips file names through a ZIP archive', async () => {
    if (!browserAvailable) {
      console.warn('skipping zipRun test — Chromium not available');
      return;
    }

    const tmpRoot = await mkdtemp(join(tmpdir(), 'zip-run-'));
    try {
      const html =
        '<html><body style="margin:0"><div style="width:1080px;height:1080px;background:#333"></div></body></html>';

      const { dir } = await renderSlides([html], {
        date: '2024-01-17',
        slidesJson: { test: true },
        caption: 'zip test',
        outputRoot: tmpRoot,
      });

      const zipBuf = await zipRun(dir);

      // Unzip and check file names.
      const unzipped = unzipSync(new Uint8Array(zipBuf));
      const names = Object.keys(unzipped).sort();

      expect(names).toContain('slide-01.jpg');
      expect(names).toContain('slides.json');
      expect(names).toContain('caption.txt');
    } finally {
      await rm(tmpRoot, { recursive: true, force: true });
    }
  });
});
