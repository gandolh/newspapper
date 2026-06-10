import type { FastifyPluginAsync } from 'fastify';
import { articlesForDate, addManualArticle } from '@newspapper/core';
import { db } from '../lib/db.js';

const articlesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/articles?date=YYYY-MM-DD (default today)
   */
  fastify.get('/api/articles', async (req, reply) => {
    const query = req.query as { date?: string };
    const date = query.date ?? new Date().toISOString().slice(0, 10);
    const articles = articlesForDate(db(), date);
    return reply.send(articles);
  });

  /**
   * POST /api/articles  { title, body, url?, sourceName? }
   */
  fastify.post('/api/articles', async (req, reply) => {
    const body = req.body as { title?: string; body?: string; url?: string; sourceName?: string };
    if (!body?.title || !body?.body) {
      return reply.status(400).send({ error: 'title and body are required' });
    }
    const article = addManualArticle(db(), {
      title: body.title,
      body: body.body,
      url: body.url,
      sourceName: body.sourceName,
    });
    return reply.status(201).send(article);
  });
};

export default articlesRoutes;
