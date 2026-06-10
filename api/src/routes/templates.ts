import type { FastifyPluginAsync } from 'fastify';
import {
  listTemplates,
  loadTemplate,
  saveTemplate,
  deleteTemplate,
  validateTemplateDoc,
  loadTheme,
  listThemes,
} from '@newspapper/core';

const templatesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/templates?theme=warm-industrial
   */
  fastify.get('/api/templates', async (req, reply) => {
    const query = req.query as { theme?: string };
    const theme = query.theme ?? 'warm-industrial';
    const docs = listTemplates(theme);
    return reply.send(docs);
  });

  /**
   * GET /api/templates/:theme/:id
   */
  fastify.get('/api/templates/:theme/:id', async (req, reply) => {
    const { theme, id } = req.params as { theme: string; id: string };
    try {
      const doc = loadTemplate(theme, id);
      return reply.send(doc);
    } catch {
      return reply.status(404).send({ error: `Template ${theme}/${id} not found` });
    }
  });

  /**
   * PUT /api/templates/:theme/:id  (validate + save)
   */
  fastify.put('/api/templates/:theme/:id', async (req, reply) => {
    const { theme, id } = req.params as { theme: string; id: string };
    const body = req.body;
    let doc;
    try {
      doc = validateTemplateDoc(body);
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
    if (doc.theme !== theme || doc.id !== id) {
      return reply.status(400).send({ error: 'doc.theme and doc.id must match URL params' });
    }
    saveTemplate(doc);
    return reply.send(doc);
  });

  /**
   * POST /api/templates  (create — 409 if id exists)
   */
  fastify.post('/api/templates', async (req, reply) => {
    const body = req.body;
    let doc;
    try {
      doc = validateTemplateDoc(body);
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
    // Check if already exists
    try {
      loadTemplate(doc.theme, doc.id);
      return reply.status(409).send({ error: `Template ${doc.theme}/${doc.id} already exists` });
    } catch {
      // Not found — proceed to create
    }
    saveTemplate(doc);
    return reply.status(201).send(doc);
  });

  /**
   * DELETE /api/templates/:theme/:id
   */
  fastify.delete('/api/templates/:theme/:id', async (req, reply) => {
    const { theme, id } = req.params as { theme: string; id: string };
    try {
      deleteTemplate(theme, id);
      return reply.send({ ok: true });
    } catch {
      return reply.status(404).send({ error: `Template ${theme}/${id} not found` });
    }
  });

  /**
   * GET /api/themes
   */
  fastify.get('/api/themes', async (_req, reply) => {
    const names = listThemes();
    const result = names.map((name) => {
      try {
        const tokens = loadTheme(name);
        return { name, tokens };
      } catch {
        return { name, tokens: null };
      }
    });
    return reply.send(result);
  });
};

export default templatesRoutes;
