/**
 * File-backed registry for TemplateDoc JSON files.
 * Node-only (uses fs + path) — exported from core main entry, NOT from the browser subpath.
 *
 * Layout on disk:
 *   assets/templates/<theme>/<id>.json
 *
 * Sort order: title < body < quote, then alpha by id within each family.
 */

import { readFileSync, writeFileSync, unlinkSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TemplateDoc } from '../types.js';
import { validateTemplateDoc } from './interpreter.js';

/**
 * Resolve the repo root from this file's location.
 * core/src/templates/registry.ts → up 4 levels → repo root
 * (registry.ts → templates/ → src/ → core/ → repo root)
 */
function repoRoot(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(thisFile, '..', '..', '..', '..');
}

// Path to assets/templates, resolved from repo root (not process CWD)
function templatesDir(theme: string): string {
  return resolve(repoRoot(), 'assets/templates', theme);
}

function templatePath(theme: string, id: string): string {
  return join(templatesDir(theme), `${id}.json`);
}

const FAMILY_ORDER: Record<string, number> = { title: 0, body: 1, quote: 2 };

function sortTemplates(docs: TemplateDoc[]): TemplateDoc[] {
  return [...docs].sort((a, b) => {
    const fa = FAMILY_ORDER[a.family] ?? 99;
    const fb = FAMILY_ORDER[b.family] ?? 99;
    if (fa !== fb) return fa - fb;
    return a.id.localeCompare(b.id);
  });
}

/**
 * List and load all templates for a theme.
 * Returns sorted: title family first, then body, then quote.
 */
export function listTemplates(theme: string): TemplateDoc[] {
  const dir = templatesDir(theme);
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const docs = files.map((f) => {
    const raw = readFileSync(join(dir, f), 'utf8');
    return validateTemplateDoc(JSON.parse(raw));
  });
  return sortTemplates(docs);
}

/**
 * Load a single template by theme and id. Throws if not found.
 */
export function loadTemplate(theme: string, id: string): TemplateDoc {
  const path = templatePath(theme, id);
  if (!existsSync(path)) throw new Error(`Template not found: ${theme}/${id}`);
  const raw = readFileSync(path, 'utf8');
  return validateTemplateDoc(JSON.parse(raw));
}

/**
 * Save (create or overwrite) a template document.
 * Validates before writing.
 */
export function saveTemplate(doc: TemplateDoc): void {
  validateTemplateDoc(doc);
  const dir = templatesDir(doc.theme);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = templatePath(doc.theme, doc.id);
  writeFileSync(path, JSON.stringify(doc, null, 2), 'utf8');
}

/**
 * Delete a template. Throws if not found.
 */
export function deleteTemplate(theme: string, id: string): void {
  const path = templatePath(theme, id);
  if (!existsSync(path)) throw new Error(`Template not found: ${theme}/${id}`);
  unlinkSync(path);
}

/**
 * Filter templates by family. Returns sorted subset.
 */
export function templatesForFamily(
  theme: string,
  family: TemplateDoc['family'],
): TemplateDoc[] {
  return listTemplates(theme).filter((d) => d.family === family);
}
