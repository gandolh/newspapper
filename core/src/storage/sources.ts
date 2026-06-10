import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SourceConfig } from '../types.js';

/**
 * Default sources path, resolved from this file's location so it always points
 * to repo_root/data/sources.json regardless of the process CWD.
 */
function defaultSourcesPath(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(thisFile, '..', '..', '..', '..', 'data', 'sources.json');
}

function resolvePath(p?: string): string {
  return resolve(p ?? defaultSourcesPath());
}

function ensureParent(p: string): void {
  const dir = dirname(p);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function read(filePath: string): SourceConfig[] {
  if (!existsSync(filePath)) return [];
  const raw = readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`${filePath} must be a JSON array`);
  return parsed as SourceConfig[];
}

function write(filePath: string, sources: SourceConfig[]): void {
  ensureParent(filePath);
  writeFileSync(filePath, JSON.stringify(sources, null, 2) + '\n', 'utf8');
}

export function listSources(filePath?: string): SourceConfig[] {
  return read(resolvePath(filePath));
}

export function saveSources(all: SourceConfig[], filePath?: string): void {
  write(resolvePath(filePath), all);
}

export function addSource(src: SourceConfig, filePath?: string): SourceConfig[] {
  const p = resolvePath(filePath);
  const all = read(p);
  if (all.some((s) => s.id === src.id)) {
    throw new Error(`Source with id "${src.id}" already exists`);
  }
  all.push(src);
  write(p, all);
  return all;
}

export function updateSource(
  id: string,
  patch: Partial<Omit<SourceConfig, 'id'>>,
  filePath?: string,
): SourceConfig[] {
  const p = resolvePath(filePath);
  const all = read(p);
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error(`Source "${id}" not found`);
  all[idx] = { ...all[idx], ...patch };
  write(p, all);
  return all;
}

export function removeSource(id: string, filePath?: string): SourceConfig[] {
  const p = resolvePath(filePath);
  const all = read(p);
  const next = all.filter((s) => s.id !== id);
  if (next.length === all.length) throw new Error(`Source "${id}" not found`);
  write(p, next);
  return next;
}
