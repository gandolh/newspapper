import { z } from "zod";
import { queryInteger, queryString } from "../../lib/schemas.js";

/** A saved article in full: `POST`, `PATCH` and the Reader's save answer with it. */
export const articleSchema = z.object({
  id: z.number(),
  sourceId: z.string().nullable(),
  sourceName: z.string(),
  guid: z.string(),
  title: z.string(),
  url: z.string().nullable(),
  body: z.string(),
  publishedAt: z.string(),
  savedAt: z.string(),
  note: z.string(),
});

/** `GET /api/articles`: the library list, with an excerpt in place of the body. */
export const articleSummaryListSchema = z.array(
  z.object({
    id: z.number(),
    sourceId: z.string().nullable(),
    sourceName: z.string(),
    guid: z.string(),
    title: z.string(),
    url: z.string().nullable(),
    publishedAt: z.string(),
    savedAt: z.string(),
    note: z.string(),
    excerpt: z.string(),
  }),
);

export const articleQuerySchema = z.object({
  sourceId: queryString,
  search: queryString,
  limit: queryInteger("limit must be an integer"),
  offset: queryInteger("offset must be an integer"),
});

const title = "title is required";
const optionalText = (field: string) => z.string({ error: `${field} must be a string` }).optional();

/**
 * `POST /api/articles`: a search result, or an article typed by hand. Only the title is required; the
 * messages for it and the note are the handler's old ones.
 */
export const articleInputSchema = z.object(
  {
    title: z.string({ error: title }).min(1, title),
    note: optionalText("note"),
    sourceId: z.string({ error: "sourceId must be a string" }).nullable().optional(),
    sourceName: optionalText("sourceName"),
    guid: optionalText("guid"),
    url: z.string({ error: "url must be a string" }).nullable().optional(),
    body: optionalText("body"),
    publishedAt: optionalText("publishedAt"),
  },
  { error: title },
);

/** A path id the handler turns into a row id; a non-numeric one is a 404 there, as before. */
export const articleParamsSchema = z.object({ id: z.string() });

const note = "note must be a string";
export const notePatchSchema = z.object({ note: z.string({ error: note }) }, { error: note });

export const okSchema = z.object({ ok: z.literal(true) });
