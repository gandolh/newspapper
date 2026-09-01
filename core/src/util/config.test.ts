import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Guards the one thing `./config.ts` does: load `.env` into `process.env`.
 *
 * Both halves are asserted, because either one going missing breaks `.env`
 * silently — no throw, no log, the app just boots on defaults:
 *
 *   1. the module itself reads a `.env` from the working directory, and
 *   2. `core/src/index.ts` — the barrel every `api` module imports — pulls it in.
 *
 * The module exports nothing, so (2) is a bare side-effect import that reads as
 * deletable. This is the test that makes deleting it loud.
 */
describe('.env loading', () => {
  it('populates process.env from a .env in the working directory', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'newspapper-dotenv-'));
    const cwd = process.cwd();
    const probe = 'NEWSPAPPER_DOTENV_PROBE';
    delete process.env[probe];

    try {
      writeFileSync(join(dir, '.env'), `${probe}=loaded\n`);
      process.chdir(dir);

      // Dynamic, and this file imports ./config.js nowhere else — vitest gives
      // each test file its own module registry, so this evaluation is the first
      // and dotenv actually runs against the cwd set above.
      await import('./config.js');

      expect(process.env[probe]).toBe('loaded');
    } finally {
      process.chdir(cwd);
      delete process.env[probe];
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('is imported by the core barrel, which is how the api gets it', () => {
    const barrel = readFileSync(fileURLToPath(new URL('../index.ts', import.meta.url)), 'utf8');
    expect(barrel).toMatch(/^import '\.\/util\/config\.js';$/m);
  });
});
