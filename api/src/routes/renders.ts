import type { FastifyPluginAsync } from 'fastify';
import { basename, join, resolve, sep } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { latestRender, latestRenders, THUMB_FILE, type RenderRecord } from '@newspapper/core';
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
  /**
   * What the post grid shows: the run's small `thumb.jpg` when it has one, else
   * its first slide (runs rendered before thumbnails existed), else null.
   */
  thumb: string | null;
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

/** `/output/<dir>/thumb.jpg` if the run has one, with the same containment
 * check as the slides. */
function thumbFile(outputDir: string): string | null {
  const dir = resolve(outputDir);
  if (dir !== outputRoot && !dir.startsWith(outputRoot + sep)) return null;
  return existsSync(join(dir, THUMB_FILE)) ? `/output/${basename(dir)}/${THUMB_FILE}` : null;
}

function toSummary(render: RenderRecord): RenderSummary {
  const files = slideFiles(render.outputDir);
  return {
    id: render.id,
    postId: render.postId,
    slideCount: render.slideCount,
    optimized: render.optimized,
    createdAt: render.createdAt,
    files,
    thumb: thumbFile(render.outputDir) ?? files[0] ?? null,
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

    // One query for every post's newest render (brief 95). This used to list
    // up to 500 posts only to call latestRender once per post.
    return reply.send(latestRenders(db()).map(toSummary));
  });
};

export default rendersRoutes;
