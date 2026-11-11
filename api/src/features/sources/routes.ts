import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { listSources, addSource, updateSource, removeSource, pingSource } from "@newspapper/core";
import { db } from "../../lib/db.js";
import { errorSchema } from "../../lib/schemas.js";
import { pingSchema, sourceInputSchema, sourceListSchema, sourceParamsSchema, sourcePatchSchema } from "./schemas.js";

export const sourcesRoutes: FastifyPluginAsyncZod = async (fastify) => {
  /**
   * GET /api/sources
   * Each source carries its `category` and the Reader's last refresh outcome
   * (`lastFetchedAt`, `lastError`).
   */
  fastify.get("/api/sources", { schema: { response: { 200: sourceListSchema } } }, async (_req, reply) => {
    return reply.send(listSources(db()));
  });

  /**
   * POST /api/sources  { id, name, rss, enabled?, category? }
   * A blank or absent category is stored as uncategorized (NULL).
   */
  fastify.post(
    "/api/sources",
    { schema: { body: sourceInputSchema, response: { 201: sourceListSchema, 409: errorSchema } } },
    async (req, reply) => {
      const body = req.body;
      try {
        const all = addSource(
          {
            id: body.id,
            name: body.name,
            rss: body.rss,
            enabled: body.enabled ?? true,
            category: body.category ?? null,
          },
          db(),
        );
        return reply.status(201).send(all);
      } catch (err) {
        if ((err as Error).message.includes("already exists")) {
          return reply.status(409).send({ error: (err as Error).message });
        }
        throw err;
      }
    },
  );

  /**
   * PUT /api/sources/:id  (partial patch: name, rss, enabled, category)
   */
  fastify.put(
    "/api/sources/:id",
    {
      schema: {
        params: sourceParamsSchema,
        body: sourcePatchSchema,
        response: { 200: sourceListSchema, 404: errorSchema },
      },
    },
    async (req, reply) => {
      const { id } = req.params;
      try {
        const all = updateSource(id, req.body ?? {}, db());
        return reply.send(all);
      } catch (err) {
        if ((err as Error).message.includes("not found")) {
          return reply.status(404).send({ error: (err as Error).message });
        }
        throw err;
      }
    },
  );

  /**
   * DELETE /api/sources/:id
   * Already-saved articles from this source keep their `source_name`
   * snapshot and stay readable — only `source_id` goes NULL (schema v3 FK).
   */
  fastify.delete(
    "/api/sources/:id",
    { schema: { params: sourceParamsSchema, response: { 200: sourceListSchema, 404: errorSchema } } },
    async (req, reply) => {
      const { id } = req.params;
      try {
        const all = removeSource(id, db());
        return reply.send(all);
      } catch (err) {
        if ((err as Error).message.includes("not found")) {
          return reply.status(404).send({ error: (err as Error).message });
        }
        throw err;
      }
    },
  );

  /**
   * POST /api/sources/:id/ping
   * Doubles as the Articles page's "test feed" action.
   */
  fastify.post(
    "/api/sources/:id/ping",
    { schema: { params: sourceParamsSchema, response: { 200: pingSchema, 404: errorSchema } } },
    async (req, reply) => {
      const { id } = req.params;
      const all = listSources(db());
      const src = all.find((s) => s.id === id);
      if (!src) return reply.status(404).send({ error: `Source "${id}" not found` });
      const result = await pingSource(src);
      return reply.send(result);
    },
  );
};
