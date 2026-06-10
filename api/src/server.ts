import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import health from './routes/health.js';
import scrapeRoutes from './routes/scrape.js';
import articlesRoutes from './routes/articles.js';
import postsRoutes from './routes/posts.js';
import renderRoutes from './routes/render.js';
import previewRoutes from './routes/preview.js';
import templatesRoutes from './routes/templates.js';
import slideAiRoutes from './routes/slide-ai.js';
import sourcesRoutes from './routes/sources.js';
import settingsRoutes from './routes/settings.js';
import promptRoutes from './routes/prompt.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '../..');

export const PORT = Number(process.env.PORT ?? 3001);

export async function buildApp() {
  const fastify = Fastify({ logger: true });

  await fastify.register(cors, {
    origin: ['http://localhost:4321', 'http://127.0.0.1:4321'],
  });

  // Serve font assets at /assets/fonts/
  await fastify.register(staticPlugin, {
    root: resolve(repoRoot, 'assets/fonts'),
    prefix: '/assets/fonts/',
    decorateReply: false,
  });

  // Serve rendered output at /output/
  await fastify.register(staticPlugin, {
    root: resolve(repoRoot, 'output'),
    prefix: '/output/',
    decorateReply: false,
  });

  // Register all API routes
  await fastify.register(health);
  await fastify.register(scrapeRoutes);
  await fastify.register(articlesRoutes);
  await fastify.register(postsRoutes);
  await fastify.register(renderRoutes);
  await fastify.register(previewRoutes);
  await fastify.register(templatesRoutes);
  await fastify.register(slideAiRoutes);
  await fastify.register(sourcesRoutes);
  await fastify.register(settingsRoutes);
  await fastify.register(promptRoutes);

  // Global error handler
  fastify.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
    const status = err.statusCode ?? 500;
    fastify.log.error(err);
    void reply.status(status).send({ error: err.message });
  });

  // Production static: serve ui/dist if present (fallback to index.html for non-API GETs)
  const uiDist = resolve(repoRoot, 'ui/dist');
  if (existsSync(uiDist)) {
    await fastify.register(staticPlugin, {
      root: uiDist,
      prefix: '/',
      decorateReply: false,
      wildcard: false,
    });

    // Fallback to index.html for client-side routing
    fastify.setNotFoundHandler(async (req, reply) => {
      if (!req.url.startsWith('/api/')) {
        return reply.sendFile('index.html', uiDist);
      }
      return reply.status(404).send({ error: 'Not found' });
    });
  }

  return fastify;
}

const start = async () => {
  const fastify = await buildApp();
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`API server listening on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Only start when run directly, not when imported by tests
const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url).endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMain) {
  start();
}
