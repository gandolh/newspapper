import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin, type ProxyOptions } from 'vite';
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

/**
 * Where the app is served from. `/newspapper/` behind Caddy, which strips the
 * prefix before Fastify sees it, and in `npm run dev`, which loads it from the
 * repo-root .env so local dev is laid out like the deploy (see `devProxy`
 * below). `/` for the standalone container.
 *
 * Set as a BUILD ARG (see infrastructure/Dockerfile), because it is baked into
 * the bundle: Vite rewrites every asset URL in index.html and in CSS with it,
 * and re-exports it as `import.meta.env.BASE_URL`, which `src/lib/base.ts`
 * reads so the app's own URLs cannot drift from the bundle's. That is the one
 * variable — there is deliberately no second one for the router.
 */
const base = process.env.NEWSPAPPER_BASE ?? '/';

/**
 * The dev server stands in for Caddy. The API's paths are proxied under `base`
 * with the prefix stripped, as `handle_path` strips it in the deploy, and
 * `/ward` + `/ward-api` go to WARD_PUBLIC_ORIGIN: the Ward the API trusts,
 * locally the container in wzd_auth/infrastructure/local. One origin is what
 * lets Ward's cookie, its redirect back into the app and signing out work as in
 * the deploy.
 *
 * Ward refuses /refresh and /logout unless the request's Origin is its own. A
 * request from a page on this dev server would be same-origin in the deploy, so
 * its Origin is rewritten to say so. Anything else keeps its Origin and its
 * Sec-Fetch-Site, and Ward still refuses it.
 */
function devProxy(): Record<string, ProxyOptions> {
  const api = `http://localhost:${process.env.PORT ?? 3001}`;
  const prefix = base.replace(/\/+$/, '');
  const proxy: Record<string, ProxyOptions> = {};
  for (const path of ['/api', '/output', '/uploads', '/assets']) {
    proxy[`${prefix}${path}`] = {
      target: api,
      rewrite: (url) => url.slice(prefix.length),
    };
  }
  if (!process.env.WARD_PUBLIC_ORIGIN) return proxy;

  const ward = new URL(process.env.WARD_PUBLIC_ORIGIN).origin;
  proxy['^/ward(-api)?(/|$)'] = {
    target: ward,
    configure: (server) => {
      server.on('proxyReq', (proxyReq, req) => {
        const origin = req.headers.origin;
        if (origin && URL.canParse(origin) && new URL(origin).host === req.headers.host) {
          proxyReq.setHeader('origin', ward);
        }
      });
    },
  };
  return proxy;
}

export default defineConfig({
  base,
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
    proxy: devProxy(),
  },
});
