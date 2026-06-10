import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getSettings, saveSettings } from './settings.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-settings-test-'));
  // Clear env vars that might interfere
  vi.stubEnv('OLLAMA_HOST', '');
  vi.stubEnv('OLLAMA_API_KEY', '');
  vi.stubEnv('OLLAMA_MODEL', '');
  vi.stubEnv('THEME', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('settings', () => {
  it('returns defaults when DB is empty and no env vars', () => {
    const settings = getSettings(join(tmpDir, 'settings.db'));
    expect(settings.ollamaHost).toBe('http://localhost:11434');
    expect(settings.ollamaApiKey).toBe('');
    expect(settings.ollamaModel).toBe('llama3.2:1b');
    expect(settings.defaultTheme).toBe('warm-industrial');
  });

  it('env vars override defaults', () => {
    vi.stubEnv('OLLAMA_HOST', 'http://custom:11434');
    vi.stubEnv('OLLAMA_MODEL', 'llama3.1:8b');
    const settings = getSettings(join(tmpDir, 'settings.db'));
    expect(settings.ollamaHost).toBe('http://custom:11434');
    expect(settings.ollamaModel).toBe('llama3.1:8b');
  });

  it('DB values win over env vars', () => {
    const dbPath = join(tmpDir, 'settings.db');
    vi.stubEnv('OLLAMA_HOST', 'http://env:11434');
    saveSettings({ ollamaHost: 'http://db:11434' }, dbPath);
    const settings = getSettings(dbPath);
    expect(settings.ollamaHost).toBe('http://db:11434');
  });

  it('saveSettings patch merges — untouched keys keep their values', () => {
    const dbPath = join(tmpDir, 'settings.db');
    saveSettings({ ollamaHost: 'http://first:11434', ollamaModel: 'custom-model' }, dbPath);
    saveSettings({ ollamaModel: 'updated-model' }, dbPath);
    const settings = getSettings(dbPath);
    expect(settings.ollamaHost).toBe('http://first:11434');
    expect(settings.ollamaModel).toBe('updated-model');
  });

  it('does not throw when API key is set (does not log it)', () => {
    const dbPath = join(tmpDir, 'settings.db');
    expect(() => saveSettings({ ollamaApiKey: 'secret-key-123' }, dbPath)).not.toThrow();
    const settings = getSettings(dbPath);
    expect(settings.ollamaApiKey).toBe('secret-key-123');
  });
});
