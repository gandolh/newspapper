import type { FastifyPluginAsync } from 'fastify';
import {
  getPrompt,
  savePrompt,
  resetPrompt,
  DEFAULT_PROMPT,
  articlesForDate,
  getArticlesByIds,
  composePost,
  getSettings,
  OllamaError,
} from '@newspapper/core';
import { db } from '../lib/db.js';

const promptRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/prompt
   */
  fastify.get('/api/prompt', async (_req, reply) => {
    const prompt = getPrompt(DEFAULT_PROMPT);
    const isDefault = prompt === DEFAULT_PROMPT;
    return reply.send({ prompt, isDefault });
  });

  /**
   * PUT /api/prompt  { prompt: string }
   */
  fastify.put('/api/prompt', async (req, reply) => {
    const body = req.body as { prompt?: string };
    if (typeof body?.prompt !== 'string') {
      return reply.status(400).send({ error: 'prompt must be a string' });
    }
    savePrompt(body.prompt);
    return reply.send({ prompt: body.prompt, isDefault: body.prompt === DEFAULT_PROMPT });
  });

  /**
   * POST /api/prompt/reset
   */
  fastify.post('/api/prompt/reset', async (_req, reply) => {
    resetPrompt(DEFAULT_PROMPT);
    return reply.send({ prompt: DEFAULT_PROMPT, isDefault: true });
  });

  /**
   * POST /api/prompt/test  { articleIds?: number[] }
   * Compose against today's (or given) articles WITHOUT saving a post.
   * Returns PostPayload draft.
   */
  fastify.post('/api/prompt/test', async (req, reply) => {
    const body = req.body as { articleIds?: number[] };
    const today = new Date().toISOString().slice(0, 10);

    let articles;
    if (body?.articleIds && body.articleIds.length > 0) {
      articles = getArticlesByIds(db(), body.articleIds);
    } else {
      articles = articlesForDate(db(), today);
    }

    if (articles.length === 0) {
      return reply.status(400).send({ error: 'No articles available for test' });
    }

    const s = getSettings();
    const cfg = { host: s.ollamaHost, apiKey: s.ollamaApiKey, model: s.ollamaModel };
    const promptOverride = getPrompt(DEFAULT_PROMPT);

    try {
      const payload = await composePost(articles, cfg, {
        theme: s.defaultTheme,
        date: today,
        promptOverride,
      });
      return reply.send(payload);
    } catch (err) {
      if (err instanceof OllamaError) {
        return reply.status(502).send({ error: (err as Error).message });
      }
      throw err;
    }
  });
};

export default promptRoutes;
