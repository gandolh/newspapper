import type { FastifyPluginAsync } from 'fastify';
import { listSources, addSource, updateSource, removeSource, pingSource } from '@newspapper/core';
import type { SourceConfig } from '@newspapper/core';

const sourcesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/sources
   */
  fastify.get('/api/sources', async (_req, reply) => {
    return reply.send(listSources());
  });

  /**
   * POST /api/sources  { id, name, rss, enabled? }
   */
  fastify.post('/api/sources', async (req, reply) => {
    const body = req.body as Partial<SourceConfig>;
    if (!body?.id || !body?.name || !body?.rss) {
      return reply.status(400).send({ error: 'id, name, and rss are required' });
    }
    try {
      const all = addSource({
        id: body.id,
        name: body.name,
        rss: body.rss,
        enabled: body.enabled ?? true,
      });
      return reply.status(201).send(all);
    } catch (err) {
      if ((err as Error).message.includes('already exists')) {
        return reply.status(409).send({ error: (err as Error).message });
      }
      throw err;
    }
  });

  /**
   * PUT /api/sources/:id  (partial patch)
   */
  fastify.put('/api/sources/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Partial<Omit<SourceConfig, 'id'>>;
    try {
      const all = updateSource(id, body);
      return reply.send(all);
    } catch (err) {
      if ((err as Error).message.includes('not found')) {
        return reply.status(404).send({ error: (err as Error).message });
      }
      throw err;
    }
  });

  /**
   * DELETE /api/sources/:id
   */
  fastify.delete('/api/sources/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const all = removeSource(id);
      return reply.send(all);
    } catch (err) {
      if ((err as Error).message.includes('not found')) {
        return reply.status(404).send({ error: (err as Error).message });
      }
      throw err;
    }
  });

  /**
   * POST /api/sources/:id/ping
   */
  fastify.post('/api/sources/:id/ping', async (req, reply) => {
    const { id } = req.params as { id: string };
    const all = listSources();
    const src = all.find((s) => s.id === id);
    if (!src) return reply.status(404).send({ error: `Source "${id}" not found` });
    const result = await pingSource(src);
    return reply.send(result);
  });
};

export default sourcesRoutes;
