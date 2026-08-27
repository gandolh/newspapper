import type { FastifyPluginAsync } from 'fastify';
import { getSettings, saveSettings } from '@newspapper/core';
import type { Settings } from '@newspapper/core';

const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/settings
   */
  fastify.get('/api/settings', async (_req, reply) => {
    return reply.send(getSettings());
  });

  /**
   * PUT /api/settings  (patch)
   */
  fastify.put('/api/settings', async (req, reply) => {
    const body = req.body as Partial<Settings>;
    if (!body || typeof body !== 'object') {
      return reply.status(400).send({ error: 'body must be an object' });
    }
    saveSettings(body);
    return reply.send(getSettings());
  });
};

export default settingsRoutes;
