import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { getSettings, listThemes, saveSettings } from "@newspapper/core";
import { errorSchema } from "../../lib/schemas.js";
import { settingsPatchSchema, settingsSchema } from "./schemas.js";

export const settingsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  /**
   * GET /api/settings
   */
  fastify.get("/api/settings", { schema: { response: { 200: settingsSchema } } }, async (_req, reply) => {
    return reply.send(getSettings());
  });

  /**
   * PUT /api/settings  (patch)
   *
   * `defaultTheme` is checked against the themes on disk: an unknown id would
   * be handed straight to `loadTheme` on the next render and throw there.
   */
  fastify.put(
    "/api/settings",
    { schema: { body: settingsPatchSchema, response: { 200: settingsSchema, 400: errorSchema } } },
    async (req, reply) => {
      const body = req.body;
      if (body.defaultTheme !== undefined && !listThemes().includes(body.defaultTheme)) {
        return reply.status(400).send({ error: `Unknown theme: "${body.defaultTheme}"` });
      }
      saveSettings(body);
      return reply.send(getSettings());
    },
  );
};
