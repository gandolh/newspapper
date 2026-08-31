import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The proof sheet is a dev route, never a shipped one.
 *
 * `/kitchen-sink` renders every primitive and every mark on one board, which
 * is what makes it worth keeping — brief 64 used it to check the chrome, and
 * it is the only place a lapse (a radius, a coloured pill, a second treatment
 * for a state that already has a mark) is visible at a glance. But it is also
 * the one page in the app that renders with no session at all: it calls no
 * API, so the client-side 401 redirect that sends every other route to
 * /login never fires.
 *
 * That costs nothing today — the app is single-account on loopback — but
 * `corpus/wiki/decisions-security.md` opens by naming the loopback assumption
 * as the first thing to revisit if Newspapper is ever exposed. Shipping a
 * public page whose safety expires on that date, to buy nothing (nobody
 * proofs the chrome against production), is the wrong trade.
 *
 * Brief 69 expressed this as an Astro `injectRoute` guarded by
 * `command === 'dev'`. The Vite equivalent has to be structural in the same
 * way, and a plain `import.meta.env.DEV` branch is not: `KitchenSinkIsland`
 * imports a stylesheet, so even when Rollup drops the component as dead code
 * the CSS side effect keeps the module in the graph and its rules in the
 * bundle. Instead the route reaches the proof sheet only through the virtual
 * module below, whose production body is literally `export default null` —
 * under `vite build` the real module is never resolved, never parsed, and
 * contributes no JS and no CSS.
 */
const proofEntry = fileURLToPath(new URL('./src/proof/KitchenSink.tsx', import.meta.url));

function proofSheet(): Plugin {
  const virtualId = 'virtual:proof-sheet';
  const resolvedId = '\0' + virtualId;
  let serving = false;

  return {
    name: 'newspapper:proof-sheet',
    config(_config, { command }) {
      serving = command === 'serve';
    },
    resolveId(id) {
      return id === virtualId ? resolvedId : null;
    },
    load(id) {
      if (id !== resolvedId) return null;
      return serving
        ? `export { default } from ${JSON.stringify(proofEntry)};`
        : 'export default null;\n';
    },
  };
}

export default defineConfig({
  plugins: [react(), proofSheet()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // NOT the default `assets/` — the API serves the repo's own `assets/fonts/`
    // at that prefix in production, and the dev server proxies `/assets` to it.
    // Astro sat the bundle in `_astro/` for the same reason.
    assetsDir: '_bundle',
  },
  server: {
    port: 4321,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3001',
      '/output': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
      '/assets': 'http://localhost:3001',
    },
  },
});
