import type { Settings } from '../types.js';
import { getDb } from './db.js';

const DEFAULTS: Settings = {
  ollamaHost: 'http://localhost:11434',
  ollamaApiKey: '',
  ollamaModel: 'llama3.2:1b',
  defaultTheme: 'warm-industrial',
};

const ENV_MAP: Record<keyof Settings, string> = {
  ollamaHost: 'OLLAMA_HOST',
  ollamaApiKey: 'OLLAMA_API_KEY',
  ollamaModel: 'OLLAMA_MODEL',
  defaultTheme: 'THEME',
};

function fromEnv(): Partial<Settings> {
  const result: Partial<Record<keyof Settings, string>> = {};
  for (const [key, envVar] of Object.entries(ENV_MAP) as [keyof Settings, string][]) {
    const val = process.env[envVar];
    if (val !== undefined && val !== '') {
      result[key] = val;
    }
  }
  return result as Partial<Settings>;
}

/**
 * Read settings: DB values win over env vars, which win over defaults.
 * Never logs the API key.
 */
export function getSettings(dbPath?: string): Settings {
  const db = getDb(dbPath);
  try {
    const envOverrides = fromEnv();
    const merged: Settings = { ...DEFAULTS, ...envOverrides };

    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
    const mergedRec = merged as unknown as Record<string, string>;
    for (const row of rows) {
      if (row.key in merged) {
        mergedRec[row.key] = row.value;
      }
    }
    return merged;
  } finally {
    db.close();
  }
}

/** Persist a partial settings patch. Only provided keys are updated. */
export function saveSettings(patch: Partial<Settings>, dbPath?: string): void {
  const db = getDb(dbPath);
  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)');
    const tx = db.transaction((entries: [string, string][]) => {
      for (const [key, value] of entries) {
        stmt.run({ key, value });
      }
    });
    tx(Object.entries(patch) as [string, string][]);
  } finally {
    db.close();
  }
}
