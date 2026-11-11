import { z } from "zod";

/**
 * The API's error body, `{ error }`, which `ui/src/lib/api.ts` reads. A route declares it for each 4xx
 * its handler sends itself; the error handler's replies on that status go through it too.
 */
export const errorSchema = z.object({ error: z.string() });
