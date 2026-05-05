import { describe, it, expect, beforeEach } from 'vitest';
import { ManifestManager } from './manifest.js';

describe('ManifestManager.getAll', () => {
  let manager: ManifestManager;

  beforeEach(() => {
    manager = new ManifestManager();
    (manager as unknown as { manifest: unknown }).manifest = {
      version: '1.0.0',
      articles: {
        'abc': { id: 'abc', title: 'Test', sourceId: 's1', scrapedAt: '2026-05-01T00:00:00.000Z', status: 'scraped', groupId: null, hasEntities: false },
      },
      groups: {},
      summaries: {},
    };
  });

  it('returns all articles map', () => {
    const { articles } = manager.getAll();
    expect(Object.keys(articles)).toHaveLength(1);
    expect(articles['abc'].title).toBe('Test');
  });

  it('returns empty articles when manifest not loaded', () => {
    const fresh = new ManifestManager();
    const { articles } = fresh.getAll();
    expect(articles).toEqual({});
  });
});
