import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The UI's `@/` alias (ui/vite.config.ts), so a test can import a component
  // the way the app does.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./ui/src', import.meta.url)) },
  },
  test: {
    // `.tsx` too: components are all `.tsx`, and a `Component.test.tsx` matched
    // by nothing would run silently as zero tests.
    include: ['core/**/*.test.{ts,tsx}', 'api/**/*.test.{ts,tsx}', 'ui/**/*.test.{ts,tsx}'],
  },
});
