import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

/**
 * The one error handler. Wrapped in fastify-plugin so it is set on the root, and registered first, so
 * every route inherits it. (Until 2026-11-11 it was set after the routes, and a route plugin
 * registered before it kept Fastify's default handler, which sends a 500's message: a thrown
 * "Post NaN not found" or an SQLite error reached the client.)
 *
 * The body is `{ error: string }`, which `ui/src/lib/api.ts` reads. A 4xx carries a message a
 * route, Fastify or a plugin chose to show the caller: bad JSON, a body too large. A 5xx is a fault,
 * and its message is whatever the exception said: SQL fragments, file paths, "Cannot read
 * properties of null". That stays in the server log, never in the response.
 */
const errorHandling: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((err: Error & { statusCode?: number }, request, reply) => {
    const status = err.statusCode ?? 500;
    request.log.error(err);
    void reply.status(status).send({ error: status >= 500 ? "Internal Server Error" : err.message });
  });
};

export const errors = fp(errorHandling, { name: "errors" });
