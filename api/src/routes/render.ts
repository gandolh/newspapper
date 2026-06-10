import type { FastifyPluginAsync } from 'fastify';
import { resolve, basename } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  getPost,
  markRendered,
  loadTemplate,
  loadTheme,
  renderTemplate,
  renderSlides,
  zipRun,
  getSettings,
  OllamaError,
} from '@newspapper/core';
import type { SlideBlock } from '@newspapper/core';
import { db } from '../lib/db.js';
import { sseHeaders, sseWrite, sseDone, sseError } from '../lib/sse.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

const PORT = Number(process.env.PORT ?? 3001);

function formatCaption(payload: { caption?: string; hashtags?: string[] }): string | undefined {
  if (!payload.caption) return undefined;
  const tags = (payload.hashtags ?? []).map((t) => `#${t}`).join(' ');
  if (tags) return `${payload.caption}\n\n${tags}`;
  return payload.caption;
}

const renderRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/posts/:id/render  (SSE)
   */
  fastify.post('/api/posts/:id/render', async (req, reply) => {
    sseHeaders(reply);
    const { id } = req.params as { id: string };
    const post = getPost(db(), Number(id));
    if (!post) {
      sseError(reply, 'Post not found');
      return;
    }

    const s = getSettings();
    const theme = post.payload.theme ?? s.defaultTheme;
    let themeObj;
    try {
      themeObj = loadTheme(theme);
    } catch (err) {
      sseError(reply, `Theme not found: ${(err as Error).message}`);
      return;
    }

    const slides = post.payload.slides as SlideBlock[];
    const total = slides.length;
    const fontBaseUrl = `http://localhost:${PORT}/assets/fonts`;
    const htmlList: string[] = [];

    try {
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const doc = loadTemplate(theme, slide.variant);
        const html = renderTemplate(doc, slide as unknown as Record<string, unknown>, themeObj, {
          index: i + 1,
          total,
          fontBaseUrl,
        });
        htmlList.push(html);
      }
    } catch (err) {
      sseError(reply, `Template error: ${(err as Error).message}`);
      return;
    }

    try {
      const caption = formatCaption(post.payload);
      const result = await renderSlides(htmlList, {
        date: post.date,
        slidesJson: post.payload,
        caption,
        onProgress: (done, total) => {
          sseWrite(reply, 'progress', { done, total });
        },
      });

      const updatedPost = markRendered(db(), Number(id), result.dir);

      // Build URL paths for PNG files only
      const outputPrefix = resolve(repoRoot, 'output');
      const files = result.files
        .filter((f) => f.endsWith('.png'))
        .map((f) => {
          const rel = f.startsWith(outputPrefix) ? f.slice(outputPrefix.length) : `/${basename(f)}`;
          return `/output${rel}`;
        });

      sseDone(reply, { post: updatedPost, files });
    } catch (err) {
      if (err instanceof OllamaError) {
        sseError(reply, (err as Error).message);
      } else {
        sseError(reply, (err as Error).message);
      }
    }
  });

  /**
   * GET /api/posts/:id/export.zip
   */
  fastify.get('/api/posts/:id/export.zip', async (req, reply) => {
    const { id } = req.params as { id: string };
    const post = getPost(db(), Number(id));
    if (!post) return reply.status(404).send({ error: 'Post not found' });
    if (post.status !== 'rendered' || !post.outputDir) {
      return reply.status(404).send({ error: 'Post has not been rendered yet' });
    }
    if (!existsSync(post.outputDir)) {
      return reply.status(404).send({ error: 'Output directory no longer exists' });
    }
    const buf = await zipRun(post.outputDir);
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename="newspapper-${post.date}.zip"`);
    return reply.send(buf);
  });
};

export default renderRoutes;
