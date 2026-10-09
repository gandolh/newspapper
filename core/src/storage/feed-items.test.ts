import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDb, type DB } from './db.js';
import { saveSources } from './sources.js';
import { countArticles, findArticle, saveArticle, updateArticleNote } from './articles.js';
import {
  capUtf8,
  getFeedItem,
  getReaderCounts,
  insertFeedItems,
  InvalidCursorError,
  listFeedItems,
  markFeedItemsRead,
  MAX_CONTENT_HTML_BYTES,
  purgeFeedItems,
  saveFeedItemToLibrary,
  setFeedItemRead,
  type NewFeedItem,
} from './feed-items.js';

let tmp: string;
let db: DB;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'np-feed-items-'));
  db = getDb(join(tmp, 'test.db'));
  saveSources(
    [
      {
        id: 'bbc',
        name: 'BBC News',
        rss: 'https://bbc.co.uk/rss',
        enabled: true,
        category: 'World',
      },
      {
        id: 'hot',
        name: 'HotNews',
        rss: 'https://hotnews.ro/rss',
        enabled: true,
        category: 'Romania',
      },
      { id: 'blog', name: 'A Blog', rss: 'https://blog.example/rss', enabled: true },
    ],
    db,
  );
});

afterEach(() => {
  db.close();
  rmSync(tmp, { recursive: true, force: true });
});

const FETCHED = '2026-10-05T12:00:00.000Z';

/** An item dated `day` days into October 2026, so order is easy to read. */
function item(slug: string, day: number, extra: Partial<NewFeedItem> = {}): NewFeedItem {
  return {
    title: `Item ${slug}`,
    url: `https://news.example/${slug}`,
    contentHtml: `<p>Body of ${slug}</p>`,
    publishedAt: `2026-10-0${day}T10:00:00.000Z`,
    ...extra,
  };
}

function idOf(url: string): number {
  return (db.prepare('SELECT id FROM feed_items WHERE url = ?').get(url) as { id: number }).id;
}

describe('insertFeedItems', () => {
  it('keys an item on its URL and skips known ones (ON CONFLICT DO NOTHING)', () => {
    expect(insertFeedItems(db, 'bbc', [item('a', 1), item('b', 2)], FETCHED)).toBe(2);
    setFeedItemRead(db, idOf('https://news.example/a'), true);
    expect(
      insertFeedItems(db, 'bbc', [item('a', 1, { title: 'Edited' }), item('c', 3)], FETCHED),
    ).toBe(1);
    const a = getFeedItem(db, idOf('https://news.example/a'))!;
    expect(a.guid).toBe('https://news.example/a');
    expect(a.title).toBe('Item a'); // the stored row is untouched
    expect(a.read).toBe(true); // and so is its read state
  });

  it('the same URL under another source is another item', () => {
    insertFeedItems(db, 'bbc', [item('a', 1)], FETCHED);
    expect(insertFeedItems(db, 'hot', [item('a', 1)], FETCHED)).toBe(1);
  });

  it('stores content_text as stripHtml of the HTML', () => {
    insertFeedItems(
      db,
      'bbc',
      [item('a', 1, { contentHtml: '<p>Hello <b>world</b> &amp; co</p>' })],
      FETCHED,
    );
    const a = getFeedItem(db, idOf('https://news.example/a'))!;
    expect(a.contentHtml).toBe('<p>Hello <b>world</b> &amp; co</p>');
    expect(a.contentText).toBe('Hello world & co');
  });

  it('caps content_html at 256 KB of UTF-8, never splitting a character', () => {
    const huge = `<p>${'ș'.repeat(200 * 1024)}</p>`; // ~400 KB: ș is two bytes
    insertFeedItems(db, 'bbc', [item('big', 1, { contentHtml: huge })], FETCHED);
    const big = getFeedItem(db, idOf('https://news.example/big'))!;
    expect(Buffer.byteLength(big.contentHtml, 'utf8')).toBeLessThanOrEqual(MAX_CONTENT_HTML_BYTES);
    expect(big.contentHtml).not.toContain('�');
    expect(big.contentText.startsWith('ș')).toBe(true);
    expect(capUtf8('short')).toBe('short');
  });

  it('skips items whose link is not an absolute http(s) URL', () => {
    const n = insertFeedItems(
      db,
      'bbc',
      [
        item('ok', 1),
        { title: 'js', url: 'javascript:alert(1)' },
        { title: 'data', url: 'data:text/html,<b>x</b>' },
        { title: 'relative', url: '/2026/10/x' },
      ],
      FETCHED,
    );
    expect(n).toBe(1);
  });

  it('sorts an item at the earlier of its date and the fetch time; undated at the fetch time', () => {
    insertFeedItems(
      db,
      'bbc',
      [
        item('past', 1),
        { title: 'undated', url: 'https://news.example/undated', publishedAt: null },
        {
          title: 'future',
          url: 'https://news.example/future',
          publishedAt: '2100-01-01T00:00:00.000Z',
        },
      ],
      FETCHED,
    );
    expect(getFeedItem(db, idOf('https://news.example/past'))!.sortAt).toBe(
      '2026-10-01T10:00:00.000Z',
    );
    const undated = getFeedItem(db, idOf('https://news.example/undated'))!;
    expect(undated.publishedAt).toBeNull();
    expect(undated.sortAt).toBe(FETCHED);
    const future = getFeedItem(db, idOf('https://news.example/future'))!;
    expect(future.publishedAt).toBe('2100-01-01T00:00:00.000Z');
    expect(future.sortAt).toBe(FETCHED);
  });
});

describe('listFeedItems', () => {
  it('returns summaries with no content_html, newest first, with read, saved and an excerpt', () => {
    const long = `<p>${'word '.repeat(100)}</p>`;
    insertFeedItems(db, 'bbc', [item('a', 1), item('b', 2, { contentHtml: long })], FETCHED);
    const page = listFeedItems(db);
    expect(page.items.map((i) => i.title)).toEqual(['Item b', 'Item a']);
    for (const summary of page.items) {
      expect(Object.keys(summary).sort()).toEqual(
        [
          'author',
          'excerpt',
          'id',
          'publishedAt',
          'read',
          'saved',
          'sortAt',
          'sourceId',
          'sourceName',
          'title',
          'url',
        ].sort(),
      );
      expect(JSON.stringify(summary)).not.toContain('<p>');
      expect(summary.excerpt.length).toBeLessThanOrEqual(200);
    }
    expect(page.items[0]!.excerpt.endsWith('…')).toBe(true);
    expect(page.items[1]).toMatchObject({
      sourceName: 'BBC News',
      read: false,
      saved: false,
      excerpt: 'Body of a',
    });
    expect(page.nextCursor).toBeNull();
  });

  it('pages with a keyset cursor on (sort_at, id), stable across ties', () => {
    // Three share a sort_at (undated, one fetch), two are dated earlier.
    insertFeedItems(
      db,
      'bbc',
      [
        { title: 'u1', url: 'https://news.example/u1' },
        { title: 'u2', url: 'https://news.example/u2' },
        { title: 'u3', url: 'https://news.example/u3' },
        item('d1', 1),
        item('d2', 2),
      ],
      FETCHED,
    );
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = listFeedItems(db, { limit: 2, cursor });
      seen.push(...page.items.map((i) => i.title));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor);
    expect(pages).toBe(3);
    expect(seen).toEqual(['u3', 'u2', 'u1', 'Item d2', 'Item d1']);
  });

  it('rejects a cursor it did not make', () => {
    expect(() => listFeedItems(db, { cursor: 'not-a-cursor' })).toThrow(InvalidCursorError);
    const forged = Buffer.from(JSON.stringify({ a: 1 })).toString('base64url');
    expect(() => listFeedItems(db, { cursor: forged })).toThrow(InvalidCursorError);
  });

  it('filters by scope, source and category (null = uncategorized)', () => {
    insertFeedItems(db, 'bbc', [item('w', 1)], FETCHED);
    insertFeedItems(db, 'hot', [item('r', 2)], FETCHED);
    insertFeedItems(db, 'blog', [item('x', 3)], FETCHED);
    setFeedItemRead(db, idOf('https://news.example/w'), true);

    const titles = (q: Parameters<typeof listFeedItems>[1]) =>
      listFeedItems(db, q).items.map((i) => i.title);
    expect(titles({ scope: 'all' })).toEqual(['Item x', 'Item r', 'Item w']);
    expect(titles({ scope: 'unread' })).toEqual(['Item x', 'Item r']);
    expect(titles({ sourceId: 'hot' })).toEqual(['Item r']);
    expect(titles({ category: 'World' })).toEqual(['Item w']);
    expect(titles({ category: 'World', scope: 'unread' })).toEqual([]);
    expect(titles({ category: null })).toEqual(['Item x']);
    expect(titles({ category: '' })).toEqual(['Item x']);
  });

  describe('the q filter (the locked keyword rule)', () => {
    beforeEach(() => {
      insertFeedItems(
        db,
        'hot',
        [
          { title: 'ȘTIRI de azi', url: 'https://hotnews.ro/1', contentHtml: '<p>politică</p>' },
          { title: 'Sport', url: 'https://hotnews.ro/2', contentHtml: '<p>Meci la Iași</p>' },
          { title: 'Reduceri 50% azi', url: 'https://hotnews.ro/3', contentHtml: '' },
          { title: 'Reduceri 500 azi', url: 'https://hotnews.ro/4', contentHtml: '' },
          { title: 'file_name', url: 'https://hotnews.ro/5', contentHtml: '' },
          { title: 'filexname', url: 'https://hotnews.ro/6', contentHtml: '' },
        ],
        FETCHED,
      );
    });
    const match = (q: string) =>
      listFeedItems(db, { q })
        .items.map((i) => i.title)
        .sort();

    it('folds non-ASCII case: ș matches Ș, and IAȘI matches Iași in the body', () => {
      expect(match('știri')).toEqual(['ȘTIRI de azi']);
      expect(match('IAȘI')).toEqual(['Sport']);
    });

    it('ORs comma-separated terms, trimmed, blanks ignored', () => {
      expect(match(' știri , iași ,, ')).toEqual(['Sport', 'ȘTIRI de azi']);
      expect(match(' , ')).toHaveLength(6);
    });

    it('is a bare substring over title and content_text', () => {
      expect(match('politic')).toEqual(['ȘTIRI de azi']);
    });

    it('treats % and _ as literal text', () => {
      expect(match('50%')).toEqual(['Reduceri 50% azi']);
      expect(match('file_name')).toEqual(['file_name']);
      expect(match('%')).toEqual(['Reduceri 50% azi']);
      expect(match('_')).toEqual(['file_name']);
    });

    it('keeps chronological order rather than ranking', () => {
      const ordered = listFeedItems(db, { q: 'azi' }).items.map((i) => i.title);
      // Same sort_at (undated, one fetch), so newest id first.
      expect(ordered).toEqual(['Reduceri 500 azi', 'Reduceri 50% azi', 'ȘTIRI de azi']);
    });
  });
});

describe('read state', () => {
  it('getFeedItem has no side effect; setFeedItemRead toggles', () => {
    insertFeedItems(db, 'bbc', [item('a', 1)], FETCHED);
    const id = idOf('https://news.example/a');
    expect(getFeedItem(db, id)!.read).toBe(false);
    expect(getFeedItem(db, id)!.read).toBe(false);
    expect(setFeedItemRead(db, id, true, new Date('2026-10-06T00:00:00.000Z'))).toBe(true);
    expect(getFeedItem(db, id)!.readAt).toBe('2026-10-06T00:00:00.000Z');
    // Marking it read again keeps the first read time.
    setFeedItemRead(db, id, true, new Date('2026-10-07T00:00:00.000Z'));
    expect(getFeedItem(db, id)!.readAt).toBe('2026-10-06T00:00:00.000Z');
    expect(setFeedItemRead(db, id, false)).toBe(true);
    expect(getFeedItem(db, id)!.read).toBe(false);
    expect(setFeedItemRead(db, 99999, true)).toBe(false);
    expect(getFeedItem(db, 99999)).toBeUndefined();
  });

  it('mark-read with upToId leaves an item inserted after the list loaded unread', () => {
    insertFeedItems(db, 'bbc', [item('a', 1), item('b', 2)], FETCHED);
    const loaded = listFeedItems(db, { scope: 'unread' }).items;
    const upToId = Math.max(...loaded.map((i) => i.id));

    // A refresh lands while the list is on screen.
    insertFeedItems(db, 'bbc', [item('late', 3)], FETCHED);

    expect(markFeedItemsRead(db, { upToId })).toBe(2);
    const unread = listFeedItems(db, { scope: 'unread' }).items.map((i) => i.title);
    expect(unread).toEqual(['Item late']);
  });

  it('mark-read is scoped by source or category', () => {
    insertFeedItems(db, 'bbc', [item('w', 1)], FETCHED);
    insertFeedItems(db, 'hot', [item('r', 2)], FETCHED);
    insertFeedItems(db, 'blog', [item('x', 3)], FETCHED);
    const upToId = idOf('https://news.example/x');

    expect(markFeedItemsRead(db, { upToId, sourceId: 'hot' })).toBe(1);
    expect(markFeedItemsRead(db, { upToId, category: 'World' })).toBe(1);
    expect(listFeedItems(db, { scope: 'unread' }).items.map((i) => i.title)).toEqual(['Item x']);
    expect(markFeedItemsRead(db, { upToId, category: null })).toBe(1);
    expect(listFeedItems(db, { scope: 'unread' }).items).toEqual([]);
  });

  it('a purged id is never reused, so upToId stays honest', () => {
    insertFeedItems(db, 'bbc', [item('a', 1)], '2026-01-01T00:00:00.000Z');
    const first = idOf('https://news.example/a');
    purgeFeedItems(db, { retentionDays: 30, keepPerSource: 0, now: new Date(FETCHED) });
    insertFeedItems(db, 'bbc', [item('b', 2)], FETCHED);
    expect(idOf('https://news.example/b')).toBeGreaterThan(first);
  });

  it('counts unread per source (zeros included), in total, and every item', () => {
    insertFeedItems(db, 'bbc', [item('a', 1), item('b', 2)], FETCHED);
    insertFeedItems(db, 'hot', [item('c', 3)], FETCHED);
    setFeedItemRead(db, idOf('https://news.example/a'), true);
    expect(getReaderCounts(db)).toEqual({
      unread: 2,
      all: 3,
      unreadBySource: { bbc: 1, hot: 1, blog: 0 },
    });
  });
});

describe('purgeFeedItems', () => {
  const NOW = new Date('2026-10-09T00:00:00.000Z');
  const OLD = '2026-08-01T00:00:00.000Z'; // ~69 days before NOW
  const RECENT = '2026-10-08T00:00:00.000Z';

  /** `n` items for a source, each dated a minute apart, newest last. */
  function many(source: string, n: number, fetchedAt: string) {
    const rows: NewFeedItem[] = Array.from({ length: n }, (_, i) => ({
      title: `${source}-${i}`,
      url: `https://${source}.example/${i}`,
      publishedAt: new Date(Date.parse('2026-07-01T00:00:00.000Z') + i * 60_000).toISOString(),
    }));
    insertFeedItems(db, source, rows, fetchedAt);
  }
  const titles = (source: string) =>
    (
      db
        .prepare('SELECT title FROM feed_items WHERE source_id = ? ORDER BY id')
        .all(source) as Array<{
        title: string;
      }>
    ).map((r) => r.title);

  it('keeps the newest 50 per source and deletes the rest past the window', () => {
    many('bbc', 60, OLD); // 10 too many, all old
    many('hot', 5, OLD); // old, but under the floor
    many('blog', 3, RECENT); // inside the window

    const deleted = purgeFeedItems(db, { retentionDays: 30, now: NOW });

    expect(deleted).toBe(10);
    const bbc = titles('bbc');
    expect(bbc).toHaveLength(50);
    expect(bbc[0]).toBe('bbc-10'); // the ten oldest went
    expect(bbc[49]).toBe('bbc-59');
    expect(titles('hot')).toHaveLength(5);
    expect(titles('blog')).toHaveLength(3);
  });

  it('keeps everything inside the window, however many', () => {
    many('bbc', 60, RECENT);
    expect(purgeFeedItems(db, { retentionDays: 30, now: NOW })).toBe(0);
    expect(titles('bbc')).toHaveLength(60);
  });

  it('a purged item that was saved lives on in the library', () => {
    insertFeedItems(db, 'bbc', [item('kept', 1)], OLD);
    const article = saveFeedItemToLibrary(db, idOf('https://news.example/kept'))!;
    purgeFeedItems(db, { retentionDays: 30, keepPerSource: 0, now: NOW });
    expect(db.prepare('SELECT COUNT(*) AS n FROM feed_items').get()).toEqual({ n: 0 });
    expect(findArticle(db, article.id)?.title).toBe('Item kept');
  });
});

describe('saving an item to the library', () => {
  it('writes articles.guid = url, and the list then shows the item as saved', () => {
    insertFeedItems(db, 'bbc', [item('a', 1), item('b', 2)], FETCHED);
    const id = idOf('https://news.example/a');
    const article = saveFeedItemToLibrary(db, id, { note: 'for the budget post' })!;

    expect(article.guid).toBe('https://news.example/a');
    expect(article.url).toBe('https://news.example/a');
    expect(article.sourceId).toBe('bbc');
    expect(article.sourceName).toBe('BBC News');
    expect(article.body).toBe('Body of a');
    expect(article.publishedAt).toBe('2026-10-01T10:00:00.000Z');

    const saved = listFeedItems(db).items.map((i) => [i.title, i.saved]);
    expect(saved).toEqual([
      ['Item b', false],
      ['Item a', true],
    ]);
    expect(getFeedItem(db, id)).toMatchObject({ saved: true, articleId: article.id });
  });

  it('saving twice leaves one row, and the note persists', () => {
    insertFeedItems(db, 'bbc', [item('a', 1)], FETCHED);
    const id = idOf('https://news.example/a');
    const first = saveFeedItemToLibrary(db, id, { note: 'why I kept it' })!;
    const second = saveFeedItemToLibrary(db, id, { note: 'ignored on a re-save' })!;
    expect(second.id).toBe(first.id);
    expect(countArticles(db)).toBe(1);
    expect(findArticle(db, first.id)?.note).toBe('why I kept it');

    expect(updateArticleNote(db, first.id, '  edited note ')?.note).toBe('edited note');
    expect(findArticle(db, first.id)?.note).toBe('edited note');
  });

  it('an article saved the POST /api/articles way (guid omitted, url given) also marks the item saved', () => {
    insertFeedItems(db, 'bbc', [item('a', 1)], FETCHED);
    saveArticle(db, {
      sourceId: 'bbc',
      sourceName: 'BBC News',
      title: 'Item a',
      url: 'https://news.example/a',
      note: 'from the reader',
    });
    expect(listFeedItems(db).items[0]!.saved).toBe(true);
  });

  it('an undated item is saved with its sort time as the date', () => {
    insertFeedItems(db, 'bbc', [{ title: 'u', url: 'https://news.example/u' }], FETCHED);
    const article = saveFeedItemToLibrary(db, idOf('https://news.example/u'))!;
    expect(article.publishedAt).toBe(FETCHED);
    expect(article.note).toBe('');
  });

  it('returns undefined for an unknown item', () => {
    expect(saveFeedItemToLibrary(db, 12345)).toBeUndefined();
    expect(updateArticleNote(db, 12345, 'x')).toBeUndefined();
  });
});
