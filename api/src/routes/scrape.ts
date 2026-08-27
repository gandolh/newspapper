import type { FastifyPluginAsync } from 'fastify';
import { searchArticles, listSources } from '@newspapper/core';
import { sseHeaders, sseWrite, sseDone, sseError } from '../lib/sse.js';
import { db } from '../lib/db.js';

const scrapeRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/scrape  (SSE)   body: { keywords: string[], maxPerSource?: number }
   * Fetches the enabled sources and returns items matching any of `keywords`
   * (case-insensitive substring, title + body), ranked by match count.
   * Persists nothing — saving a result is a separate call to POST /api/articles.
   */
  fastify.post('/api/scrape', async (req, reply) => {
    const body = req.body as { keywords?: string[]; maxPerSource?: number };
    const keywords = (body?.keywords ?? []).map((k) => String(k).trim()).filter(Boolean);

    sseHeaders(reply);

    if (keywords.length === 0) {
      sseError(reply, 'At least one keyword is required');
      return;
    }

    const sources = listSources(db());
    try {
      const result = await searchArticles(sources, {
        keywords,
        maxPerSource: body?.maxPerSource,
        onProgress: (e) => sseWrite(reply, 'progress', e),
      });
      sseDone(reply, result);
    } catch (err) {
      sseError(reply, (err as Error).message);
    }
  });
};

export default scrapeRoutes;
