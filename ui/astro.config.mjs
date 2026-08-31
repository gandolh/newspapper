import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

/**
 * The proof sheet is a dev route, never a shipped one.
 *
 * `/kitchen-sink` renders every primitive and every mark on one board, which
 * is what makes it worth keeping — brief 64 used it to check the chrome, and
 * it is the only place a lapse (a radius, a coloured pill, a second treatment
 * for a state that already has a mark) is visible at a glance. But it is also
 * the one page in the app that renders with no session at all: it calls no
 * API, so the client-side 401 redirect that sends every other route to
 * /login never fires, and a static build put it on disk at
 * `dist/kitchen-sink/index.html` for anyone who guessed the path.
 *
 * That costs nothing today — the app is single-account on loopback — but
 * `corpus/wiki/decisions-security.md` opens by naming the loopback assumption
 * as the first thing to revisit if Newspapper is ever exposed. Shipping a
 * public page whose safety expires on that date, to buy nothing (nobody
 * proofs the chrome against production), is the wrong trade. Injecting the
 * route only under `astro dev` keeps the whole proof surface where it is used
 * and emits nothing at build time.
 */
const proofSheet = {
  name: 'newspapper:proof-sheet',
  hooks: {
    'astro:config:setup': ({ command, injectRoute }) => {
      if (command !== 'dev') return;
      injectRoute({
        pattern: '/kitchen-sink',
        entrypoint: './src/proof/kitchen-sink.astro',
      });
    },
  },
};

export default defineConfig({
  output: 'static',
  // /history became /posts in brief 62. Kept for one release so a bookmark
  // lands somewhere useful instead of 404ing.
  redirects: {
    '/history': '/posts',
  },
  integrations: [react(), proofSheet],
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api': 'http://localhost:3001',
        '/output': 'http://localhost:3001',
        '/uploads': 'http://localhost:3001',
        '/assets': 'http://localhost:3001',
      },
    },
  },
});
