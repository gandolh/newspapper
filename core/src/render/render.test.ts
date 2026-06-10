/**
 * Tests for the render service:
 *   - htmlToPng (Playwright / Chromium)
 *   - nextOutputDir
 *   - renderSlides (orchestration)
 *   - zipRun
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { unzipSync } from 'fflate';

import { htmlToPng } from './screenshot.js';
import { nextOutputDir } from './output.js';
import { renderSlides, zipRun } from './index.js';
import { getBrowser, closeBrowser } from './browser.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read IHDR chunk to get PNG width/height (bytes 16-23 after 8-byte sig). */
function parsePngDimensions(buf: Buffer): { width: number; height: number } {
  // PNG signature: 8 bytes
  // IHDR chunk: 4 (length) + 4 (type) + 4 (width) + 4 (height) + ...
  // Width starts at offset 16, height at offset 20 — both big-endian uint32.
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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
// htmlToPng
// ---------------------------------------------------------------------------

describe('htmlToPng', () => {
  it('returns a PNG with 1080×1080 dimensions', async () => {
    if (!browserAvailable) {
      console.warn('skipping htmlToPng test — Chromium not available');
      return;
    }

    const html =
      '<html><body style="margin:0"><div style="width:1080px;height:1080px;background:#a2391a"></div></body></html>';
    const buf = await htmlToPng(html);

    // PNG magic bytes
    expect(buf.slice(0, 8)).toEqual(PNG_MAGIC);

    // Dimensions from IHDR
    const { width, height } = parsePngDimensions(buf);
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
    const buf = await htmlToPng(html, { width: 400, height: 300 });

    expect(buf.slice(0, 8)).toEqual(PNG_MAGIC);
    const { width, height } = parsePngDimensions(buf);
    expect(width).toBe(400);
    expect(height).toBe(300);
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
// renderSlides
// ---------------------------------------------------------------------------

describe('renderSlides', () => {
  it('creates 1.png, 2.png, slides.json, caption.txt and fires progress', async () => {
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

      // Output dir exists.
      const entries = await readdir(result.dir);
      expect(entries).toContain('1.png');
      expect(entries).toContain('2.png');
      expect(entries).toContain('slides.json');
      expect(entries).toContain('caption.txt');

      // files array contains absolute paths in the right order.
      expect(result.files[0]).toMatch(/1\.png$/);
      expect(result.files[1]).toMatch(/2\.png$/);
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

      expect(names).toContain('1.png');
      expect(names).toContain('slides.json');
      expect(names).toContain('caption.txt');
    } finally {
      await rm(tmpRoot, { recursive: true, force: true });
    }
  });
});
