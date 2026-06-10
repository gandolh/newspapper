import type { FastifyPluginAsync } from 'fastify';
import {
  loadTemplate,
  loadTheme,
  renderTemplate,
  validateTemplateDoc,
  getSettings,
} from '@newspapper/core';
import type { TemplateDoc } from '@newspapper/core';

const PORT = Number(process.env.PORT ?? 3001);

const previewRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/preview
   * Body: { templateId?, doc?, data, theme?, index?, total? }
   * Returns self-contained HTML (no DB writes).
   */
  fastify.post('/api/preview', async (req, reply) => {
    const body = req.body as {
      templateId?: string;
      doc?: unknown;
      data?: Record<string, unknown>;
      theme?: string;
      index?: number;
      total?: number;
    };

    const s = getSettings();
    const theme = body?.theme ?? s.defaultTheme;
    const index = body?.index ?? 1;
    const total = body?.total ?? 1;
    const fontBaseUrl = `http://localhost:${PORT}/assets/fonts`;

    let doc: TemplateDoc;
    try {
      if (body?.doc) {
        doc = validateTemplateDoc(body.doc);
      } else if (body?.templateId) {
        doc = loadTemplate(theme, body.templateId);
      } else {
        return reply.status(400).send({ error: 'templateId or doc is required' });
      }
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }

    let themeObj;
    try {
      themeObj = loadTheme(theme);
    } catch (err) {
      return reply.status(400).send({ error: `Theme not found: ${(err as Error).message}` });
    }

    // Use provided data or fall back to doc's sample when data is empty/missing
    const data: Record<string, unknown> =
      body?.data && Object.keys(body.data).length > 0 ? body.data : (doc.sample as Record<string, unknown>);

    try {
      const html = renderTemplate(doc, data, themeObj, { index, total, fontBaseUrl });
      reply.header('Content-Type', 'text/html');
      return reply.send(html);
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });
};

export default previewRoutes;
