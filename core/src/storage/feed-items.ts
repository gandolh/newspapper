import type { DB } from './db.js';
import type { Article, FeedItem, FeedItemPage, FeedItemSummary, ReaderCounts } from '../types.js';
import { stripHtml } from '../scrape/body.js';
import { saveArticle } from './articles.js';
import { normalizeCategory } from './sources.js';

/*
 * The Reader's stored items (schema v6, brief 105). An item is a feed entry
 * kept for reading; it becomes an `articles` row only when saved. Both are
 * keyed on `(source_id, guid)` with `guid` = the item's URL, so "saved" is a
 * lookup, never a copy of state.
 */

/** An item to store, as `fetchFeedConditional` produces it. */
export interface NewFeedItem {
  title: string;
  url: string;
  author?: string | null;
  contentHtml?: string;
  publishedAt?: string | null;
}

/** `content_html` is capped at insert: a feed can embed a whole site in one
 * item, and the reading pane needs none of that. */
export const MAX_CONTENT_HTML_BYTES = 256 * 1024;

/** Characters in a list excerpt, the ellipsis included. */
export const EXCERPT_MAX_CHARS = 200;

/** The newest items a source always keeps, however old. */
export const KEEP_NEWEST_PER_SOURCE = 50;

/** Page size bounds for `listFeedItems`. */
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

/** Cut `html` to at most `maxBytes` of UTF-8, never inside a character. The
 * markup may end mid-tag; the UI's sanitizer closes what it keeps. */
export function capUtf8(html: string, maxBytes: number = MAX_CONTENT_HTML_BYTES): string {
  const bytes = Buffer.from(html, 'utf8');
  if (bytes.byteLength <= maxBytes) return html;
  let end = maxBytes;
  // Back off continuation bytes (10xxxxxx) to the start of a character.
  while (end > 0 && (bytes[end]! & 0xc0) === 0x80) end -= 1;
  return bytes.subarray(0, end).toString('utf8');
}

/** Only absolute http(s) links are stored: the URL becomes an `href` in the
 * reading pane, and a feed chooses it. */
function isHttpUrl(raw: string): boolean {
  try {
    const { protocol } = new URL(raw);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** The earlier of the feed's date and the fetch time, so a future-dated item
 * cannot pin itself to the top of the timeline. Undated → the fetch time. */
function sortAtFor(publishedAt: string | null, fetchedAt: string): string {
  if (!publishedAt) return fetchedAt;
  const published = Date.parse(publishedAt);
  if (Number.isNaN(published)) return fetchedAt;
  return published < Date.parse(fetchedAt) ? new Date(published).toISOString() : fetchedAt;
}

/**
 * Store a source's items. New `(source_id, guid)` pairs are inserted, known
 * ones are left exactly as they are (`ON CONFLICT DO NOTHING`), so read state
 * and the first fetch time survive every refresh. Items without an absolute
 * http(s) link are skipped. Returns how many rows were inserted.
 */
export function insertFeedItems(
  db: DB,
  sourceId: string,
  items: readonly NewFeedItem[],
  fetchedAt: string,
): number {
  const insert = db.prepare(
    `INSERT INTO feed_items
       (source_id, guid, title, url, author, content_html, content_text,
        published_at, fetched_at, sort_at)
     VALUES
       (@source_id, @guid, @title, @url, @author, @content_html, @content_text,
        @published_at, @fetched_at, @sort_at)
     ON CONFLICT (source_id, guid) DO NOTHING`,
  );
  let inserted = 0;
  db.transaction(() => {
    for (const item of items) {
      if (typeof item.url !== 'string' || !isHttpUrl(item.url)) continue;
      const html = capUtf8(item.contentHtml ?? '');
      const publishedAt = item.publishedAt ?? null;
      const r = insert.run({
        source_id: sourceId,
        guid: item.url,
        title: typeof item.title === 'string' ? item.title : '',
        url: item.url,
        author: item.author ?? null,
        content_html: html,
        content_text: stripHtml(html),
        published_at: publishedAt,
        fetched_at: fetchedAt,
        sort_at: sortAtFor(publishedAt, fetchedAt),
      });
      inserted += r.changes;
    }
  })();
  return inserted;
}

// ---- The `q` filter ----

/**
 * The connections that have `np_lower`. SQLite's `lower()` and `LIKE` fold
 * ASCII only, so `ș` would never match `Ș`; the filter lower-cases in JS
 * instead, the way Search's keyword match does (`toLowerCase`).
 */
const withLower = new WeakSet<DB>();

function ensureLower(db: DB): void {
  if (withLower.has(db)) return;
  db.function('np_lower', { deterministic: true }, (value: unknown) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  );
  withLower.add(db);
}

/** The locked keyword rule's terms: comma-separated, trimmed, blanks dropped,
 * lower-cased. */
export function filterTerms(q: string | undefined): string[] {
  if (!q) return [];
  return q
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

// ---- Listing ----

export type FeedItemScope = 'unread' | 'all';

export interface FeedItemQuery {
  /** `unread` (only items never marked read) or `all`. Default `all`. */
  scope?: FeedItemScope;
  sourceId?: string;
  /** A source category. `null` (or a blank string) selects uncategorized sources. */
  category?: string | null;
  /**
   * The locked keyword rule: comma-separated terms, OR'd, each a
   * case-insensitive substring of the title or `content_text`. `%` and `_` are
   * plain text. Order stays chronological.
   */
  q?: string;
  /** `nextCursor` from the previous page. */
  cursor?: string | null;
  /** Page size, 1–200. Default 50. */
  limit?: number;
}

/** A cursor that did not come from `listFeedItems`. */
export class InvalidCursorError extends Error {
  constructor() {
    super('Invalid cursor');
    this.name = 'InvalidCursorError';
  }
}

function encodeCursor(sortAt: string, id: number): string {
  return Buffer.from(JSON.stringify([sortAt, id]), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): { sortAt: string; id: number } {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      typeof parsed[0] === 'string' &&
      Number.isInteger(parsed[1])
    ) {
      return { sortAt: parsed[0], id: parsed[1] as number };
    }
  } catch {
    // fall through
  }
  throw new InvalidCursorError();
}

/** The SQL and params selecting items by source and/or category. */
function scopeClauses(
  where: string[],
  params: Record<string, unknown>,
  filter: { sourceId?: string; category?: string | null },
): void {
  if (filter.sourceId !== undefined) {
    where.push('fi.source_id = @sourceId');
    params['sourceId'] = filter.sourceId;
  }
  if (filter.category !== undefined) {
    const category = normalizeCategory(filter.category);
    if (category === null) {
      where.push('fi.source_id IN (SELECT id FROM sources WHERE category IS NULL)');
    } else {
      where.push('fi.source_id IN (SELECT id FROM sources WHERE category = @category)');
      params['category'] = category;
    }
  }
}

const SAVED_SQL = `EXISTS (SELECT 1 FROM articles a WHERE a.source_id = fi.source_id AND a.guid = fi.guid)`;

interface SummaryRow {
  id: number;
  source_id: string;
  source_name: string;
  title: string;
  url: string;
  author: string | null;
  published_at: string | null;
  sort_at: string;
  read_at: string | null;
  saved: number;
  excerpt_head: string;
}

/** At most `EXCERPT_MAX_CHARS` UTF-16 units, cut on a character boundary. */
function excerptOf(text: string): string {
  if (text.length <= EXCERPT_MAX_CHARS) return text;
  let out = '';
  for (const ch of text) {
    if (out.length + ch.length > EXCERPT_MAX_CHARS - 1) break;
    out += ch;
  }
  return `${out.trimEnd()}…`;
}

function rowToSummary(r: SummaryRow): FeedItemSummary {
  return {
    id: r.id,
    sourceId: r.source_id,
    sourceName: r.source_name,
    title: r.title,
    url: r.url,
    author: r.author,
    publishedAt: r.published_at,
    sortAt: r.sort_at,
    read: r.read_at !== null,
    saved: r.saved !== 0,
    excerpt: excerptOf(r.excerpt_head),
  };
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(limit)));
}

/**
 * The Reader's list: newest first by `(sort_at, id)`, keyset-paginated so a
 * page boundary holds still while items are marked read or new ones arrive.
 * Summaries only: the HTML is never selected, and `content_text` only as far
 * as the excerpt needs. Throws `InvalidCursorError` on a forged cursor.
 */
export function listFeedItems(db: DB, query: FeedItemQuery = {}): FeedItemPage {
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (query.scope === 'unread') where.push('fi.read_at IS NULL');
  scopeClauses(where, params, query);

  const terms = filterTerms(query.q);
  if (terms.length > 0) {
    ensureLower(db);
    // `instr`, not LIKE: there are no wildcards to escape, so `%` and `_` are
    // matched as the characters they are.
    const ors = terms.map((term, i) => {
      params[`term${i}`] = term;
      return `instr(np_lower(fi.title), @term${i}) > 0 OR instr(np_lower(fi.content_text), @term${i}) > 0`;
    });
    where.push(`(${ors.join(' OR ')})`);
  }

  if (query.cursor) {
    const cursor = decodeCursor(query.cursor);
    where.push('(fi.sort_at, fi.id) < (@cursorSortAt, @cursorId)');
    params['cursorSortAt'] = cursor.sortAt;
    params['cursorId'] = cursor.id;
  }

  const limit = clampLimit(query.limit);
  params['limitPlusOne'] = limit + 1;

  const rows = db
    .prepare(
      `SELECT fi.id, fi.source_id, s.name AS source_name, fi.title, fi.url, fi.author,
              fi.published_at, fi.sort_at, fi.read_at,
              substr(fi.content_text, 1, ${EXCERPT_MAX_CHARS + 1}) AS excerpt_head,
              ${SAVED_SQL} AS saved
         FROM feed_items fi
         JOIN sources s ON s.id = fi.source_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY fi.sort_at DESC, fi.id DESC
        LIMIT @limitPlusOne`,
    )
    .all(params) as SummaryRow[];

  const more = rows.length > limit;
  const page = more ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    items: page.map(rowToSummary),
    nextCursor: more && last ? encodeCursor(last.sort_at, last.id) : null,
  };
}

interface ItemRow extends Omit<SummaryRow, 'excerpt_head'> {
  guid: string;
  content_html: string;
  content_text: string;
  fetched_at: string;
  article_id: number | null;
}

/** One item in full. No side effect: opening an item is a separate write
 * (`setFeedItemRead`). */
export function getFeedItem(db: DB, id: number): FeedItem | undefined {
  const r = db
    .prepare(
      `SELECT fi.id, fi.source_id, s.name AS source_name, fi.guid, fi.title, fi.url, fi.author,
              fi.content_html, fi.content_text, fi.published_at, fi.fetched_at, fi.sort_at,
              fi.read_at, ${SAVED_SQL} AS saved,
              (SELECT a.id FROM articles a
                WHERE a.source_id = fi.source_id AND a.guid = fi.guid) AS article_id
         FROM feed_items fi
         JOIN sources s ON s.id = fi.source_id
        WHERE fi.id = ?`,
    )
    .get(id) as ItemRow | undefined;
  if (!r) return undefined;
  return {
    id: r.id,
    sourceId: r.source_id,
    sourceName: r.source_name,
    guid: r.guid,
    title: r.title,
    url: r.url,
    author: r.author,
    contentHtml: r.content_html,
    contentText: r.content_text,
    publishedAt: r.published_at,
    fetchedAt: r.fetched_at,
    sortAt: r.sort_at,
    readAt: r.read_at,
    read: r.read_at !== null,
    saved: r.saved !== 0,
    articleId: r.article_id,
  };
}

// ---- Read state ----

/** Mark one item read or unread. Marking a read item read keeps its first
 * `read_at`. Returns `false` if there is no such item. */
export function setFeedItemRead(
  db: DB,
  id: number,
  read: boolean,
  now: Date = new Date(),
): boolean {
  const r = read
    ? db
        .prepare('UPDATE feed_items SET read_at = COALESCE(read_at, ?) WHERE id = ?')
        .run(now.toISOString(), id)
    : db.prepare('UPDATE feed_items SET read_at = NULL WHERE id = ?').run(id);
  return r.changes > 0;
}

export interface MarkReadScope {
  /** The highest id the list had loaded. Items with a larger id arrived after
   * it and stay unread. Ids are AUTOINCREMENT, so this holds across purges. */
  upToId: number;
  sourceId?: string;
  /** A category; `null` (or blank) means uncategorized sources. */
  category?: string | null;
}

/** Mark every unread item with `id <= upToId` read, within a source or a
 * category when given. Returns how many items changed. */
export function markFeedItemsRead(db: DB, scope: MarkReadScope, now: Date = new Date()): number {
  const where = ['fi.read_at IS NULL', 'fi.id <= @upToId'];
  const params: Record<string, unknown> = { upToId: scope.upToId, now: now.toISOString() };
  scopeClauses(where, params, scope);
  const r = db
    .prepare(`UPDATE feed_items AS fi SET read_at = @now WHERE ${where.join(' AND ')}`)
    .run(params);
  return r.changes;
}

/** Unread per source (every source, zeros included) and in total, plus the
 * count of every stored item. */
export function getReaderCounts(db: DB): ReaderCounts {
  const perSource = db
    .prepare(
      `SELECT s.id AS id, COUNT(fi.id) AS n
         FROM sources s
         LEFT JOIN feed_items fi ON fi.source_id = s.id AND fi.read_at IS NULL
        GROUP BY s.id`,
    )
    .all() as Array<{ id: string; n: number }>;
  const all = db.prepare('SELECT COUNT(*) AS n FROM feed_items').get() as { n: number };
  const unreadBySource: Record<string, number> = {};
  let unread = 0;
  for (const row of perSource) {
    unreadBySource[row.id] = row.n;
    unread += row.n;
  }
  return { unread, all: all.n, unreadBySource };
}

// ---- Purge ----

export interface PurgeOptions {
  /** Items fetched longer ago than this are deleted. */
  retentionDays: number;
  /** Except each source's newest this-many by `sort_at`. Default 50. */
  keepPerSource?: number;
  now?: Date;
}

/**
 * Delete items whose `fetched_at` is older than the retention window, except
 * each source's newest `keepPerSource` in timeline (`sort_at`) order, so a
 * quiet feed never empties. Saved items live on in `articles`, so purging one
 * loses nothing. Returns how many rows were deleted.
 */
export function purgeFeedItems(db: DB, opts: PurgeOptions): number {
  const now = opts.now ?? new Date();
  const cutoff = new Date(now.getTime() - opts.retentionDays * 24 * 60 * 60 * 1000);
  const r = db
    .prepare(
      `DELETE FROM feed_items
        WHERE fetched_at < @cutoff
          AND id NOT IN (
            SELECT id FROM (
              SELECT id, ROW_NUMBER() OVER (
                       PARTITION BY source_id ORDER BY sort_at DESC, id DESC
                     ) AS rn
                FROM feed_items
            ) WHERE rn <= @keep
          )`,
    )
    .run({
      cutoff: cutoff.toISOString(),
      keep: opts.keepPerSource ?? KEEP_NEWEST_PER_SOURCE,
    });
  return r.changes;
}

// ---- Saving to the library ----

/**
 * Save an item to the library as an article: `guid` = its URL, the same key
 * Search uses, so the item then lists as `saved`. Idempotent: saving again
 * returns the existing article unchanged (edit its note with
 * `updateArticleNote`). `undefined` if there is no such item.
 */
export function saveFeedItemToLibrary(
  db: DB,
  id: number,
  opts: { note?: string } = {},
): Article | undefined {
  const item = getFeedItem(db, id);
  if (!item) return undefined;
  return saveArticle(db, {
    sourceId: item.sourceId,
    sourceName: item.sourceName,
    guid: item.url,
    title: item.title,
    url: item.url,
    body: item.contentText,
    publishedAt: item.publishedAt ?? item.sortAt,
    note: opts.note,
  });
}
