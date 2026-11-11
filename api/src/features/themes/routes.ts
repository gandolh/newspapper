import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { loadTheme, listThemes } from "@newspapper/core";
import { themeListSchema } from "./schemas.js";

export const themesRoutes: FastifyPluginAsyncZod = async (fastify) => {
  /**
   * GET /api/themes
   */
  fastify.get("/api/themes", { schema: { response: { 200: themeListSchema } } }, async (_req, reply) => {
    const names = listThemes();
    const result = names.map((name) => {
      try {
        // Spread into a plain object: the loose schema takes any keys, and an interface type has no index signature.
        return { name, tokens: { ...loadTheme(name) } };
      } catch {
        return { name, tokens: null };
      }
    });
    return reply.send(result);
  });
};
