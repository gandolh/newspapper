import { z } from "zod";
import { queryInteger, queryString } from "../../lib/schemas.js";

const postFields = {
  id: z.number(),
  title: z.string(),
  description: z.string(),
  theme: z.string(),
  status: z.enum(["draft", "published"]),
  keywords: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
};

/** A post in full, its markup last, as the store builds it. */
export const postSchema = z.object({ ...postFields, markup: z.string() });

/** `GET /api/posts`: summaries, without each post's markup. */
export const postSummaryListSchema = z.array(z.object(postFields));

export const postQuerySchema = z.object({
  status: queryString,
  keyword: queryString,
  search: queryString,
  limit: queryInteger("limit must be an integer"),
  offset: queryInteger("offset must be an integer"),
});

/** A path id the handler turns into a row id; a non-numeric one is a 404 there, as before. */
export const postParamsSchema = z.object({ id: z.string() });

const markup = "markup is required and must be a string";

/**
 * `POST /api/posts` and `PUT /api/posts/:id`. A blank or absent theme means the column default;
 * whether a named theme is on disk is the handler's check. The markup message is the handler's old one.
 */
export const postInputSchema = z.object(
  {
    markup: z.string({ error: markup }),
    theme: z.string({ error: "theme must be a string" }).nullish(),
  },
  { error: markup },
);

const status = "status must be 'draft' or 'published'";
export const statusInputSchema = z.object(
  { status: z.enum(["draft", "published"], { error: status }) },
  { error: status },
);

export const deletedSchema = z.object({ id: z.number(), deleted: z.literal(true) });

/**
 * `POST /api/posts/:id/publish`: the post, the render it published and how many slides it re-encoded.
 * The render's `outputDir` is a server path, which no client reads: the schema leaves it out, as
 * `GET /api/renders` always has.
 */
export const publishResultSchema = z.object({
  post: postSchema,
  render: z.object({
    id: z.number(),
    postId: z.number(),
    slideCount: z.number(),
    optimized: z.boolean(),
    createdAt: z.string(),
  }),
  reencoded: z.number(),
});
