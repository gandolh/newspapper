import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { crc32 } from 'node:zlib';
import sharp from 'sharp';
import { getDb, type DB } from '../storage/db.js';
import { listUploads } from '../storage/uploads.js';
import {
  MAX_NORMALIZED_DIMENSION,
  MAX_UPLOAD_BYTES,
  UploadRejected,
  deleteUpload,
  findUploadByRef,
  isValidRef,
  parseUploadRef,
  probeImage,
  resolveInStore,
  resolveUploadSrc,
  saveUpload,
  sanitizeDisplayName,
  slugifyFilename,
  uploadFiles,
  uploadRef,
  uploadsRoot,
} from './index.js';

let tmpDir: string;
let store: string;
let db: DB;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-uploads-'));
  store = join(tmpDir, 'store');
  process.env['UPLOADS_DIR'] = store;
  db = getDb(join(tmpDir, 'test.db'));
});

afterEach(() => {
  db.close();
  delete process.env['UPLOADS_DIR'];
  rmSync(tmpDir, { recursive: true, force: true });
});

async function makeImage(
  format: 'jpeg' | 'png' | 'webp',
  width = 120,
  height = 60,
): Promise<Buffer> {
  const base = sharp({
    create: { width, height, channels: 3, background: { r: 210, g: 40, b: 40 } },
  });
  if (format === 'jpeg') return base.jpeg().toBuffer();
  if (format === 'png') return base.png().toBuffer();
  return base.webp().toBuffer();
}

/** A JPEG carrying EXIF, including an orientation that demands a 90° turn. */
async function makeRotatedJpegWithExif(): Promise<Buffer> {
  const base = await makeImage('jpeg', 120, 60);
  return sharp(base)
    .withMetadata({
      orientation: 6,
      exif: { IFD0: { Make: 'TestCam', Software: 'gps-leaking-camera' } },
    })
    .jpeg()
    .toBuffer();
}

/** A tiny PNG whose IHDR lies about being 30000x30000. */
async function makeDecompressionBombHeader(): Promise<Buffer> {
  const png = await makeImage('png', 4, 4);
  const buf = Buffer.from(png);
  buf.writeUInt32BE(30_000, 16);
  buf.writeUInt32BE(30_000, 20);
  buf.writeUInt32BE(crc32(buf.subarray(12, 29)) >>> 0, 29);
  return buf;
}

describe('upload store paths', () => {
  it('honours UPLOADS_DIR as an absolute override', () => {
    expect(uploadsRoot()).toBe(resolve(store));
  });

  it('resolves a relative UPLOADS_DIR against the repo root, not cwd', () => {
    process.env['UPLOADS_DIR'] = 'var/images';
    const root = uploadsRoot();
    expect(root.endsWith(join('newspapper', 'var', 'images'))).toBe(true);
    expect(root).not.toBe(resolve(process.cwd(), 'var/images/nope'));
  });

  it('defaults to <repo>/uploads', () => {
    delete process.env['UPLOADS_DIR'];
    expect(uploadsRoot().endsWith(join('newspapper', 'uploads'))).toBe(true);
  });

  it('refuses a path that escapes the store', () => {
    expect(() => resolveInStore('../../etc/passwd', store)).toThrow(/escapes the store/);
    expect(() => resolveInStore('originals/../../secrets', store)).toThrow(/escapes the store/);
    expect(() => resolveInStore('/etc/passwd', store)).toThrow(/escapes the store/);
  });

  it('keeps a legitimate relative path', () => {
    expect(resolveInStore('originals/a-1234abcd.jpg', store)).toBe(
      join(store, 'originals', 'a-1234abcd.jpg'),
    );
  });
});

describe('filename handling', () => {
  it('strips directory traversal out of the display label', () => {
    expect(sanitizeDisplayName('../../etc/passwd.jpg')).toBe('passwd.jpg');
    expect(sanitizeDisplayName('..\\..\\windows\\system32\\evil.png')).toBe('evil.png');
    expect(sanitizeDisplayName('')).toBe('upload');
  });

  it('slugifies to a safe ref stem', () => {
    expect(slugifyFilename('../../etc/passwd.jpg')).toBe('passwd');
    expect(slugifyFilename('Harbour At Dawn.JPEG')).toBe('harbour-at-dawn');
    expect(slugifyFilename('....jpg')).toBe('image');
    expect(slugifyFilename('%2e%2e%2fetc.png')).toBe('2e-2e-2fetc');
  });

  it('accepts only the generated ref shape', () => {
    expect(isValidRef('harbour-9f3a1c2b')).toBe(true);
    expect(isValidRef('../etc')).toBe(false);
    expect(isValidRef('Harbour')).toBe(false);
    expect(isValidRef('a/b')).toBe(false);
    expect(isValidRef('')).toBe(false);
  });
});

describe('saveUpload', () => {
  it.each(['jpeg', 'png', 'webp'] as const)(
    'stores an original and a normalized copy for %s',
    async (format) => {
      const data = await makeImage(format);
      const stored = await saveUpload(db, { filename: `photo.${format}`, data });

      expect(stored.ref).toMatch(/^photo-[0-9a-f]{8}$/);
      expect(stored.upload.storedPath).toBe(
        `originals/${stored.ref}.${format === 'jpeg' ? 'jpg' : format}`,
      );
      expect(stored.upload.normalizedPath).toBe(
        `normalized/${stored.ref}.${format === 'jpeg' ? 'jpg' : format}`,
      );

      const files = uploadFiles(stored.upload);
      expect(existsSync(files.original)).toBe(true);
      expect(existsSync(files.normalized as string)).toBe(true);
      expect(readFileSync(files.original).equals(data)).toBe(true);

      expect(stored.upload.mime).toBe(`image/${format}`);
      expect(stored.upload.width).toBe(120);
      expect(stored.upload.height).toBe(60);
      expect(stored.upload.bytes).toBeGreaterThan(0);
      expect(uploadRef(stored.upload)).toBe(stored.ref);
    },
  );

  it('never lets the client filename reach the filesystem', async () => {
    const data = await makeImage('png');
    const stored = await saveUpload(db, { filename: '../../../../tmp/pwned.png', data });

    expect(stored.ref).toMatch(/^pwned-[0-9a-f]{8}$/);
    expect(stored.upload.filename).toBe('pwned.png');
    expect(uploadFiles(stored.upload).original.startsWith(resolve(store))).toBe(true);
    expect(readdirSync(join(store, 'originals'))).toHaveLength(1);
    expect(existsSync(join(tmpDir, 'pwned.png'))).toBe(false);
  });

  it('strips EXIF and rights a rotated photo', async () => {
    const data = await makeRotatedJpegWithExif();
    expect((await sharp(data).metadata()).exif).toBeInstanceOf(Buffer);

    const stored = await saveUpload(db, { filename: 'rotated.jpg', data });
    const normalized = await sharp(uploadFiles(stored.upload).served).metadata();

    expect(normalized.exif).toBeUndefined();
    expect(normalized.orientation).toBeUndefined();
    expect(normalized.width).toBe(60);
    expect(normalized.height).toBe(120);

    const original = await sharp(uploadFiles(stored.upload).original).metadata();
    expect(original.exif).toBeInstanceOf(Buffer);
    expect(original.orientation).toBe(6);
  });

  it('downscales the normalized copy to the 2160px cap', async () => {
    const data = await makeImage('png', 3000, 1500);
    const stored = await saveUpload(db, { filename: 'wide.png', data });

    expect(stored.original).toEqual({ width: 3000, height: 1500, bytes: data.length });
    expect(stored.upload.width).toBe(MAX_NORMALIZED_DIMENSION);
    expect(stored.upload.height).toBe(MAX_NORMALIZED_DIMENSION / 2);
  });

  it('does not enlarge a small image', async () => {
    const stored = await saveUpload(db, {
      filename: 'small.png',
      data: await makeImage('png', 40, 20),
    });
    expect(stored.upload.width).toBe(40);
  });

  it('rejects a file that only claims to be an image', async () => {
    const data = Buffer.from('<?php system($_GET["c"]); ?>');
    await expect(saveUpload(db, { filename: 'shell.png', data })).rejects.toMatchObject({
      code: 'unreadable_image',
      statusCode: 415,
    });
    expect(listUploads(db)).toHaveLength(0);
    expect(existsSync(join(store, 'originals'))).toBe(false);
  });

  it.each([
    ['gif', async () => sharp({ create: { width: 4, height: 4, channels: 3, background: '#fff' } }).gif().toBuffer()],
    [
      'svg',
      async () =>
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"></svg>'),
    ],
  ])('rejects %s, which sharp can decode but we do not accept', async (_name, make) => {
    await expect(
      saveUpload(db, { filename: 'x.png', data: await make() }),
    ).rejects.toMatchObject({ code: 'unsupported_format', statusCode: 415 });
  });

  it('rejects a small file that decodes to an enormous bitmap', async () => {
    const data = await makeDecompressionBombHeader();
    expect(data.length).toBeLessThan(1024);
    await expect(saveUpload(db, { filename: 'bomb.png', data })).rejects.toMatchObject({
      code: 'image_too_large',
      statusCode: 413,
    });
  });

  it('rejects an empty body and one over the byte cap', async () => {
    await expect(
      saveUpload(db, { filename: 'x.png', data: Buffer.alloc(0) }),
    ).rejects.toMatchObject({ code: 'empty_upload', statusCode: 400 });

    await expect(
      saveUpload(db, { filename: 'x.png', data: Buffer.alloc(MAX_UPLOAD_BYTES + 1) }),
    ).rejects.toMatchObject({ code: 'file_too_large', statusCode: 413 });
  });

  it('surfaces rejections as UploadRejected', async () => {
    await expect(probeImage(Buffer.from('nope'))).rejects.toBeInstanceOf(UploadRejected);
  });
});

describe('ref lookup and src resolution', () => {
  it('finds an upload by its ref', async () => {
    const stored = await saveUpload(db, { filename: 'a.png', data: await makeImage('png') });
    expect(findUploadByRef(db, stored.ref)?.id).toBe(stored.upload.id);
    expect(findUploadByRef(db, 'unknown-00000000')).toBeUndefined();
    expect(findUploadByRef(db, '../../etc/passwd')).toBeUndefined();
  });

  it('parses the forms an author might write', () => {
    expect(parseUploadRef('harbour-9f3a1c2b')).toBe('harbour-9f3a1c2b');
    expect(parseUploadRef('/uploads/harbour-9f3a1c2b')).toBe('harbour-9f3a1c2b');
    expect(parseUploadRef('/uploads/harbour-9f3a1c2b.jpg')).toBe('harbour-9f3a1c2b');
    expect(parseUploadRef('http://evil.example/x.png')).toBeNull();
    expect(parseUploadRef('../../../etc/passwd')).toBeNull();
    expect(parseUploadRef(42)).toBeNull();
  });

  it('builds an absolute URL for the render browser', () => {
    expect(resolveUploadSrc('harbour-9f3a1c2b', 'http://127.0.0.1:3001')).toBe(
      'http://127.0.0.1:3001/uploads/harbour-9f3a1c2b',
    );
    expect(resolveUploadSrc('harbour-9f3a1c2b', 'http://127.0.0.1:3001/')).toBe(
      'http://127.0.0.1:3001/uploads/harbour-9f3a1c2b',
    );
    expect(resolveUploadSrc('file:///etc/passwd')).toBeNull();
  });
});

describe('deleteUpload', () => {
  it('leaves nothing behind on disk or in the table', async () => {
    const stored = await saveUpload(db, { filename: 'gone.jpg', data: await makeImage('jpeg') });
    const files = uploadFiles(stored.upload);

    expect(deleteUpload(db, stored.upload.id)?.id).toBe(stored.upload.id);

    expect(existsSync(files.original)).toBe(false);
    expect(existsSync(files.normalized as string)).toBe(false);
    expect(readdirSync(join(store, 'originals'))).toHaveLength(0);
    expect(readdirSync(join(store, 'normalized'))).toHaveLength(0);
    expect(listUploads(db)).toHaveLength(0);
  });

  it('returns undefined for an unknown id', () => {
    expect(deleteUpload(db, 999)).toBeUndefined();
  });
});
