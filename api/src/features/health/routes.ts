import type { FastifyPluginAsync } from "fastify";

export const health: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/health", async (_req, reply) => {
    return reply.send({ ok: true });
  });
};
