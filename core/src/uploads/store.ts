import { randomBytes } from 'node:crypto';
import { existsSync, rmSync } from 'node:fs';
import { basename, isAbsolute, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(moduleDir, '../../..');

export const ORIGINALS_DIR = 'originals';
export const NORMALIZED_DIR = 'normalized';

/** The only shape an upload reference may take, in markup or in a URL. */
export const REF_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,94}[a-z0-9])?$/;

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const COMBINING_MARKS = /[\u0300-\u036f]/g;
const MAX_SLUG_LENGTH = 48;
const MAX_DISPLAY_NAME_LENGTH = 200;

/**
 * Absolute path of the upload store. `UPLOADS_DIR` overrides it; a relative
 * override resolves against the repo root, never process.cwd().
 */
export function uploadsRoot(): string {
  const override = process.env['UPLOADS_DIR']?.trim();
  if (override) return isAbsolute(override) ? resolve(override) : resolve(repoRoot, override);
  return resolve(repoRoot, 'uploads');
}

export function isValidRef(ref: unknown): ref is string {
  return typeof ref === 'string' && REF_PATTERN.test(ref);
}

/**
 * Resolve a store-relative path, refusing anything that lands outside the
 * store root.
 */
export function resolveInStore(relativePath: string, root: string = uploadsRoot()): string {
  const rootAbs = resolve(root);
  const target = resolve(rootAbs, relativePath);
  const prefix = rootAbs.endsWith(sep) ? rootAbs : rootAbs + sep;
  if (target !== rootAbs && !target.startsWith(prefix)) {
    throw new Error(`Upload path escapes the store: ${relativePath}`);
  }
  return target;
}

/** A display label only — never a path component. */
export function sanitizeDisplayName(filename: unknown): string {
  const raw = typeof filename === 'string' ? filename : '';
  const leaf = raw.replace(CONTROL_CHARS, '').split(/[\\/]/).pop() ?? '';
  return leaf.trim().slice(0, MAX_DISPLAY_NAME_LENGTH) || 'upload';
}

export function slugifyFilename(filename: unknown): string {
  const label = sanitizeDisplayName(filename).replace(/\.[^.]*$/, '');
  const slug = label
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
  return slug || 'image';
}

export function makeRef(filename: unknown): string {
  return `${slugifyFilename(filename)}-${randomBytes(4).toString('hex')}`;
}

export function originalRelPath(ref: string, extension: string): string {
  return `${ORIGINALS_DIR}/${ref}.${extension}`;
}

export function normalizedRelPath(ref: string, extension: string): string {
  return `${NORMALIZED_DIR}/${ref}.${extension}`;
}

export function refFromStoredPath(storedPath: string): string {
  return basename(storedPath).replace(/\.[^.]*$/, '');
}

export function storeFileExists(relativePath: string, root: string = uploadsRoot()): boolean {
  return existsSync(resolveInStore(relativePath, root));
}

export function removeStoreFile(relativePath: string, root: string = uploadsRoot()): void {
  rmSync(resolveInStore(relativePath, root), { force: true });
}
