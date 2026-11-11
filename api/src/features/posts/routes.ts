import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import {
  createPost,
  findPost,
  listThemes,
  parse,
  queryPostSummaries,
  removePost,
  setPostStatus,
  updatePost,
  type PostInput,
} from "@newspapper/core";
import { db } from "../../lib/db.js";
import { errorSchema } from "../../lib/schemas.js";
import {
  deletedSchema,
  postInputSchema,
  postParamsSchema,
  postQuerySchema,
  postSchema,
  postSummaryListSchema,
  statusInputSchema,
} from "./schemas.js";

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
  const keywords = (head["keywords"] ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  return {
    title: head["title"]?.trim() || "Untitled post",
    description: head["description"] ?? "",
    markup,
    theme,
    keywords,
  };
}

/**
 * An omitted or blank theme means "leave it to the column default"; anything
 * else must name a theme on disk. `loadTheme` throws at render time otherwise,
 * which would turn a bad save into a failure two steps later.
 */
function themeOf(theme: string | null | undefined): string | undefined {
  const trimmed = theme?.trim();
  return trimmed === "" ? undefined : trimmed;
}

function unknownTheme(theme: string | undefined): boolean {
  return theme !== undefined && !listThemes().includes(theme);
}

export const postsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  /**
   * GET /api/posts?status=&keyword=&search=&limit=&offset=
   */
  fastify.get(
    "/api/posts",
    { schema: { querystring: postQuerySchema, response: { 200: postSummaryListSchema } } },
    async (req, reply) => {
      const query = req.query;
      const status = query.status === "draft" || query.status === "published" ? query.status : undefined;
      // Summaries, without each post's markup: the grid never reads it, and it
      // was most of the payload. `GET /api/posts/:id` still returns the full post.
      return reply.send(
        queryPostSummaries(db(), {
          status,
          keyword: query.keyword,
          search: query.search,
          limit: query.limit,
          offset: query.offset,
        }),
      );
    },
  );

  /**
   * POST /api/posts  { markup, theme? }
   */
  fastify.post(
    "/api/posts",
    { schema: { body: postInputSchema, response: { 201: postSchema, 400: errorSchema } } },
    async (req, reply) => {
      const theme = themeOf(req.body.theme);
      if (unknownTheme(theme)) {
        return reply.status(400).send({ error: `Unknown theme: "${theme}"` });
      }
      const post = createPost(db(), deriveInput(req.body.markup, theme));
      return reply.status(201).send(post);
    },
  );

  /**
   * GET /api/posts/:id
   */
  fastify.get(
    "/api/posts/:id",
    { schema: { params: postParamsSchema, response: { 200: postSchema, 404: errorSchema } } },
    async (req, reply) => {
      const id = Number(req.params.id);
      const post = Number.isInteger(id) ? findPost(db(), id) : undefined;
      if (!post) return reply.status(404).send({ error: "Post not found" });
      return reply.send(post);
    },
  );

  /**
   * PUT /api/posts/:id  { markup, theme? }
   */
  fastify.put(
    "/api/posts/:id",
    {
      schema: {
        params: postParamsSchema,
        body: postInputSchema,
        response: { 200: postSchema, 400: errorSchema, 404: errorSchema },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const theme = themeOf(req.body.theme);
      if (unknownTheme(theme)) {
        return reply.status(400).send({ error: `Unknown theme: "${theme}"` });
      }
      const existing = Number.isInteger(id) ? findPost(db(), id) : undefined;
      if (!existing) return reply.status(404).send({ error: "Post not found" });

      const updated = updatePost(db(), id, deriveInput(req.body.markup, theme ?? existing.theme));
      if (!updated) return reply.status(404).send({ error: "Post not found" });
      return reply.send(updated);
    },
  );

  /**
   * PUT /api/posts/:id/status  { status: 'draft' | 'published' }
   */
  fastify.put(
    "/api/posts/:id/status",
    {
      schema: {
        params: postParamsSchema,
        body: statusInputSchema,
        response: { 200: postSchema, 404: errorSchema },
      },
    },
    async (req, reply) => {
      const id = Number(req.params.id);
      const updated = Number.isInteger(id) ? setPostStatus(db(), id, req.body.status) : undefined;
      if (!updated) return reply.status(404).send({ error: "Post not found" });
      return reply.send(updated);
    },
  );

  /**
   * DELETE /api/posts/:id — render records and keyword links cascade away.
   */
  fastify.delete(
    "/api/posts/:id",
    { schema: { params: postParamsSchema, response: { 200: deletedSchema, 404: errorSchema } } },
    async (req, reply) => {
      const id = Number(req.params.id);
      const deleted = Number.isInteger(id) ? removePost(db(), id) : undefined;
      if (!deleted) return reply.status(404).send({ error: "Post not found" });
      return reply.send({ id, deleted: true });
    },
  );
};
