---
summary: Every npm script — what each one actually covers, in what order, and what it does not cover — plus ports, production mode, and the Playwright install step.
updated: 2026-11-13
---

# Running the app

A local web app. There is no CLI: everything runs through the browser UI or the
HTTP API.

## npm scripts

| Script | What it does |
|--------|-------------|
| `npm install` | One-time dependency install, from the repo root |
| `npm run dev` | API (3001) + UI dev server (4321) in parallel, via `concurrently --kill-others-on-fail` |
| `npm run check` | `typecheck` (core and api with their tests, then ui) → `lint` → `format:check` → `check:conventions` (knip, dependency-cruiser, the house Base UI and structure checkers, both strict) → `CI=1 vitest run`. Run before every hand-back |
| `npm run check:fast` | `typecheck`, then ESLint on the files changed against `HEAD` and the untracked ones (`scripts/check-fast.mjs`). No tests. About 11 to 15 s warm |
| `npm run typecheck` | `tsc -p core --noEmit`, `tsc -p api --noEmit`, `tsc -p e2e --noEmit`, then `tsc --noEmit` in `ui`; incremental, buildinfo under `node_modules/.tmp/` |
| `npm run build` | `format:check` → `tsc` in `core` → `tsc` in `api` → `tsc --noEmit` in `ui` → `vite build`. The `core` and `api` steps typecheck and, since 2026-11-04, also emit `dist/` |
| `npm test` | `vitest run` over `core/**`, `api/**` **and** `ui/**` `*.test.ts` |
| `npm run lint` | `eslint .`, the house config: typed rules through the workspace tsconfigs, tests included |
| `npm run format` | `prettier --write .`, the house format (120 columns), minus what `.prettierignore` lists |
| `npm run format:check` | The same, read-only. `npm run build` runs this first and stops on it. |
| `npm run gate` | `check`, then `build`, then `bash corpus/lint.sh` |
| `npm run house-style:sync` | Refreshes `vendor/house-style/` from the skills library; `-- --check` compares without writing |
| `npm run start --workspace=api` | The compiled API, `node --conditions=newspapper-built dist/server.js`. Run `npm run build` first; it loads no `.env`. See Production mode |
| `npm run seed --workspace=api` | Create the local account named by `SEED_USERNAME` / `SEED_PASSWORD` (and `SEED_ROLE`, default `editor`) if it does not exist. Never resets one that does. Set them in the shell, not a file. |

Single test file: `npx vitest run core/src/path/to/file.test.ts`.

**The browser specs** (`e2e/`, Playwright 1.63.0, since 2026-11-13) are not in `npm run check`: `npx playwright test -c e2e/playwright.config.ts` starts the Vite dev server on `E2E_PORT` (4781) and runs `floor.spec.ts` (focus ring on every Tab stop, no running motion under reduced motion, no sideways overflow at 390 and 360, the Light / Dark / System switch) on every screen. They need no API and no account: `e2e/fixtures.ts` stubs `/api/*` with made-up Sample City data and aborts the Reader's refresh and live search. At most two workers; `E2E_CHROMIUM` names another browser. `SHOTS_DIR=<folder> npx playwright test -c e2e/playwright.config.ts shots` writes a PNG per screen, theme and width. `node scripts/contrast.mjs` measures 25 colour pairs over the built tokens in both themes and exits 1 on a failure.

**Each of those coverages is deliberate and was earned.** The UI is typechecked
rather than merely bundled; `vitest`'s `include` names `ui/` explicitly; the
linter's glob covers all three workspaces; the formatter has a config
(`prettier.config.js`, the house format at 120 columns) and is enforced by the build.
Every one of those was, at some point, silently doing nothing. Before you trust
a green run here, read
[green-because-nothing-ran.md](./green-because-nothing-ran.md).

## What the gates do not cover

- **The pixel tests need Chromium, and say so when they do not have it.**
  `render.test.ts`, `fonts.test.ts` and `font-fallback.test.ts` launch a real
  browser and assert on real JPEG bytes. Without `npx playwright install
  chromium` they print a boxed banner (*"the pixel half did not run"*) and skip
  locally — and **throw** under `CI`, where a skip is a failure. A green `npm
  test` on a machine with no Chromium has verified fewer typeface guarantees
  than it looks like.
- **`npm run build` does not run the tests**, and `npm test` does not typecheck.
  Run both.
- The React Compiler lint rules are not exhaustive: the compiler bails out
  silently on some components and reports nothing inside them. A clean run means
  "nothing found", not "nothing there" — the caveat and one known example are in
  `eslint.config.js`.

## Dev mode

```bash
npm run dev
```

Two processes:

- **API** — `tsx watch api/src/server.ts` on `http://localhost:3001`
- **UI** — the Vite dev server on `http://localhost:4321`, serving the app under
  `/newspapper/` and proxying the API's paths to 3001

Open `http://localhost:4321/newspapper/`. Signing in goes through Ward, the
estate's identity service; locally its container in
`wzd_auth/infrastructure/local`. See
[configuration.md](./configuration.md#local-sign-in).

## Production mode

```bash
npm run build                    # emits core/dist/, api/dist/ and ui/dist/
npm run start --workspace=api    # node on api/dist/server.js; serves ui/dist/ at /
```

When `ui/dist/` exists the API serves it at `/` and falls back to `index.html`
for any non-`/api/` path, which is what the client-side router needs.

**Since 2026-11-04 production runs built JavaScript under plain `node`**
([why](./decisions-tooling.md#the-api-runs-built-javascript-started-by-node)).
`core` and `api` compile with `tsc` into `dist/`, a mirror of `src/`. `core`'s
`exports` still point at its `.ts` source by default, which is what tsx, Vite
and vitest read; each entry also has a `newspapper-built` condition pointing at
`dist/`. `start` passes `--conditions=newspapper-built`, and the Docker image
sets it in `NODE_OPTIONS` and runs `CMD ["node", "api/dist/server.js"]`: no npm,
no tsx, no dev dependencies. Without the condition, node resolves `core` to its
source and stops at `ERR_MODULE_NOT_FOUND`, which is what the dead-config
cleanup (2026-08-31) found when it deleted an earlier `node dist/server.js`.
Re-pointing the exports at `dist/` for everyone would have fixed node and broken
the dev tools; the condition is asked for by node alone.

**In the container, one-off scripts run the same way**: the seed is
`node api/dist/seed.js`, through `docker compose exec` with `SEED_USERNAME`,
`SEED_PASSWORD` and `SEED_ROLE` passed by `-e`. `npm run seed` needs tsx, which
the image no longer has. Migrations need nothing: they run on boot.

Nothing is required outside development. The `SESSION_SECRET` / `ADMIN_*`
requirement went with the single-account auth; nothing in `api/src` reads them,
and the image boots in production mode and answers its health check with only
`PORT`, `NEWSPAPPER_BASE` and `READER_REFRESH_MINUTES` in its env file.

## Ports

| Service | Default | Override |
|---------|---------|----------|
| API | 3001 | `PORT` in `.env` |
| UI dev server | 4321 | `server.port` in `ui/vite.config.ts` (`strictPort: true`) |

The API's CORS allowlist names `http://localhost:4321` and
`http://127.0.0.1:4321` literally, so moving the UI port means editing
`api/src/server.ts` too.

## Playwright Chromium

The render pipeline uses Playwright's bundled Chromium. It is **not** installed
by `npm install`:

```bash
npx playwright install chromium
```

Required for `POST /api/posts/:id/render`.

## Corpus

```bash
bash corpus/lint.sh            # frontmatter, page size, link resolution, stale roots
bash corpus/lint.sh --index    # regenerate the catalog block in corpus/index.md
```

`lint.sh` exits non-zero on any finding, so it can gate a commit.
