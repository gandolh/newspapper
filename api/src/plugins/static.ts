import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import staticPlugin from "@fastify/static";
import { fontsDir, outputRoot, uiDistDir } from "@newspapper/core";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

/**
 * The files the server sends as they are: the fonts the render browser loads (`/assets/fonts/`), the
 * rendered runs (`/output/`, behind the guard), and in production the UI bundle (`ui/dist`) with its
 * client-side routes. Wrapped in fastify-plugin, so the routes and the not-found handler sit on the
 * root. Register it after the auth plugin, whose guard must cover `/output/`.
 */
const serveFiles: FastifyPluginAsync = async (fastify) => {
  await fastify.register(staticPlugin, {
    root: fontsDir(),
    prefix: "/assets/fonts/",
    decorateReply: false,
  });

  await fastify.register(staticPlugin, {
    root: outputRoot(),
    prefix: "/output/",
    decorateReply: false,
  });

  const uiDist = uiDistDir();
  if (!existsSync(uiDist)) {
    // Dev and tests: Vite serves the UI, so an unknown path is a plain 404 in the API's body.
    fastify.setNotFoundHandler(async (_req, reply) => reply.status(404).send({ error: "Not found" }));
    return;
  }

  await fastify.register(staticPlugin, {
    root: uiDist,
    prefix: "/",
    decorateReply: false,
    wildcard: false,
  });

  // Fallback to index.html for client-side routing
  fastify.setNotFoundHandler(async (req, reply) => {
    if (!req.url.startsWith("/api/")) {
      // Try route-specific index.html first (a directory per route)
      const urlPath = req.url.split("?")[0].replace(/\/$/, "") || "/";
      const routeFile = join(uiDist, urlPath, "index.html");
      if (existsSync(routeFile)) {
        const html = readFileSync(routeFile, "utf8");
        return reply.type("text/html").send(html);
      }
      // Fall back to root index.html
      const rootIndex = join(uiDist, "index.html");
      if (existsSync(rootIndex)) {
        const html = readFileSync(rootIndex, "utf8");
        return reply.type("text/html").send(html);
      }
      return reply.status(404).send({ error: "Not found" });
    }
    return reply.status(404).send({ error: "Not found" });
  });
};

export const staticFiles = fp(serveFiles, { name: "static" });
