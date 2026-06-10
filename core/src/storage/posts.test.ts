import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDb } from './db.js';
import { createDraft, getPost, listPosts, updatePostPayload, markRendered, deletePost } from './posts.js';
import type { PostPayload } from '../types.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'np-posts-test-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function makePayload(override: Partial<PostPayload> = {}): PostPayload {
  return {
    date: '2026-06-10',
    title: 'Test Post',
    theme: 'warm-industrial',
    slides: [],
    ...override,
  };
}

describe('posts repository', () => {
  it('createDraft → getPost round-trip', () => {
    const db = getDb(join(tmpDir, 'test.db'));
    const payload = makePayload();
    const created = createDraft(db, payload);
    expect(created.id).toBeGreaterThan(0);
    expect(created.status).toBe('draft');
    expect(created.outputDir).toBeNull();
    expect(created.payload).toEqual(payload);

    const fetched = getPost(db, created.id);
    expect(fetched).toBeDefined();
    expect(fetched!.title).toBe('Test Post');
    expect(fetched!.status).toBe('draft');
    db.close();
  });

  it('createDraft persists payload JSON correctly', () => {
    const db = getDb(join(tmpDir, 'test.db'));
    const payload = makePayload({
      slides: [{ type: 'title', variant: 'title-main', text: 'Hello', kicker: 'World' }],
      caption: 'Caption text',
      hashtags: ['#news', '#test'],
    });
    const created = createDraft(db, payload);
    const fetched = getPost(db, created.id);
    expect(fetched!.payload.slides).toHaveLength(1);
    expect(fetched!.payload.caption).toBe('Caption text');
    expect(fetched!.payload.hashtags).toEqual(['#news', '#test']);
    db.close();
  });

  it('updatePostPayload bumps updatedAt and resets to draft', async () => {
    const db = getDb(join(tmpDir, 'test.db'));
    const created = createDraft(db, makePayload());
    // small delay to ensure time difference
    await new Promise((r) => setTimeout(r, 10));
    const newPayload = makePayload({ title: 'Updated Title' });
    const updated = updatePostPayload(db, created.id, newPayload);
    expect(updated).toBeDefined();
    expect(updated!.title).toBe('Updated Title');
    expect(updated!.status).toBe('draft');
    expect(updated!.outputDir).toBeNull();
    expect(updated!.updatedAt).not.toBe(created.updatedAt);
    db.close();
  });

  it('markRendered sets status and outputDir', () => {
    const db = getDb(join(tmpDir, 'test.db'));
    const created = createDraft(db, makePayload());
    const rendered = markRendered(db, created.id, '/output/2026-06-10-1');
    expect(rendered).toBeDefined();
    expect(rendered!.status).toBe('rendered');
    expect(rendered!.outputDir).toBe('/output/2026-06-10-1');
    db.close();
  });

  it('deletePost returns the deleted row', () => {
    const db = getDb(join(tmpDir, 'test.db'));
    const created = createDraft(db, makePayload());
    const deleted = deletePost(db, created.id);
    expect(deleted).toBeDefined();
    expect(deleted!.id).toBe(created.id);
    // should be gone
    expect(getPost(db, created.id)).toBeUndefined();
    db.close();
  });

  it('deletePost returns undefined for nonexistent id', () => {
    const db = getDb(join(tmpDir, 'test.db'));
    expect(deletePost(db, 9999)).toBeUndefined();
    db.close();
  });

  it('listPosts returns newest first (ordered by id DESC)', () => {
    const db = getDb(join(tmpDir, 'test.db'));
    const p1 = createDraft(db, makePayload({ title: 'First' }));
    const p2 = createDraft(db, makePayload({ title: 'Second' }));
    const p3 = createDraft(db, makePayload({ title: 'Third' }));
    const list = listPosts(db);
    expect(list).toHaveLength(3);
    // newest (highest id) should be first
    expect(list[0].id).toBe(p3.id);
    expect(list[list.length - 1].id).toBe(p1.id);
    db.close();
  });

  it('full round-trip: create → update → markRendered → delete', () => {
    const db = getDb(join(tmpDir, 'test.db'));
    // Create
    const created = createDraft(db, makePayload({ title: 'Initial' }));
    expect(created.status).toBe('draft');

    // Update payload
    const updated = updatePostPayload(db, created.id, makePayload({ title: 'Revised' }));
    expect(updated!.title).toBe('Revised');
    expect(updated!.status).toBe('draft');

    // Mark rendered
    const rendered = markRendered(db, created.id, '/output/test-dir');
    expect(rendered!.status).toBe('rendered');
    expect(rendered!.outputDir).toBe('/output/test-dir');

    // Delete and get the row back
    const deleted = deletePost(db, created.id);
    expect(deleted!.outputDir).toBe('/output/test-dir');
    expect(getPost(db, created.id)).toBeUndefined();

    db.close();
  });
});
