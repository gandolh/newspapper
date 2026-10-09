import type { FastifyPluginAsync } from 'fastify';
import {
  saveArticle,
  listArticleSummaries,
  removeArticle,
  updateArticleNote,
} from '@newspapper/core';
import type { NewArticle } from '@newspapper/core';
import { db } from '../lib/db.js';

const articlesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/articles?sourceId=&search=&limit=&offset=
   * The saved library — never the transient results of a search.
   */
  fastify.get('/api/articles', async (req, reply) => {
    const query = req.query as {
      sourceId?: string;
      search?: string;
      limit?: string;
      offset?: string;
    };
    // Excerpts, not full bodies: the library list shows only the excerpt.
    const articles = listArticleSummaries(db(), {
      sourceId: query.sourceId || undefined,
      search: query.search || undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      offset: query.offset ? Number(query.offset) : undefined,
    });
    return reply.send(articles);
  });

  /**
   * POST /api/articles  (body: NewArticle, `note` included)
   * Saves a search result — or a manually typed article — to the library.
   * Idempotent on (source_id, guid): saving the same article twice returns
   * the existing row rather than creating a second one, its note unchanged.
   */
  fastify.post('/api/articles', async (req, reply) => {
    const body = req.body as Partial<NewArticle>;
    if (!body?.title) {
      return reply.status(400).send({ error: 'title is required' });
    }
    if (body.note !== undefined && typeof body.note !== 'string') {
      return reply.status(400).send({ error: 'note must be a string' });
    }
    const sourceName = body.sourceName ?? (body.sourceId ? '' : 'Manual');
    const article = saveArticle(db(), { ...body, title: body.title, sourceName });
    return reply.status(201).send(article);
  });

  /**
   * PATCH /api/articles/:id  { note } → Article
   * Replaces the note: why this article was kept. `''` clears it.
   */
  fastify.patch('/api/articles/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const articleId = Number(id);
    if (!Number.isInteger(articleId) || articleId <= 0) {
      return reply.status(400).send({ error: 'id must be a positive integer' });
    }
    const body = req.body as { note?: unknown } | undefined;
    if (typeof body?.note !== 'string') {
      return reply.status(400).send({ error: 'note must be a string' });
    }
    const article = updateArticleNote(db(), articleId, body.note);
    if (!article) return reply.status(404).send({ error: `Article ${id} not found` });
    return reply.send(article);
  });

  /**
   * DELETE /api/articles/:id
   * Removing an article never touches its source — and removing a source
   * never touches its already-saved articles (source_name is the snapshot).
   */
  fastify.delete('/api/articles/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = removeArticle(db(), Number(id));
    if (!removed) return reply.status(404).send({ error: `Article ${id} not found` });
    return reply.send({ ok: true });
  });
};

export default articlesRoutes;
