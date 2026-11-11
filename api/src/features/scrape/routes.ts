import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { searchArticles, listSources } from "@newspapper/core";
import { sseHeaders, sseWrite, sseDone, sseError } from "../../plugins/sse.js";
import { db } from "../../lib/db.js";
import { scrapeSchema } from "./schemas.js";

export const scrapeRoutes: FastifyPluginAsyncZod = async (fastify) => {
  /**
   * POST /api/scrape  (SSE)   body: { keywords: string[], maxPerSource?: number }
   * Fetches the enabled sources and returns items matching any of `keywords`
   * (case-insensitive substring, title + body), ranked by match count.
   * Persists nothing — saving a result is a separate call to POST /api/articles.
   *
   * A stream, so no response schema (scripts/conventions.json records the exception); its body is
   * validated before the stream opens.
   */
  fastify.post("/api/scrape", { schema: { body: scrapeSchema } }, async (req, reply) => {
    const body = req.body;
    const keywords = (body?.keywords ?? []).map((k) => k.trim()).filter(Boolean);

    sseHeaders(reply);

    if (keywords.length === 0) {
      sseError(reply, "At least one keyword is required");
      return;
    }

    const sources = listSources(db());
    try {
      const result = await searchArticles(sources, {
        keywords,
        maxPerSource: body?.maxPerSource,
        onProgress: (e) => sseWrite(reply, "progress", e),
      });
      sseDone(reply, result);
    } catch (err) {
      sseError(reply, (err as Error).message);
    }
  });
};
