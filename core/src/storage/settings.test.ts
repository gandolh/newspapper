import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getSettings, saveSettings } from './settings.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-settings-test-'));
  vi.stubEnv('THEME', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('settings', () => {
  it('returns defaults when DB is empty and no env vars', () => {
    const settings = getSettings(join(tmpDir, 'settings.db'));
    expect(settings.defaultTheme).toBe('warm-industrial-1');
  });

  it('env vars override defaults', () => {
    vi.stubEnv('THEME', 'custom-theme');
    const settings = getSettings(join(tmpDir, 'settings.db'));
    expect(settings.defaultTheme).toBe('custom-theme');
  });

  it('DB values win over env vars', () => {
    const dbPath = join(tmpDir, 'settings.db');
    vi.stubEnv('THEME', 'env-theme');
    saveSettings({ defaultTheme: 'db-theme' }, dbPath);
    const settings = getSettings(dbPath);
    expect(settings.defaultTheme).toBe('db-theme');
  });

  it('saveSettings patch merges — untouched keys keep their values', () => {
    const dbPath = join(tmpDir, 'settings.db');
    saveSettings({ defaultTheme: 'first-theme' }, dbPath);
    const settings = getSettings(dbPath);
    expect(settings.defaultTheme).toBe('first-theme');
  });
});
