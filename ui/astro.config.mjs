import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  output: 'static',
  integrations: [react()],
  vite: {
    server: {
      proxy: {
        '/api': 'http://localhost:3001',
        '/output': 'http://localhost:3001',
        '/assets': 'http://localhost:3001',
      },
    },
  },
});
