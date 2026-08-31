import type { FastifyPluginAsync } from 'fastify';
import { getSettings, listThemes, saveSettings } from '@newspapper/core';
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
   *
   * `defaultTheme` is checked against the themes on disk: an unknown id would
   * be handed straight to `loadTheme` on the next render and throw there.
   */
  fastify.put('/api/settings', async (req, reply) => {
    const body = req.body as Partial<Settings>;
    if (!body || typeof body !== 'object') {
      return reply.status(400).send({ error: 'body must be an object' });
    }
    if (body.defaultTheme !== undefined && !listThemes().includes(body.defaultTheme)) {
      return reply.status(400).send({ error: `Unknown theme: "${body.defaultTheme}"` });
    }
    saveSettings(body);
    return reply.send(getSettings());
  });
};

export default settingsRoutes;
