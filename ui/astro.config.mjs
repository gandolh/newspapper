import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  output: 'static',
  // /history became /posts in brief 62. Kept for one release so a bookmark
  // lands somewhere useful instead of 404ing.
  redirects: {
    '/history': '/posts',
  },
  integrations: [react()],
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
