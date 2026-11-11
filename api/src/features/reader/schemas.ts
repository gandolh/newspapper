import { z } from "zod";
import { queryString } from "../../lib/schemas.js";

const itemFields = {
  id: z.number(),
  sourceId: z.string(),
  sourceName: z.string(),
  title: z.string(),
  url: z.string(),
  author: z.string().nullable(),
};

/** `GET /api/reader/items`: a page of summaries, never an item's HTML. */
export const feedItemPageSchema = z.object({
  items: z.array(
    z.object({
      ...itemFields,
      publishedAt: z.string().nullable(),
      sortAt: z.string(),
      read: z.boolean(),
      saved: z.boolean(),
      excerpt: z.string(),
    }),
  ),
  nextCursor: z.string().nullable(),
});

/** `GET /api/reader/items/:id`: one item in full, its HTML included, in the store's key order. */
export const feedItemSchema = z.object({
  id: itemFields.id,
  sourceId: itemFields.sourceId,
  sourceName: itemFields.sourceName,
  guid: z.string(),
  title: itemFields.title,
  url: itemFields.url,
  author: itemFields.author,
  contentHtml: z.string(),
  contentText: z.string(),
  publishedAt: z.string().nullable(),
  fetchedAt: z.string(),
  sortAt: z.string(),
  readAt: z.string().nullable(),
  read: z.boolean(),
  saved: z.boolean(),
  articleId: z.number().nullable(),
});

const once = "Each query parameter may be given once";
const limit = "limit must be an integer";

/**
 * `?scope=unread|all&sourceId=&category=&q=&cursor=&limit=`, with the handler's old messages.
 * `category` absent means no filter and blank means uncategorized, so it is passed through as given.
 */
export const itemQuerySchema = z.object({
  scope: z.enum(["", "unread", "all"], { error: 'scope must be "unread" or "all"' }).optional(),
  sourceId: queryString,
  category: queryString,
  q: queryString,
  cursor: queryString,
  limit: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .string({ error: once })
      .pipe(z.coerce.number<string>({ error: limit }).int({ error: limit }))
      .optional(),
  ),
});

const read = "read must be true or false";
export const readPatchSchema = z.object({ read: z.boolean({ error: read }) }, { error: read });
export const readStateSchema = z.object({ id: z.number(), read: z.boolean() });

const upToId = "upToId must be a non-negative integer";
const strings = "sourceId and category must be strings";

/**
 * `POST /api/reader/mark-read  { upToId, sourceId? | category? }`. `category: null` means the
 * uncategorized sources; giving both narrowings is a 400.
 */
export const markReadSchema = z
  .object(
    {
      upToId: z.number({ error: upToId }).int({ error: upToId }).min(0, { error: upToId }),
      sourceId: z.string({ error: strings }).optional(),
      category: z.string({ error: strings }).nullable().optional(),
    },
    { error: upToId },
  )
  .refine((body) => body.sourceId === undefined || body.category === undefined, {
    error: "Give sourceId or category, not both",
  });

export const markedSchema = z.object({ marked: z.number() });

/** `GET /api/reader/counts`: unread per source, every source present. */
export const readerCountsSchema = z.object({
  unread: z.number(),
  all: z.number(),
  unreadBySource: z.record(z.string(), z.number()),
});

/** `POST /api/reader/items/:id/save  { note? }`: no body saves with no note. */
export const saveItemSchema = z.object({ note: z.string({ error: "note must be a string" }).optional() }).nullish();

/** `POST /api/reader/refresh  { sourceId? }`: one source, or every enabled one. */
export const refreshSchema = z
  .object({ sourceId: z.string({ error: "sourceId must be a string" }).optional() })
  .nullish();
