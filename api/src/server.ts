import { resolve, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import health from './routes/health.js';
import meRoutes from './routes/me.js';
import scrapeRoutes from './routes/scrape.js';
import articlesRoutes from './routes/articles.js';
import postsRoutes from './routes/posts.js';
import renderRoutes from './routes/render.js';
import rendersRoutes from './routes/renders.js';
import publishRoutes from './routes/publish.js';
import themesRoutes from './routes/themes.js';
import sourcesRoutes from './routes/sources.js';
import settingsRoutes from './routes/settings.js';
import uploadsRoutes from './routes/uploads.js';
import { registerAuthGuard } from './ward/ward.guard.js';
import type { WardClient } from './ward/ward.client.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '../..');

export const PORT = Number(process.env.PORT ?? 3001);

export interface BuildAppOptions {
  /**
   * Inject a Ward client, so a test can decide who is signed in without a real
   * Ward, a signing key, or a network. Production passes nothing and the guard
   * builds one from the environment.
   */
  ward?: WardClient;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const fastify = Fastify({ logger: true });

  await fastify.register(cors, {
    origin: ['http://localhost:4321', 'http://127.0.0.1:4321'],
    credentials: true,
  });

  /*
   * Identity is Ward's. There is no secret to check and no account to seed:
   * newspapper holds no credential, and its single admin account is now an
   * ordinary Ward account holding a `newspapper` grant.
   *
   * `wardConfig()` is read inside this call, so a missing `WARD_APP_KEY` stops
   * the boot here — before `listen`, and with a message naming the variable.
   */
  registerAuthGuard(fastify, options.ward ? { client: options.ward } : {});

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
  await fastify.register(meRoutes);
  await fastify.register(scrapeRoutes);
  await fastify.register(articlesRoutes);
  await fastify.register(postsRoutes);
  await fastify.register(renderRoutes);
  await fastify.register(rendersRoutes);
  await fastify.register(publishRoutes);
  await fastify.register(themesRoutes);
  await fastify.register(sourcesRoutes);
  await fastify.register(settingsRoutes);
  await fastify.register(uploadsRoutes);

  // Global error handler
  // A 4xx carries a message a route chose to show the caller. A 5xx is a fault,
  // and its message is whatever the exception said: SQL fragments, file paths,
  // "Cannot read properties of null". That stays in the server log, never in
  // the response.
  fastify.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
    const status = err.statusCode ?? 500;
    fastify.log.error(err);
    void reply
      .status(status)
      .send({ error: status >= 500 ? 'Internal Server Error' : err.message });
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

    // Fallback to index.html for client-side routing (Astro static output)
    fastify.setNotFoundHandler(async (req, reply) => {
      if (!req.url.startsWith('/api/')) {
        // Try route-specific index.html first (Astro directory output)
        const urlPath = req.url.split('?')[0].replace(/\/$/, '') || '/';
        const routeFile = join(uiDist, urlPath, 'index.html');
        if (existsSync(routeFile)) {
          const html = readFileSync(routeFile, 'utf8');
          return reply.type('text/html').send(html);
        }
        // Fall back to root index.html
        const rootIndex = join(uiDist, 'index.html');
        if (existsSync(rootIndex)) {
          const html = readFileSync(rootIndex, 'utf8');
          return reply.type('text/html').send(html);
        }
        return reply.status(404).send({ error: 'Not found' });
      }
      return reply.status(404).send({ error: 'Not found' });
    });
  }

  return fastify;
}

const start = async () => {
  let fastify: Awaited<ReturnType<typeof buildApp>>;
  try {
    fastify = await buildApp();
  } catch (err) {
    console.error(`Startup failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
    return;
  }
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
