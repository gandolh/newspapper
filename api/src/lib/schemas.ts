import { z } from "zod";

/**
 * The API's error body, `{ error }`, which `ui/src/lib/api.ts` reads. A route declares it for each 4xx
 * its handler sends itself; the error handler's replies on that status go through it too.
 */
export const errorSchema = z.object({ error: z.string() });

/**
 * A query-string value given at most once. Fastify parses `?q=a&q=b` into an array, which the store
 * can't take; this answers it with a 400 instead.
 */
export const queryString = z.string({ error: "Each query parameter may be given once" }).optional();

/**
 * An optional integer in a query string. Blank counts as absent, as the handlers' `||` checks did, and
 * anything `Number()` can't make an integer of is a 400 with `message`.
 */
export function queryInteger(message: string) {
  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number<unknown>({ error: message }).int({ error: message }).optional(),
  );
}
