import type { FastifyPluginAsync } from 'fastify';
import { getSettings, saveSettings, OllamaClient, OllamaError } from '@newspapper/core';
import type { Settings } from '@newspapper/core';

const MASK = '***';

function maskSettings(s: Settings): Settings & { ollamaApiKey: string } {
  return {
    ...s,
    ollamaApiKey: s.ollamaApiKey ? MASK : '',
  };
}

const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/settings  — ollamaApiKey masked
   */
  fastify.get('/api/settings', async (_req, reply) => {
    const s = getSettings();
    return reply.send(maskSettings(s));
  });

  /**
   * PUT /api/settings  (patch; ignore ollamaApiKey: '***' sentinel)
   */
  fastify.put('/api/settings', async (req, reply) => {
    const body = req.body as Partial<Settings>;
    if (!body || typeof body !== 'object') {
      return reply.status(400).send({ error: 'body must be an object' });
    }
    const patch: Partial<Settings> = { ...body };
    // Ignore the mask sentinel so it never overwrites the real key
    if (patch.ollamaApiKey === MASK) {
      delete patch.ollamaApiKey;
    }
    saveSettings(patch);
    const updated = getSettings();
    return reply.send(maskSettings(updated));
  });

  /**
   * POST /api/settings/test  — testConnection()
   */
  fastify.post('/api/settings/test', async (_req, reply) => {
    const s = getSettings();
    const client = new OllamaClient({ host: s.ollamaHost, apiKey: s.ollamaApiKey, model: s.ollamaModel });
    const result = await client.testConnection();
    return reply.send(result);
  });

  /**
   * GET /api/models  — listModels() (502 on failure)
   */
  fastify.get('/api/models', async (_req, reply) => {
    const s = getSettings();
    const client = new OllamaClient({ host: s.ollamaHost, apiKey: s.ollamaApiKey, model: s.ollamaModel });
    try {
      const models = await client.listModels();
      return reply.send(models);
    } catch (err) {
      return reply.status(502).send({ error: (err as Error).message });
    }
  });
};

export default settingsRoutes;
