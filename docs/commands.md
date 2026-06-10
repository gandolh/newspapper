# Running the App

Newspapper v3 is a local web app. There is no CLI. Everything runs through the browser UI or the HTTP API.

## npm scripts

| Script | What it does |
|--------|-------------|
| `npm install` | One-time dependency install from repo root |
| `npm run dev` | Start API (port 3001) + UI dev server (port 4321) in parallel |
| `npm run build` | Typecheck all workspaces + Astro production build → `ui/dist/` |
| `npm test` | Run all tests (vitest) |
| `npm run lint` | ESLint on `core/src/**/*.ts` and `api/src/**/*.ts` |
| `npm run fmt` | Prettier format all source files |

## Dev mode

```bash
npm run dev
```

Opens two processes:
- **API**: `tsx watch api/src/server.ts` on `http://localhost:3001`
- **UI dev**: Astro dev server on `http://localhost:4321` (proxies `/api` to :3001)

## Production mode

```bash
npm run build          # builds ui/dist/
# then start only the API — it serves ui/dist/ at /
npm run dev --workspace=api
# or: node api/dist/server.js   (if dist exists)
```

When `ui/dist/` exists, the API serves the Astro static output at `/` and falls back to the correct `index.html` for each route.

## Ports

| Service | Default | Override |
|---------|---------|----------|
| API | 3001 | `PORT=...` in `.env` |
| UI dev proxy | 4321 | Set in `ui/astro.config.mjs` |

## Playwright Chromium

The render pipeline uses Playwright's bundled Chromium. Install it once:

```bash
npx playwright install chromium
```

This is required for `POST /api/posts/:id/render` to work.
