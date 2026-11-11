import { z } from "zod";

/**
 * `GET /api/themes`: each slide theme on disk with its tokens, passed through whole as a loose object,
 * or `null` when its file doesn't load.
 */
export const themeListSchema = z.array(z.object({ name: z.string(), tokens: z.looseObject({}).nullable() }));
