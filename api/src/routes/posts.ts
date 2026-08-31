import type { FastifyPluginAsync } from 'fastify';
import {
  createPost,
  findPost,
  listThemes,
  parse,
  queryPosts,
  removePost,
  setPostStatus,
  updatePost,
  type PostInput,
  type PostStatus,
} from '@newspapper/core';
import { db } from '../lib/db.js';

/**
 * The index columns are derived from the markup's `<head>`, server-side, so a
 * client cannot save a post whose title disagrees with its own document. The
 * markup stays the source of truth; these columns exist to list and search.
 *
 * A post is saved on a debounce while it is being written, so a `<head>` that
 * is half-typed must not fail the write — a missing title falls back rather
 * than 400ing. The linter is what tells the author their title is missing.
 */
function deriveInput(markup: string, theme?: string): PostInput {
  const { head } = parse(markup).doc;
  const keywords = (head['keywords'] ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  return {
    title: head['title']?.trim() || 'Untitled post',
    description: head['description'] ?? '',
    markup,
    theme,
    keywords,
  };
}

function markupOf(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const markup = (body as { markup?: unknown }).markup;
  return typeof markup === 'string' ? markup : null;
}

/**
 * An omitted or blank theme means "leave it to the column default"; anything
 * else must name a theme on disk. `loadTheme` throws at render time otherwise,
 * which would turn a bad save into a failure two steps later.
 */
function themeOf(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const theme = (body as { theme?: unknown }).theme;
  if (typeof theme !== 'string') return undefined;
  const trimmed = theme.trim();
  return trimmed === '' ? undefined : trimmed;
}

function unknownTheme(theme: string | undefined): boolean {
  return theme !== undefined && !listThemes().includes(theme);
}

const postsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/posts?status=&keyword=&search=&limit=&offset=
   */
  fastify.get('/api/posts', async (req, reply) => {
    const query = req.query as {
      status?: string;
      keyword?: string;
      search?: string;
      limit?: string;
      offset?: string;
    };
    const status =
      query.status === 'draft' || query.status === 'published'
        ? (query.status as PostStatus)
        : undefined;
    return reply.send(
      queryPosts(db(), {
        status,
        keyword: query.keyword,
        search: query.search,
        limit: query.limit === undefined ? undefined : Number(query.limit),
        offset: query.offset === undefined ? undefined : Number(query.offset),
      }),
    );
  });

  /**
   * POST /api/posts  { markup, theme? }
   */
  fastify.post('/api/posts', async (req, reply) => {
    const markup = markupOf(req.body);
    if (markup === null) {
      return reply.status(400).send({ error: 'markup is required and must be a string' });
    }
    const theme = themeOf(req.body);
    if (unknownTheme(theme)) {
      return reply.status(400).send({ error: `Unknown theme: "${theme}"` });
    }
    const post = createPost(db(), deriveInput(markup, theme));
    return reply.status(201).send(post);
  });

  /**
   * GET /api/posts/:id
   */
  fastify.get('/api/posts/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const post = Number.isInteger(id) ? findPost(db(), id) : undefined;
    if (!post) return reply.status(404).send({ error: 'Post not found' });
    return reply.send(post);
  });

  /**
   * PUT /api/posts/:id  { markup, theme? }
   */
  fastify.put('/api/posts/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const markup = markupOf(req.body);
    if (markup === null) {
      return reply.status(400).send({ error: 'markup is required and must be a string' });
    }
    const theme = themeOf(req.body);
    if (unknownTheme(theme)) {
      return reply.status(400).send({ error: `Unknown theme: "${theme}"` });
    }
    const existing = Number.isInteger(id) ? findPost(db(), id) : undefined;
    if (!existing) return reply.status(404).send({ error: 'Post not found' });

    const updated = updatePost(db(), id, deriveInput(markup, theme ?? existing.theme));
    if (!updated) return reply.status(404).send({ error: 'Post not found' });
    return reply.send(updated);
  });

  /**
   * PUT /api/posts/:id/status  { status: 'draft' | 'published' }
   */
  fastify.put('/api/posts/:id/status', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const { status } = (req.body ?? {}) as { status?: string };
    if (status !== 'draft' && status !== 'published') {
      return reply.status(400).send({ error: "status must be 'draft' or 'published'" });
    }
    const updated = Number.isInteger(id) ? setPostStatus(db(), id, status) : undefined;
    if (!updated) return reply.status(404).send({ error: 'Post not found' });
    return reply.send(updated);
  });

  /**
   * DELETE /api/posts/:id — render records and keyword links cascade away.
   */
  fastify.delete('/api/posts/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const deleted = Number.isInteger(id) ? removePost(db(), id) : undefined;
    if (!deleted) return reply.status(404).send({ error: 'Post not found' });
    return reply.send({ id, deleted: true });
  });
};

export default postsRoutes;
