import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { saveArticle, listArticleSummaries, removeArticle, updateArticleNote } from "@newspapper/core";
import { db } from "../../lib/db.js";
import { errorSchema } from "../../lib/schemas.js";
import {
  articleIdSchema,
  articleInputSchema,
  articleParamsSchema,
  articleQuerySchema,
  articleSchema,
  articleSummaryListSchema,
  notePatchSchema,
  okSchema,
} from "./schemas.js";

export const articlesRoutes: FastifyPluginAsyncZod = async (fastify) => {
  /**
   * GET /api/articles?sourceId=&search=&limit=&offset=
   * The saved library — never the transient results of a search.
   */
  fastify.get(
    "/api/articles",
    { schema: { querystring: articleQuerySchema, response: { 200: articleSummaryListSchema } } },
    async (req, reply) => {
      const query = req.query;
      // Excerpts, not full bodies: the library list shows only the excerpt.
      const articles = listArticleSummaries(db(), {
        sourceId: query.sourceId || undefined,
        search: query.search || undefined,
        limit: query.limit,
        offset: query.offset,
      });
      return reply.send(articles);
    },
  );

  /**
   * POST /api/articles  (body: NewArticle, `note` included)
   * Saves a search result — or a manually typed article — to the library.
   * Idempotent on (source_id, guid): saving the same article twice returns
   * the existing row rather than creating a second one, its note unchanged.
   */
  fastify.post(
    "/api/articles",
    { schema: { body: articleInputSchema, response: { 201: articleSchema } } },
    async (req, reply) => {
      const body = req.body;
      const sourceName = body.sourceName ?? (body.sourceId ? "" : "Manual");
      const article = saveArticle(db(), { ...body, sourceName });
      return reply.status(201).send(article);
    },
  );

  /**
   * PATCH /api/articles/:id  { note } → Article
   * Replaces the note: why this article was kept. `''` clears it.
   */
  fastify.patch(
    "/api/articles/:id",
    {
      schema: {
        params: articleIdSchema,
        body: notePatchSchema,
        response: { 200: articleSchema, 404: errorSchema },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      const article = updateArticleNote(db(), id, req.body.note);
      if (!article) return reply.status(404).send({ error: `Article ${id} not found` });
      return reply.send(article);
    },
  );

  /**
   * DELETE /api/articles/:id
   * Removing an article never touches its source — and removing a source
   * never touches its already-saved articles (source_name is the snapshot).
   */
  fastify.delete(
    "/api/articles/:id",
    { schema: { params: articleParamsSchema, response: { 200: okSchema, 404: errorSchema } } },
    async (req, reply) => {
      const { id } = req.params;
      const removed = removeArticle(db(), Number(id));
      if (!removed) return reply.status(404).send({ error: `Article ${id} not found` });
      return reply.send({ ok: true });
    },
  );
};
