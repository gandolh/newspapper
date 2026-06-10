import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPrompt, savePrompt, resetPrompt } from './prompt.js';

let tmpDir: string;
let promptPath: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-prompt-test-'));
  promptPath = join(tmpDir, 'prompt.md');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('prompt — file-backed', () => {
  it('seeds file with defaultText when file does not exist', () => {
    const text = getPrompt('Default prompt text', promptPath);
    expect(text).toBe('Default prompt text');
  });

  it('seeded file is readable on second call', () => {
    getPrompt('Default prompt text', promptPath);
    const text = getPrompt('Different default', promptPath);
    expect(text).toBe('Default prompt text'); // original seeded value
  });

  it('savePrompt writes new content', () => {
    getPrompt('Default', promptPath);
    savePrompt('Custom prompt', promptPath);
    const text = getPrompt('Default', promptPath);
    expect(text).toBe('Custom prompt');
  });

  it('resetPrompt overwrites with defaultText', () => {
    savePrompt('Custom prompt', promptPath);
    resetPrompt('Reset default', promptPath);
    const text = getPrompt('ignored', promptPath);
    expect(text).toBe('Reset default');
  });

  it('getPrompt creates parent directories if needed', () => {
    const nested = join(tmpDir, 'deep', 'nested', 'prompt.md');
    const text = getPrompt('Nested default', nested);
    expect(text).toBe('Nested default');
  });
});
