import { z } from "zod";

/** A source as `listSources` returns it: its config and the Reader's last refresh of it. */
const sourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  rss: z.string(),
  enabled: z.boolean(),
  category: z.string().nullable(),
  lastFetchedAt: z.string().nullable(),
  lastError: z.string().nullable(),
});

/** Every write answers with the whole list, as `GET /api/sources` does. */
export const sourceListSchema = z.array(sourceSchema);

export const sourceParamsSchema = z.object({ id: z.string() });

const required = "id, name, and rss are required";
const category = z.string({ error: "category must be a string" }).nullable().optional();
const enabled = z.boolean({ error: "enabled must be true or false" }).optional();

/**
 * `POST /api/sources`. A blank or absent category is stored as uncategorized (null); `enabled` defaults to
 * true. The messages are the handler's old ones, so a 400 reads the same.
 */
export const sourceInputSchema = z.object(
  {
    id: z.string({ error: required }).min(1, required),
    name: z.string({ error: required }).min(1, required),
    rss: z.string({ error: required }).min(1, required),
    enabled,
    category,
  },
  { error: required },
);

/** `PUT /api/sources/:id`: a partial patch. No body changes nothing, as before the schema. */
export const sourcePatchSchema = z
  .object({
    name: z.string({ error: "name must be a string" }).optional(),
    rss: z.string({ error: "rss must be a string" }).optional(),
    enabled,
    category,
  })
  .nullish();

/** `POST /api/sources/:id/ping`: whether the feed answered, and how fast. */
export const pingSchema = z.object({
  ok: z.boolean(),
  itemCount: z.number().optional(),
  error: z.string().optional(),
  latencyMs: z.number(),
});
