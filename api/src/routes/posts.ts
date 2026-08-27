import type { FastifyPluginAsync } from 'fastify';
import { promises as fsp } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getPost,
  listPosts,
  updatePostPayload,
  deletePost,
} from '@newspapper/core';
import type { PostPayload } from '@newspapper/core';
import { db } from '../lib/db.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
// repo root is api/src/routes/../../../ = api/../../ = repoRoot
const repoRoot = resolve(__dirname, '../../..');
const outputRoot = resolve(repoRoot, 'output');

const postsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/posts
   */
  fastify.get('/api/posts', async (_req, reply) => {
    return reply.send(listPosts(db()));
  });

  /**
   * GET /api/posts/:id
   */
  fastify.get('/api/posts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const post = getPost(db(), Number(id));
    if (!post) return reply.status(404).send({ error: 'Post not found' });
    return reply.send(post);
  });

  /**
   * PUT /api/posts/:id  { payload: PostPayload }
   * Validates slides count (2–8) before saving.
   */
  fastify.put('/api/posts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { payload?: PostPayload };

    if (!body?.payload) {
      return reply.status(400).send({ error: 'payload is required' });
    }

    const { payload } = body;

    // Validate slide count
    if (!Array.isArray(payload.slides) || payload.slides.length < 2 || payload.slides.length > 8) {
      return reply.status(400).send({ error: 'payload.slides must have 2–8 entries' });
    }

    const existing = getPost(db(), Number(id));
    if (!existing) return reply.status(404).send({ error: 'Post not found' });

    const updated = updatePostPayload(db(), Number(id), payload);
    return reply.send(updated);
  });

  /**
   * DELETE /api/posts/:id
   */
  fastify.delete('/api/posts/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const deleted = deletePost(db(), Number(id));
    if (!deleted) return reply.status(404).send({ error: 'Post not found' });

    // Clean up output dir — only if it is inside the repo's output/ dir
    if (deleted.outputDir) {
      const abs = resolve(deleted.outputDir);
      if (abs.startsWith(outputRoot + '/') || abs === outputRoot) {
        await fsp.rm(abs, { recursive: true, force: true });
      }
    }

    return reply.send({ ok: true });
  });
};

export default postsRoutes;
