import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import health from './routes/health.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '../..');

const PORT = Number(process.env.PORT ?? 3001);

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

await fastify.register(health);

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`API server listening on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
