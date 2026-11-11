import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { healthSchema } from "./schemas.js";

export const health: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get("/api/health", { schema: { response: { 200: healthSchema } } }, async (_req, reply) => {
    return reply.send({ ok: true });
  });
};
