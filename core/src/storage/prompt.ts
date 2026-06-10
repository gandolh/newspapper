import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Default prompt path, resolved from this file's location so it always points
 * to repo_root/data/prompt.md regardless of the process CWD.
 */
function defaultPromptPath(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(thisFile, '..', '..', '..', '..', 'data', 'prompt.md');
}

function resolvePath(p?: string): string {
  return resolve(p ?? defaultPromptPath());
}

function ensureParent(p: string): void {
  const dir = dirname(p);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * Returns the contents of the prompt file.
 * If the file does not exist, it is seeded with `defaultText` and that text is returned.
 */
export function getPrompt(defaultText: string, filePath?: string): string {
  const p = resolvePath(filePath);
  if (!existsSync(p)) {
    ensureParent(p);
    writeFileSync(p, defaultText, 'utf8');
    return defaultText;
  }
  return readFileSync(p, 'utf8');
}

/** Overwrite the prompt file with the given text. */
export function savePrompt(text: string, filePath?: string): void {
  const p = resolvePath(filePath);
  ensureParent(p);
  writeFileSync(p, text, 'utf8');
}

/** Reset the prompt file to `defaultText`. */
export function resetPrompt(defaultText: string, filePath?: string): void {
  savePrompt(defaultText, filePath);
}
