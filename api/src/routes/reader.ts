import type { FastifyPluginAsync } from 'fastify';
import {
  listFeedItems,
  getFeedItem,
  setFeedItemRead,
  markFeedItemsRead,
  getReaderCounts,
  saveFeedItemToLibrary,
  refreshSources,
  getSource,
  InvalidCursorError,
} from '@newspapper/core';
import type { RefreshOptions } from '@newspapper/core';
import { sseHeaders, sseWrite, sseDone, sseError } from '../lib/sse.js';
import { db } from '../lib/db.js';

/*
 * The Reader (brief 105): stored feed items, read in place. An **Item** lives
 * in `feed_items`; it becomes an **Article** only when saved to the library,
 * keyed on the same `(source_id, guid)` with `guid` = the item's URL.
 *
 * Every route here sits under `/api/`, so the Ward guard covers it by prefix.
 */

export interface ReaderRoutesOptions {
  /** Passed to every refresh this route starts. Tests inject fetch and DNS
   * here, so a refresh never reaches the network. */
  refresh?: Pick<RefreshOptions, 'deps' | 'now'>;
}

/** A path id as a positive integer, or `null`: better-sqlite3 must never be
 * handed NaN. */
function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** A body or query field that, when present, must be a string. `null` (an
 * explicit JSON null) is let through for `category`, where it means
 * uncategorized. */
function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isOptionalCategory(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string';
}

const readerRoutes: FastifyPluginAsync<ReaderRoutesOptions> = async (fastify, opts) => {
  /**
   * GET /api/reader/items?scope=unread|all&sourceId=&category=&q=&cursor=&limit=50
   * → { items: FeedItemSummary[], nextCursor: string | null }
   *
   * Newest first, keyset-paginated on (sort_at, id). Summaries only: no item's
   * HTML is ever in this payload (brief 95's lesson).
   *
   * `category` absent means no category filter; `category=` (present, blank)
   * selects uncategorized sources. That distinction is why it is passed
   * through as-is rather than with `|| undefined`.
   */
  fastify.get('/api/reader/items', async (req, reply) => {
    const query = req.query as Record<string, unknown>;
    const { scope, sourceId, category, q, cursor, limit } = query;

    if (scope !== undefined && scope !== '' && scope !== 'unread' && scope !== 'all') {
      return reply.status(400).send({ error: 'scope must be "unread" or "all"' });
    }
    if (
      !isOptionalString(sourceId) ||
      !isOptionalString(category) ||
      !isOptionalString(q) ||
      !isOptionalString(cursor) ||
      !isOptionalString(limit)
    ) {
      return reply.status(400).send({ error: 'Each query parameter may be given once' });
    }
    let pageSize: number | undefined;
    if (limit !== undefined && limit !== '') {
      pageSize = Number(limit);
      if (!Number.isInteger(pageSize)) {
        return reply.status(400).send({ error: 'limit must be an integer' });
      }
    }

    try {
      const page = listFeedItems(db(), {
        scope: (scope as 'unread' | 'all' | '' | undefined) || undefined,
        sourceId: (sourceId as string | undefined) || undefined,
        category: category as string | undefined,
        q: (q as string | undefined) || undefined,
        cursor: (cursor as string | undefined) || null,
        limit: pageSize,
      });
      return reply.send(page);
    } catch (err) {
      if (err instanceof InvalidCursorError) {
        return reply.status(400).send({ error: err.message });
      }
      throw err;
    }
  });

  /**
   * GET /api/reader/items/:id → FeedItem (the full item, HTML included)
   * No side effect: opening an item is a separate PATCH.
   */
  fastify.get('/api/reader/items/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.status(400).send({ error: 'id must be a positive integer' });
    const item = getFeedItem(db(), id);
    if (!item) return reply.status(404).send({ error: `Item ${id} not found` });
    return reply.send(item);
  });

  /**
   * PATCH /api/reader/items/:id  { read: boolean } → { id, read }
   * Marking a read item read keeps its first read time.
   */
  fastify.patch('/api/reader/items/:id', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.status(400).send({ error: 'id must be a positive integer' });
    const body = req.body as { read?: unknown } | undefined;
    if (typeof body?.read !== 'boolean') {
      return reply.status(400).send({ error: 'read must be true or false' });
    }
    if (!setFeedItemRead(db(), id, body.read)) {
      return reply.status(404).send({ error: `Item ${id} not found` });
    }
    return reply.send({ id, read: body.read });
  });

  /**
   * POST /api/reader/mark-read  { upToId, sourceId? | category? } → { marked }
   *
   * Marks unread items with `id <= upToId` read: the highest id the list had
   * loaded, so anything that arrived after it stays unread. `sourceId` or
   * `category` (not both) narrows it; `category: null` or `''` means the
   * uncategorized sources. Neither means every source.
   */
  fastify.post('/api/reader/mark-read', async (req, reply) => {
    const body = req.body as { upToId?: unknown; sourceId?: unknown; category?: unknown };
    const upToId = body?.upToId;
    if (typeof upToId !== 'number' || !Number.isInteger(upToId) || upToId < 0) {
      return reply.status(400).send({ error: 'upToId must be a non-negative integer' });
    }
    if (!isOptionalString(body.sourceId) || !isOptionalCategory(body.category)) {
      return reply.status(400).send({ error: 'sourceId and category must be strings' });
    }
    if (body.sourceId !== undefined && body.category !== undefined) {
      return reply.status(400).send({ error: 'Give sourceId or category, not both' });
    }
    const marked = markFeedItemsRead(db(), {
      upToId,
      sourceId: body.sourceId as string | undefined,
      category: body.category as string | null | undefined,
    });
    return reply.send({ marked });
  });

  /**
   * GET /api/reader/counts → { unread, all, unreadBySource: { [sourceId]: n } }
   * Every source is in `unreadBySource`, zero included.
   */
  fastify.get('/api/reader/counts', async (_req, reply) => {
    return reply.send(getReaderCounts(db()));
  });

  /**
   * POST /api/reader/items/:id/save  { note? } → 201 Article
   *
   * Saves the item to the library with `guid` = its URL, so the list then
   * shows it as saved. Idempotent: saving again returns the existing article
   * unchanged, note included. Edit a note afterwards with
   * PATCH /api/articles/:id (the item's `articleId`).
   */
  fastify.post('/api/reader/items/:id/save', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.status(400).send({ error: 'id must be a positive integer' });
    const body = req.body as { note?: unknown } | undefined;
    if (!isOptionalString(body?.note)) {
      return reply.status(400).send({ error: 'note must be a string' });
    }
    const article = saveFeedItemToLibrary(db(), id, { note: body?.note as string | undefined });
    if (!article) return reply.status(404).send({ error: `Item ${id} not found` });
    return reply.status(201).send(article);
  });

  /**
   * POST /api/reader/refresh  (SSE)   body: { sourceId? }
   * Fetches the enabled sources' feeds (or just `sourceId`) and stores their
   * new items. Streams Search's progress protocol, one `progress` event per
   * source step ({ sourceId, status: 'fetching' | 'done' | 'error', count?,
   * error? }, where a `done` count is new items), then
   * `done: { newCount, errors }`.
   *
   * Single-flight: during a background refresh this joins it and streams its
   * remaining events instead of starting a second.
   */
  fastify.post('/api/reader/refresh', async (req, reply) => {
    const body = req.body as { sourceId?: unknown } | undefined;

    sseHeaders(reply);

    const sourceId = body?.sourceId;
    if (!isOptionalString(sourceId)) {
      sseError(reply, 'sourceId must be a string');
      return;
    }
    if (sourceId && !getSource(sourceId as string, db())) {
      sseError(reply, `Source "${sourceId as string}" not found`);
      return;
    }

    try {
      const result = await refreshSources(db(), {
        ...opts.refresh,
        sourceId: (sourceId as string | undefined) || undefined,
        onProgress: (e) => sseWrite(reply, 'progress', e),
      });
      sseDone(reply, { newCount: result.newCount, errors: result.errors });
    } catch (err) {
      // A source's failure never lands here (it is in `errors`); only the DB
      // does. Its message is SQL or a path, so it stays in the log.
      req.log.error(err);
      sseError(reply, 'Refresh failed');
    }
  });
};

export default readerRoutes;
