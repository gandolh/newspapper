import type { FastifyPluginAsync } from 'fastify';
import { basename, resolve, sep } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { latestRender, queryPosts, type RenderRecord } from '@newspapper/core';
import { db } from '../lib/db.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const outputRoot = resolve(__dirname, '../../..', 'output');

const SLIDE_FILE = /^slide-\d+\.jpg$/i;

export interface RenderSummary {
  id: number;
  postId: number;
  slideCount: number;
  optimized: boolean;
  createdAt: string;
  /** `/output/<dir>/slide-NN.jpg` for every slide still on disk, in order. */
  files: string[];
}

/**
 * Read the run directory rather than reconstruct filenames from `slideCount`:
 * a pre-brief-57 run holds `1.png`, and a run whose directory was cleaned out
 * holds nothing. Either way the list page must show what exists, not what the
 * row claims.
 */
function slideFiles(outputDir: string): string[] {
  const dir = resolve(outputDir);
  if (dir !== outputRoot && !dir.startsWith(outputRoot + sep)) return [];
  if (!existsSync(dir)) return [];
  const name = basename(dir);
  return readdirSync(dir)
    .filter((f) => SLIDE_FILE.test(f))
    .sort()
    .map((f) => `/output/${name}/${f}`);
}

function toSummary(render: RenderRecord): RenderSummary {
  return {
    id: render.id,
    postId: render.postId,
    slideCount: render.slideCount,
    optimized: render.optimized,
    createdAt: render.createdAt,
    files: slideFiles(render.outputDir),
  };
}

const rendersRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/renders?postId=
   *
   * The latest render of every post that has one, so the post library can show
   * a thumbnail and decide whether export and publish are available without a
   * request per row. `outputDir` is deliberately absent — it is a server path.
   */
  fastify.get('/api/renders', async (req, reply) => {
    const { postId } = req.query as { postId?: string };

    if (postId !== undefined) {
      const id = Number(postId);
      if (!Number.isInteger(id))
        return reply.status(400).send({ error: 'postId must be an integer' });
      const render = latestRender(db(), id);
      return reply.send(render ? [toSummary(render)] : []);
    }

    const summaries: RenderSummary[] = [];
    for (const post of queryPosts(db(), { limit: 500 })) {
      const render = latestRender(db(), post.id);
      if (render) summaries.push(toSummary(render));
    }
    return reply.send(summaries);
  });
};

export default rendersRoutes;
