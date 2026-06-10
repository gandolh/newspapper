import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listSources, saveSources, addSource, updateSource, removeSource } from './sources.js';
import type { SourceConfig } from '../types.js';

let tmpDir: string;
let sourcesPath: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-sources-test-'));
  sourcesPath = join(tmpDir, 'sources.json');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

const src1: SourceConfig = { id: 'bbc', name: 'BBC News', rss: 'https://bbc.co.uk/rss', enabled: true };
const src2: SourceConfig = { id: 'cnn', name: 'CNN', rss: 'https://cnn.com/rss', enabled: false };

describe('sources — file-backed CRUD', () => {
  it('listSources returns empty array when file does not exist', () => {
    expect(listSources(sourcesPath)).toEqual([]);
  });

  it('saveSources then listSources round-trips', () => {
    saveSources([src1, src2], sourcesPath);
    const all = listSources(sourcesPath);
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe('bbc');
    expect(all[1].id).toBe('cnn');
  });

  it('addSource appends and returns all sources', () => {
    saveSources([src1], sourcesPath);
    const all = addSource(src2, sourcesPath);
    expect(all).toHaveLength(2);
    expect(listSources(sourcesPath)).toHaveLength(2);
  });

  it('addSource throws on duplicate id', () => {
    saveSources([src1], sourcesPath);
    expect(() => addSource(src1, sourcesPath)).toThrow(/already exists/);
  });

  it('updateSource patches a source', () => {
    saveSources([src1, src2], sourcesPath);
    updateSource('bbc', { name: 'BBC World', enabled: false }, sourcesPath);
    const all = listSources(sourcesPath);
    const bbc = all.find((s) => s.id === 'bbc')!;
    expect(bbc.name).toBe('BBC World');
    expect(bbc.enabled).toBe(false);
    expect(bbc.rss).toBe(src1.rss); // unchanged
  });

  it('updateSource throws when id not found', () => {
    saveSources([], sourcesPath);
    expect(() => updateSource('nonexistent', { enabled: false }, sourcesPath)).toThrow(/not found/);
  });

  it('removeSource removes by id and returns remaining', () => {
    saveSources([src1, src2], sourcesPath);
    const remaining = removeSource('bbc', sourcesPath);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('cnn');
    expect(listSources(sourcesPath)).toHaveLength(1);
  });

  it('removeSource throws when id not found', () => {
    saveSources([], sourcesPath);
    expect(() => removeSource('nonexistent', sourcesPath)).toThrow(/not found/);
  });

  it('saveSources creates parent directories if needed', () => {
    const nested = join(tmpDir, 'deep', 'nested', 'sources.json');
    saveSources([src1], nested);
    expect(listSources(nested)).toHaveLength(1);
  });
});
