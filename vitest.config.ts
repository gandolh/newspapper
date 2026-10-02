import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `.tsx` too: components are all `.tsx`, and a `Component.test.tsx` matched
    // by nothing would run silently as zero tests.
    include: ['core/**/*.test.{ts,tsx}', 'api/**/*.test.{ts,tsx}', 'ui/**/*.test.{ts,tsx}'],
  },
});
