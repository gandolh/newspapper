import { z } from "zod";

/** `GET /api/renders`: each post's latest render, as the post library shows it. No `outputDir`. */
export const renderSummaryListSchema = z.array(
  z.object({
    id: z.number(),
    postId: z.number(),
    slideCount: z.number(),
    optimized: z.boolean(),
    createdAt: z.string(),
    files: z.array(z.string()),
    thumb: z.string().nullable(),
  }),
);

const postId = "postId must be an integer";
/** `?postId=`: `Number()` of it must be an integer, as the handler checked (blank is 0, as before). */
export const renderQuerySchema = z.object({
  postId: z.coerce.number<unknown>({ error: postId }).int({ error: postId }).optional(),
});

/** A path id the handlers turn into a row id; a non-numeric one is their "Post not found", as before. */
export const renderParamsSchema = z.object({ id: z.string() });
