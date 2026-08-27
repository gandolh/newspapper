import type { FastifyPluginAsync } from 'fastify';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  findPost,
  latestRender,
  recordRender,
  loadTheme,
  parseOrThrow,
  compileDocument,
  renderTemplate,
  renderSlides,
  resolveImageUrls,
  zipRun,
  uploadsBaseUrl,
  todayLocal,
} from '@newspapper/core';
import { db } from '../lib/db.js';
import { sseHeaders, sseWrite, sseDone, sseError } from '../lib/sse.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const outputPrefix = resolve(repoRoot, 'output');

const PORT = Number(process.env.PORT ?? 3001);

function formatCaption(head: Record<string, string>): string | undefined {
  const caption = head['caption'];
  if (!caption) return undefined;
  const hashtags = head['hashtags'];
  return hashtags ? `${caption}\n\n${hashtags}` : caption;
}

const renderRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/posts/:id/render  (SSE)
   * Compiles the post's `.wzd` markup and renders every slide to JPEG.
   */
  fastify.post('/api/posts/:id/render', async (req, reply) => {
    sseHeaders(reply);
    const { id } = req.params as { id: string };
    const post = findPost(db(), Number(id));
    if (!post) {
      sseError(reply, 'Post not found');
      return;
    }

    let theme;
    try {
      theme = loadTheme(post.theme);
    } catch (err) {
      sseError(reply, `Theme not found: ${(err as Error).message}`);
      return;
    }

    let head: Record<string, string>;
    let slides;
    try {
      const doc = parseOrThrow(post.markup);
      head = doc.head;
      slides = compileDocument(doc, theme);
    } catch (err) {
      sseError(reply, `Could not compile this post: ${(err as Error).message}`);
      return;
    }

    if (slides.length === 0) {
      sseError(reply, 'This post has no slides.');
      return;
    }

    const total = slides.length;
    const fontBaseUrl = `http://localhost:${PORT}/assets/fonts`;
    const uploadBase = uploadsBaseUrl();
    const htmlList = slides.map((root, i) =>
      renderTemplate(resolveImageUrls(root, uploadBase), {}, theme, {
        index: i + 1,
        total,
        fontBaseUrl,
      }),
    );

    const date = head['date'] || todayLocal();
    const caption = formatCaption(head);

    try {
      const result = await renderSlides(htmlList, {
        date,
        slidesJson: { title: post.title, theme: post.theme, head },
        caption,
        onProgress: (done, doneTotal) => {
          sseWrite(reply, 'progress', { done, total: doneTotal });
        },
      });

      const render = recordRender(db(), {
        postId: post.id,
        outputDir: result.dir,
        slideCount: total,
      });

      const files = result.files
        .filter((f) => f.endsWith('.jpg'))
        .map((f) => `/output${f.slice(outputPrefix.length)}`);

      sseDone(reply, { post, render, files });
    } catch (err) {
      sseError(reply, (err as Error).message);
    }
  });

  /**
   * GET /api/posts/:id/export.zip — the latest render's JPEGs + caption.
   */
  fastify.get('/api/posts/:id/export.zip', async (req, reply) => {
    const { id } = req.params as { id: string };
    const post = findPost(db(), Number(id));
    if (!post) return reply.status(404).send({ error: 'Post not found' });

    const render = latestRender(db(), post.id);
    if (!render) {
      return reply.status(404).send({ error: 'Post has not been rendered yet' });
    }
    if (!existsSync(render.outputDir)) {
      return reply.status(404).send({ error: 'Output directory no longer exists' });
    }

    const buf = await zipRun(render.outputDir);
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename="newspapper-post-${post.id}.zip"`);
    return reply.send(buf);
  });
};

export default renderRoutes;
