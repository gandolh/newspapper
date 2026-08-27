import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { optimizeOutputDir, optimizeSlideFile, PUBLISH_JPEG_QUALITY, slideFilesIn } from './optimize.js';

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

async function noisyJpeg(width: number, height: number, quality: number): Promise<Buffer> {
  const raw = randomBytes(width * height * 3);
  return sharp(raw, { raw: { width, height, channels: 3 } }).jpeg({ quality }).toBuffer();
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-optimize-test-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('slideFilesIn', () => {
  it('matches slide-NN.jpg and ignores everything else', () => {
    writeFileSync(join(tmpDir, 'slide-01.jpg'), 'x');
    writeFileSync(join(tmpDir, 'slide-02.jpg'), 'x');
    writeFileSync(join(tmpDir, 'slides.json'), '{}');
    writeFileSync(join(tmpDir, 'caption.txt'), 'hi');
    writeFileSync(join(tmpDir, 'notes.jpg.bak'), 'x');

    expect(slideFilesIn(tmpDir)).toEqual(['slide-01.jpg', 'slide-02.jpg']);
  });
});

describe('optimizeSlideFile', () => {
  it('re-encodes a JPEG in place, preserving dimensions', async () => {
    const path = join(tmpDir, 'slide-01.jpg');
    const original = await noisyJpeg(400, 400, 100);
    writeFileSync(path, original);

    await optimizeSlideFile(path, PUBLISH_JPEG_QUALITY);

    const optimized = readFileSync(path);
    expect(optimized.subarray(0, 3)).toEqual(JPEG_MAGIC);
    expect(optimized.length).toBeLessThan(original.length);

    const meta = await sharp(optimized).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(400);
  });
});

describe('optimizeOutputDir', () => {
  it('re-encodes every slide file and reports how many it touched', async () => {
    const a = join(tmpDir, 'slide-01.jpg');
    const b = join(tmpDir, 'slide-02.jpg');
    writeFileSync(a, await noisyJpeg(300, 300, 100));
    writeFileSync(b, await noisyJpeg(300, 300, 100));
    writeFileSync(join(tmpDir, 'slides.json'), '{}');

    const beforeA = readFileSync(a);
    const beforeB = readFileSync(b);

    const count = await optimizeOutputDir(tmpDir, PUBLISH_JPEG_QUALITY);

    expect(count).toBe(2);
    expect(readFileSync(a).equals(beforeA)).toBe(false);
    expect(readFileSync(b).equals(beforeB)).toBe(false);
    expect(readFileSync(join(tmpDir, 'slides.json'), 'utf8')).toBe('{}');
  });
});
