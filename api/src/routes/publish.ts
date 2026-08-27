import type { FastifyPluginAsync } from 'fastify';
import { publishPost } from '@newspapper/core/publish';
import { db } from '../lib/db.js';

const publishRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/posts/:id/publish
   *
   * Marks the post published, running the publish-time JPEG optimization
   * pass over its latest render the first time — a repeat call is a no-op
   * re-encode (the render's `optimized` flag guards it) so publishing twice
   * never degrades the image.
   */
  fastify.post('/api/posts/:id/publish', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const result = await publishPost(db(), Number(id));
      return reply.send(result);
    } catch (err) {
      const message = (err as Error).message;
      const status = message.includes('not found') ? 404 : 409;
      return reply.status(status).send({ error: message });
    }
  });
};

export default publishRoutes;
