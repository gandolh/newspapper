import type { FastifyPluginAsync } from 'fastify';
import { scrape, listSources } from '@newspapper/core';
import { sseHeaders, sseWrite, sseDone, sseError } from '../lib/sse.js';

const scrapeRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/scrape  (SSE)
   * Runs scrape against today's feeds; streams progress events.
   */
  fastify.post('/api/scrape', async (_req, reply) => {
    sseHeaders(reply);
    const today = new Date().toISOString().slice(0, 10);
    const sources = listSources();
    try {
      const result = await scrape(sources, {
        date: today,
        onProgress: (e) => {
          sseWrite(reply, 'progress', e);
        },
      });
      sseDone(reply, result);
    } catch (err) {
      sseError(reply, (err as Error).message);
    }
  });
};

export default scrapeRoutes;
