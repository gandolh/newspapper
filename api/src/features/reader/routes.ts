import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
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
} from "@newspapper/core";
import type { RefreshOptions } from "@newspapper/core";
import { sseHeaders, sseWrite, sseDone, sseError } from "../../plugins/sse.js";
import { db } from "../../lib/db.js";
import { errorSchema, positiveIdParams } from "../../lib/schemas.js";
import { articleSchema } from "../articles/index.js";
import {
  feedItemPageSchema,
  feedItemSchema,
  itemQuerySchema,
  markedSchema,
  markReadSchema,
  readerCountsSchema,
  readPatchSchema,
  readStateSchema,
  refreshSchema,
  saveItemSchema,
} from "./schemas.js";

/*
 * The Reader: stored feed items, read in place. An **Item** lives
 * in `feed_items`; it becomes an **Article** only when saved to the library,
 * keyed on the same `(source_id, guid)` with `guid` = the item's URL.
 *
 * Every route here sits under `/api/`, so the Ward guard covers it by prefix.
 */

export interface ReaderRoutesOptions {
  /** Passed to every refresh this route starts. Tests inject fetch and DNS
   * here, so a refresh never reaches the network. */
  refresh?: Pick<RefreshOptions, "deps" | "now"> | undefined;
}

export const readerRoutes: FastifyPluginAsyncZod<ReaderRoutesOptions> = async (fastify, opts) => {
  /**
   * GET /api/reader/items?scope=unread|all&sourceId=&category=&q=&cursor=&limit=50
   * → { items: FeedItemSummary[], nextCursor: string | null }
   *
   * Newest first, keyset-paginated on (sort_at, id). Summaries only: no item's
   * HTML is ever in this payload (the list-payload lesson of 2026-10-03).
   *
   * `category` absent means no category filter; `category=` (present, blank)
   * selects uncategorized sources. That distinction is why it is passed
   * through as-is rather than with `|| undefined`.
   */
  fastify.get(
    "/api/reader/items",
    { schema: { querystring: itemQuerySchema, response: { 200: feedItemPageSchema, 400: errorSchema } } },
    async (req, reply) => {
      const { scope, sourceId, category, q, cursor, limit } = req.query;
      try {
        const page = listFeedItems(db(), {
          scope: scope || undefined,
          sourceId: sourceId || undefined,
          category,
          q: q || undefined,
          cursor: cursor || null,
          limit,
        });
        return reply.send(page);
      } catch (err) {
        if (err instanceof InvalidCursorError) {
          return reply.status(400).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  /**
   * GET /api/reader/items/:id → FeedItem (the full item, HTML included)
   * No side effect: opening an item is a separate PATCH.
   */
  fastify.get(
    "/api/reader/items/:id",
    { schema: { params: positiveIdParams, response: { 200: feedItemSchema, 404: errorSchema } } },
    async (req, reply) => {
      const { id } = req.params;
      const item = getFeedItem(db(), id);
      if (!item) return reply.status(404).send({ error: `Item ${id} not found` });
      return reply.send(item);
    },
  );

  /**
   * PATCH /api/reader/items/:id  { read: boolean } → { id, read }
   * Marking a read item read keeps its first read time.
   */
  fastify.patch(
    "/api/reader/items/:id",
    {
      schema: {
        params: positiveIdParams,
        body: readPatchSchema,
        response: { 200: readStateSchema, 404: errorSchema },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      const { read } = req.body;
      if (!setFeedItemRead(db(), id, read)) {
        return reply.status(404).send({ error: `Item ${id} not found` });
      }
      return reply.send({ id, read });
    },
  );

  /**
   * POST /api/reader/mark-read  { upToId, sourceId? | category? } → { marked }
   *
   * Marks unread items with `id <= upToId` read: the highest id the list had
   * loaded, so anything that arrived after it stays unread. `sourceId` or
   * `category` (not both) narrows it; `category: null` or `''` means the
   * uncategorized sources. Neither means every source.
   */
  fastify.post(
    "/api/reader/mark-read",
    { schema: { body: markReadSchema, response: { 200: markedSchema } } },
    async (req, reply) => {
      const { upToId, sourceId, category } = req.body;
      const marked = markFeedItemsRead(db(), { upToId, sourceId, category });
      return reply.send({ marked });
    },
  );

  /**
   * GET /api/reader/counts → { unread, all, unreadBySource: { [sourceId]: n } }
   * Every source is in `unreadBySource`, zero included.
   */
  fastify.get("/api/reader/counts", { schema: { response: { 200: readerCountsSchema } } }, async (_req, reply) => {
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
  fastify.post(
    "/api/reader/items/:id/save",
    {
      schema: {
        params: positiveIdParams,
        body: saveItemSchema,
        response: { 201: articleSchema, 404: errorSchema },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      const article = saveFeedItemToLibrary(db(), id, { note: req.body?.note });
      if (!article) return reply.status(404).send({ error: `Item ${id} not found` });
      return reply.status(201).send(article);
    },
  );

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
   *
   * A stream, so no response schema (scripts/conventions.json records the exception). Its body is
   * validated before the stream opens: a malformed one is a JSON 400, which the UI's stream reader
   * shows as it shows an `error` event.
   */
  fastify.post("/api/reader/refresh", { schema: { body: refreshSchema } }, async (req, reply) => {
    sseHeaders(reply);

    const sourceId = req.body?.sourceId;
    if (sourceId && !getSource(sourceId, db())) {
      sseError(reply, `Source "${sourceId}" not found`);
      return;
    }

    try {
      const result = await refreshSources(db(), {
        ...opts.refresh,
        sourceId: sourceId || undefined,
        onProgress: (e) => sseWrite(reply, "progress", e),
      });
      sseDone(reply, { newCount: result.newCount, errors: result.errors });
    } catch (err) {
      // A source's failure never lands here (it is in `errors`); only the DB
      // does. Its message is SQL or a path, so it stays in the log.
      req.log.error(err);
      sseError(reply, "Refresh failed");
    }
  });
};
