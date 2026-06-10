/**
 * Theme loader — Node-only (uses fs).
 * Exported from core main entry, not from the browser subpath.
 *
 * Theme JSON files live at: assets/design-systems/<name>.json
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Theme } from '../types.js';

function designSystemsDir(): string {
  return resolve('assets/design-systems');
}

/**
 * Load a theme by name. Throws if not found.
 */
export function loadTheme(name: string): Theme {
  const path = resolve(designSystemsDir(), `${name}.json`);
  if (!existsSync(path)) throw new Error(`Theme not found: "${name}" (looked for ${path})`);
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as Theme;
}

/**
 * List all available theme names (files in assets/design-systems/*.json).
 */
export function listThemes(): string[] {
  const dir = designSystemsDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
}
