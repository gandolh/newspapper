import { parseUploadRef } from "@newspapper/core";
import { z } from "zod";

const uploadFields = {
  id: z.number(),
  ref: z.string(),
  filename: z.string(),
  mime: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  bytes: z.number(),
  createdAt: z.string(),
  /** The value to write into `<Image src="...">`. */
  src: z.string(),
  /** Normalized bytes: what the renderer and the picker load. */
  url: z.string(),
  /** The untouched upload. */
  originalUrl: z.string(),
};

export const uploadSchema = z.object(uploadFields);
export const uploadListSchema = z.array(uploadSchema);

/** `POST /api/uploads`: the stored upload, and the original's own size. */
export const storedUploadSchema = z.object({
  ...uploadFields,
  original: z.object({ width: z.number(), height: z.number(), bytes: z.number() }),
});

/** An upload's 4xx: `code` names a rejection the UI can tell apart (`file_too_large`, `unreadable_image`). */
export const uploadErrorSchema = z.object({ error: z.string(), code: z.string().optional() });

/** `Number(value)`, when it is a whole number from 0 up, at most `max`; otherwise `fallback`, never a 400. */
function lenientCount(fallback: number, max: number) {
  return z.coerce
    .number<unknown>()
    .int()
    .min(0)
    .catch(fallback)
    .transform((n) => Math.min(n, max));
}

/** `GET /api/uploads?limit=&offset=`: a bad value falls back to the default, as it always has. */
export const uploadQuerySchema = z.object({
  limit: lenientCount(100, 500),
  offset: lenientCount(0, Number.MAX_SAFE_INTEGER),
});

const id = "id must be an integer";
/** A path id: any integer by `Number()` (0 and below are a 404), anything else a 400. */
export const uploadParamsSchema = z.object({ id: z.coerce.number<string>({ error: id }).int({ error: id }) });

/** `/uploads/:ref`: the ref, with an `/uploads/` prefix or an image extension taken off, or null for a 404. */
export const refParamsSchema = z.object({ ref: z.string().transform(parseUploadRef) });

export const deletedSchema = z.object({ id: z.number(), deleted: z.literal(true) });
