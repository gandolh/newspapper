/**
 * Brief 99: one module knows where the repo root is, and every other root is
 * derived from it, with env overrides where an operator needs one.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  dbPath,
  designSystemsDir,
  fontsDir,
  outputRoot,
  repoRoot,
  sourcesSeedPath,
  uiDistDir,
  uploadsRoot,
} from './paths.js';

const saved = { ...process.env };
afterEach(() => {
  for (const key of ['OUTPUT_DIR', 'UPLOADS_DIR', 'NEWSPAPPER_DB_PATH']) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe('repoRoot', () => {
  it('is this repository: its package.json is the newspapper root', () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot(), 'package.json'), 'utf8')) as {
      name: string;
    };
    expect(pkg.name).toBe('newspapper');
  });
});

describe('defaults', () => {
  it('derive every directory from the one root', () => {
    delete process.env['OUTPUT_DIR'];
    delete process.env['UPLOADS_DIR'];
    delete process.env['NEWSPAPPER_DB_PATH'];
    const root = repoRoot();
    expect(outputRoot()).toBe(join(root, 'output'));
    expect(uploadsRoot()).toBe(join(root, 'uploads'));
    expect(dbPath()).toBe(join(root, 'data', 'newspapper.db'));
    expect(sourcesSeedPath()).toBe(join(root, 'data', 'sources.json'));
    expect(fontsDir()).toBe(join(root, 'assets', 'fonts'));
    expect(designSystemsDir()).toBe(join(root, 'assets', 'design-systems'));
    expect(uiDistDir()).toBe(join(root, 'ui', 'dist'));
  });
});

describe('overrides', () => {
  it('OUTPUT_DIR and UPLOADS_DIR take absolute paths as given and relative ones from the repo root', () => {
    process.env['OUTPUT_DIR'] = '/srv/out';
    process.env['UPLOADS_DIR'] = 'var/uploads';
    expect(outputRoot()).toBe(resolve('/srv/out'));
    expect(uploadsRoot()).toBe(join(repoRoot(), 'var', 'uploads'));
  });

  it('a blank override falls back to the default', () => {
    process.env['OUTPUT_DIR'] = '   ';
    expect(outputRoot()).toBe(join(repoRoot(), 'output'));
  });

  it('NEWSPAPPER_DB_PATH overrides the database path', () => {
    process.env['NEWSPAPPER_DB_PATH'] = '/tmp/x.db';
    expect(dbPath()).toBe(resolve('/tmp/x.db'));
  });
});
