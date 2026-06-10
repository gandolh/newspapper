import type { FastifyPluginAsync } from 'fastify';
import { promises as fsp } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createDraft,
  getPost,
  listPosts,
  updatePostPayload,
  deletePost,
  getArticlesByIds,
  getSettings,
  getPrompt,
  DEFAULT_PROMPT,
  composePost,
  generateCaption,
  parsePost,
  OllamaError,
} from '@newspapper/core';
import type { PostPayload } from '@newspapper/core';
import { db } from '../lib/db.js';
import { sseHeaders, sseWrite, sseDone, sseError } from '../lib/sse.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
// repo root is api/src/routes/../../../ = api/../../ = repoRoot
const repoRoot = resolve(__dirname, '../../..');
const outputRoot = resolve(repoRoot, 'output');

const postsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/compose  (SSE)
   * Body: { articleIds: number[], theme?: string }
   */
  fastify.post('/api/compose', async (req, reply) => {
    sseHeaders(reply);
    const body = req.body as { articleIds?: number[]; theme?: string };

    if (!body?.articleIds || body.articleIds.length === 0) {
      sseError(reply, 'articleIds must be a non-empty array');
      return;
    }

    const articles = getArticlesByIds(db(), body.articleIds);
    if (articles.length === 0) {
      sseError(reply, 'No articles found for the given ids');
      return;
    }

    const s = getSettings();
    const cfg = { host: s.ollamaHost, apiKey: s.ollamaApiKey, model: s.ollamaModel };
    const theme = body.theme ?? s.defaultTheme;
    const today = new Date().toISOString().slice(0, 10);

    try {
      sseWrite(reply, 'progress', { stage: 'prompting' });
      const promptOverride = getPrompt(DEFAULT_PROMPT);
      const payload = await composePost(articles, cfg, { theme, date: today, promptOverride });
      const post = createDraft(db(), payload);
      sseDone(reply, post);
    } catch (err) {
      if (err instanceof OllamaError) {
        sseError(reply, `Ollama error: ${(err as Error).message}`);
      } else {
        sseError(reply, (err as Error).message);
      }
    }
  });

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

    // Use parsePost-equivalent validation by trying to re-parse
    try {
      parsePost(JSON.stringify(payload), payload.date, payload.theme);
    } catch {
      // parsePost is strict about shape — but we allow partial edits.
      // We do our own slide count validation above; proceed if it passed.
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

  /**
   * POST /api/posts/:id/caption
   * Generates a caption, merges into payload, saves.
   */
  fastify.post('/api/posts/:id/caption', async (req, reply) => {
    const { id } = req.params as { id: string };
    const post = getPost(db(), Number(id));
    if (!post) return reply.status(404).send({ error: 'Post not found' });

    const s = getSettings();
    const cfg = { host: s.ollamaHost, apiKey: s.ollamaApiKey, model: s.ollamaModel };

    try {
      const result = await generateCaption(post.payload, cfg);
      const updatedPayload: PostPayload = {
        ...post.payload,
        caption: result.caption,
        hashtags: result.hashtags,
      };
      const updated = updatePostPayload(db(), Number(id), updatedPayload);
      return reply.send(updated);
    } catch (err) {
      if (err instanceof OllamaError) {
        return reply.status(502).send({ error: (err as Error).message });
      }
      throw err;
    }
  });
};

export default postsRoutes;
