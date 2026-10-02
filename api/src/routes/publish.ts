import type { FastifyPluginAsync } from 'fastify';
import { OutputDirMissingError, publishPost } from '@newspapper/core/publish';
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
      if (err instanceof OutputDirMissingError) {
        return reply.status(404).send({ error: err.message });
      }
      // The two failures publishPost reports on purpose; their messages name a
      // post id, nothing internal. Anything else is a fault, so it goes to the
      // global handler, which keeps its message out of the response.
      const message = (err as Error).message;
      if (/^Post \d+ not found$/.test(message)) return reply.status(404).send({ error: message });
      if (/^Post \d+ has not been rendered yet$/.test(message)) {
        return reply.status(409).send({ error: message });
      }
      throw err;
    }
  });
};

export default publishRoutes;
