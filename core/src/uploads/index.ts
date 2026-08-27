import { writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { DB } from '../storage/db.js';
import type { Upload } from '../types.js';
import { createUpload, findUpload, removeUpload } from '../storage/uploads.js';
import { ensureDir } from '../util/paths.js';
import { UploadRejected } from './errors.js';
import {
  ACCEPTED_FORMATS,
  FORMAT_EXTENSION,
  FORMAT_MIME,
  MAX_UPLOAD_BYTES,
  normalizeImage,
  probeImage,
} from './image.js';
import {
  isValidRef,
  makeRef,
  normalizedRelPath,
  originalRelPath,
  refFromStoredPath,
  removeStoreFile,
  resolveInStore,
  sanitizeDisplayName,
  storeFileExists,
  uploadsRoot,
} from './store.js';

export * from './errors.js';
export * from './image.js';
export * from './store.js';

/** URL prefix the API serves upload bytes under. */
export const UPLOADS_URL_PREFIX = '/uploads';

const REF_ATTEMPTS = 8;

export interface SaveUploadInput {
  /** The client-supplied name. Used as a display label and to seed the ref. */
  filename: string;
  data: Buffer;
}

export interface OriginalInfo {
  width: number;
  height: number;
  bytes: number;
}

export interface StoredUpload {
  upload: Upload;
  ref: string;
  original: OriginalInfo;
}

export interface UploadFilePaths {
  original: string;
  normalized: string | null;
  /** What HTTP serves and the renderer points at. */
  served: string;
}

/** The ref an `<Image src>` uses to name this upload. */
export function uploadRef(upload: Upload): string {
  return refFromStoredPath(upload.storedPath);
}

/** Absolute on-disk paths for an upload, under the *current* store root. */
export function uploadFiles(upload: Upload, root: string = uploadsRoot()): UploadFilePaths {
  const original = resolveInStore(upload.storedPath, root);
  const normalized = upload.normalizedPath ? resolveInStore(upload.normalizedPath, root) : null;
  return { original, normalized, served: normalized ?? original };
}

export function findUploadByRef(db: DB, ref: unknown): Upload | undefined {
  if (!isValidRef(ref)) return undefined;
  const candidates = ACCEPTED_FORMATS.map((f) => originalRelPath(ref, FORMAT_EXTENSION[f]));
  const placeholders = candidates.map(() => '?').join(', ');
  const row = db
    .prepare(`SELECT id FROM uploads WHERE stored_path IN (${placeholders}) LIMIT 1`)
    .get(...candidates) as { id: number } | undefined;
  return row ? findUpload(db, row.id) : undefined;
}

/**
 * Accept `harbour-9f3a1c2b`, `/uploads/harbour-9f3a1c2b`, or the same with an
 * extension, and return the bare ref. Anything else — including an absolute
 * URL — is not a reference to an upload.
 */
export function parseUploadRef(src: unknown): string | null {
  if (typeof src !== 'string') return null;
  let value = src.trim();
  if (!value) return null;
  if (value.startsWith(`${UPLOADS_URL_PREFIX}/`)) value = value.slice(UPLOADS_URL_PREFIX.length + 1);
  value = value.replace(/\.(jpg|jpeg|png|webp)$/i, '');
  return isValidRef(value) ? value : null;
}

export function uploadPublicPath(ref: string): string {
  return `${UPLOADS_URL_PREFIX}/${ref}`;
}

export function uploadOriginalPath(ref: string): string {
  return `${UPLOADS_URL_PREFIX}/${ref}/original`;
}

/** Origin the render browser fetches upload bytes from. */
export function uploadsBaseUrl(): string {
  const override = process.env['UPLOADS_BASE_URL']?.trim();
  if (override) return override.replace(/\/+$/, '');
  return `http://127.0.0.1:${process.env['PORT'] ?? '3001'}`;
}

/**
 * Turn an `<Image src>` into an absolute URL Chromium can fetch, or null when
 * the value does not name an upload.
 */
export function resolveUploadSrc(src: unknown, baseUrl: string = uploadsBaseUrl()): string | null {
  const ref = parseUploadRef(src);
  return ref ? `${baseUrl.replace(/\/+$/, '')}${uploadPublicPath(ref)}` : null;
}

function reserveRef(filename: string, extension: string, root: string): string {
  for (let i = 0; i < REF_ATTEMPTS; i++) {
    const ref = makeRef(filename);
    if (!storeFileExists(originalRelPath(ref, extension), root)) return ref;
  }
  throw new Error('Could not allocate a free upload reference.');
}

/**
 * Validate, store, and normalize one uploaded image, then record the row.
 * The client filename never reaches the filesystem: the stored name is
 * generated here and the original survives only as a display label.
 */
export async function saveUpload(db: DB, input: SaveUploadInput): Promise<StoredUpload> {
  const data = input.data;
  if (!Buffer.isBuffer(data) || data.length === 0) {
    throw new UploadRejected('empty_upload', 400, 'No file content was received.');
  }
  if (data.length > MAX_UPLOAD_BYTES) {
    throw new UploadRejected(
      'file_too_large',
      413,
      `That file is ${data.length} bytes; the limit is ${MAX_UPLOAD_BYTES} (10 MB).`,
    );
  }

  const probed = await probeImage(data);
  const normalized = await normalizeImage(data, probed.format);

  const root = uploadsRoot();
  const extension = FORMAT_EXTENSION[probed.format];
  const ref = reserveRef(input.filename, extension, root);
  const originalRel = originalRelPath(ref, extension);
  const normalizedRel = normalizedRelPath(ref, extension);
  const originalAbs = resolveInStore(originalRel, root);
  const normalizedAbs = resolveInStore(normalizedRel, root);

  ensureDir(dirname(originalAbs));
  ensureDir(dirname(normalizedAbs));
  writeFileSync(originalAbs, data, { flag: 'wx' });
  try {
    writeFileSync(normalizedAbs, normalized.data, { flag: 'wx' });
  } catch (err) {
    removeStoreFile(originalRel, root);
    throw err;
  }

  const upload = createUpload(db, {
    filename: sanitizeDisplayName(input.filename),
    storedPath: originalRel,
    normalizedPath: normalizedRel,
    mime: FORMAT_MIME[probed.format],
    width: normalized.width,
    height: normalized.height,
    bytes: normalized.data.length,
  });

  return {
    upload,
    ref,
    original: { width: probed.width, height: probed.height, bytes: data.length },
  };
}

/** Unlink both derivatives. Missing files are not an error. */
export function removeUploadFiles(upload: Upload, root: string = uploadsRoot()): void {
  for (const relative of [upload.storedPath, upload.normalizedPath]) {
    if (!relative) continue;
    removeStoreFile(relative, root);
  }
}

/** Remove the files first, then the row, so neither is left orphaned. */
export function deleteUpload(db: DB, id: number): Upload | undefined {
  const upload = findUpload(db, id);
  if (!upload) return undefined;
  removeUploadFiles(upload);
  removeUpload(db, id);
  return upload;
}
