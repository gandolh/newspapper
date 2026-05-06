import { describe, it, expect } from 'vitest';
import { resolveDestination, formatExportSummary } from './export.js';
import { join } from 'path';

describe('resolveDestination', () => {
  it('returns absolute paths unchanged', () => {
    expect(resolveDestination('/tmp/export')).toBe('/tmp/export');
  });

  it('resolves relative paths against cwd', () => {
    const result = resolveDestination('./exported');
    expect(result).toBe(join(process.cwd(), 'exported'));
  });

  it('resolves bare names against cwd', () => {
    const result = resolveDestination('myexport');
    expect(result).toBe(join(process.cwd(), 'myexport'));
  });
});

describe('formatExportSummary', () => {
  it('includes destination, file count, and each filename', () => {
    const result = formatExportSummary('/dest/path', ['01-title.png', '02-body.png']);
    expect(result).toContain('/dest/path');
    expect(result).toContain('2 images');
    expect(result).toContain('01-title.png');
    expect(result).toContain('02-body.png');
    expect(result).toContain('metadata.json');
    expect(result).toContain('summary.json');
  });

  it('handles a single image', () => {
    const result = formatExportSummary('/out', ['01-title.png']);
    expect(result).toContain('1 images');
  });
});
