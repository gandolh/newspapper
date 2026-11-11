import { hasZodFastifySchemaValidationErrors, ResponseSerializationError } from "@fastify/type-provider-zod";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

/**
 * The one error handler. Wrapped in fastify-plugin so it is set on the root, and registered first, so
 * every route inherits it. (Until 2026-11-11 it was set after the routes, and a route plugin
 * registered before it kept Fastify's default handler, which sends a 500's message: a thrown
 * "Post NaN not found" or an SQLite error reached the client.)
 *
 * The body is `{ error: string }`, which `ui/src/lib/api.ts` reads and shows.
 *
 * - A request that fails its route schema answers 400 with the first issue's message. Every schema
 *   in a feature's `schemas.ts` writes its own messages, naming the field the way the handlers'
 *   checks did ("title is required"), so a 400 reads as it did before the schemas.
 * - A 4xx carries a message a route, Fastify or a plugin chose to show the caller: bad JSON, a body
 *   too large.
 * - A 5xx is a fault, and its message is whatever the exception said: SQL fragments, file paths,
 *   "Cannot read properties of null". That stays in the server log, never in the response. A reply
 *   its response schema refuses is such a 500, logged with the schema's issues.
 */
const errorHandling: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((err: Error & { statusCode?: number }, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      const [first] = err.validation;
      void reply.status(400).send({ error: first?.message ?? "The request is not valid." });
      return;
    }
    const status = err.statusCode ?? 500;
    if (err instanceof ResponseSerializationError) {
      // A handler sent what its response schema doesn't allow: a bug to fix, never the client's fault.
      request.log.error(
        { err, issues: err.cause.issues },
        `${err.method} ${err.url}: the reply doesn't match its schema`,
      );
    } else {
      request.log.error(err);
    }
    void reply.status(status).send({ error: status >= 500 ? "Internal Server Error" : err.message });
  });
};

export const errors = fp(errorHandling, { name: "errors" });
