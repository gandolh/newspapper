import type { FastifyPluginAsync } from 'fastify';
import {
  slideAi,
  getArticlesByIds,
  getSettings,
  OllamaError,
} from '@newspapper/core';
import type { SlideBlock, SlideAiAction } from '@newspapper/core';
import { db } from '../lib/db.js';

const VALID_ACTIONS = ['shorter', 'punchier', 'regenerate', 'remap'] as const;

const slideAiRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/slide-ai
   * Body: { slide, action, targetVariant?, articleIds? }
   */
  fastify.post('/api/slide-ai', async (req, reply) => {
    const body = req.body as {
      slide?: SlideBlock;
      action?: string;
      targetVariant?: string;
      articleIds?: number[];
    };

    if (!body?.slide) {
      return reply.status(400).send({ error: 'slide is required' });
    }
    if (!body?.action || !VALID_ACTIONS.includes(body.action as (typeof VALID_ACTIONS)[number])) {
      return reply.status(400).send({ error: `action must be one of: ${VALID_ACTIONS.join(', ')}` });
    }
    if (body.action === 'remap' && !body.targetVariant) {
      return reply.status(400).send({ error: 'targetVariant is required for remap action' });
    }

    let actionObj: SlideAiAction;
    if (body.action === 'shorter') {
      actionObj = { action: 'shorter' };
    } else if (body.action === 'punchier') {
      actionObj = { action: 'punchier' };
    } else if (body.action === 'remap') {
      actionObj = { action: 'remap', targetVariant: body.targetVariant as SlideBlock['variant'] };
    } else {
      // regenerate
      const articles = body.articleIds && body.articleIds.length > 0
        ? getArticlesByIds(db(), body.articleIds)
        : [];
      actionObj = { action: 'regenerate', articles };
    }

    const s = getSettings();
    const cfg = { host: s.ollamaHost, apiKey: s.ollamaApiKey, model: s.ollamaModel };

    try {
      const slide = await slideAi(body.slide, actionObj, cfg);
      return reply.send({ slide });
    } catch (err) {
      if (err instanceof OllamaError) {
        return reply.status(502).send({ error: (err as Error).message });
      }
      throw err;
    }
  });
};

export default slideAiRoutes;
