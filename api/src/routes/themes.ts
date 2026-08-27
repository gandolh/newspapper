import type { FastifyPluginAsync } from 'fastify';
import { loadTheme, listThemes } from '@newspapper/core';

const themesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/themes
   */
  fastify.get('/api/themes', async (_req, reply) => {
    const names = listThemes();
    const result = names.map((name) => {
      try {
        const tokens = loadTheme(name);
        return { name, tokens };
      } catch {
        return { name, tokens: null };
      }
    });
    return reply.send(result);
  });
};

export default themesRoutes;
