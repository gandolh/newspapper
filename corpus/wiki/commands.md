---
summary: Every npm script — what each one actually covers, in what order, and what it does not cover — plus ports, production mode, and the Playwright install step.
updated: 2026-08-31
---

# Running the app

A local web app. There is no CLI: everything runs through the browser UI or the
HTTP API.

## npm scripts

| Script | What it does |
|--------|-------------|
| `npm install` | One-time dependency install, from the repo root |
| `npm run dev` | API (3001) + UI dev server (4321) in parallel, via `concurrently --kill-others-on-fail` |
| `npm run build` | `fmt:check` → `tsc --noEmit` in `core` → `tsc --noEmit` in `api` → `tsc --noEmit` in `ui` → `vite build` |
| `npm test` | `vitest run` over `core/**`, `api/**` **and** `ui/**` `*.test.ts` |
| `npm run lint` | ESLint over `core/src`, `api/src`, `ui/src` and `ui/vite.config.ts` |
| `npm run fmt` | Prettier `--write` over the same three workspaces plus `ui/index.html` |
| `npm run fmt:check` | The same set, read-only. `npm run build` runs this first and stops on it. |

Single test file: `npx vitest run core/src/path/to/file.test.ts`.

**Each of those coverages is deliberate and was earned.** The UI is typechecked
rather than merely bundled; `vitest`'s `include` names `ui/` explicitly; the
linter's glob covers all three workspaces; the formatter has a config
(`.prettierrc.json` — single quotes, 100 columns) and is enforced by the build.
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
- **UI** — the Vite dev server on `http://localhost:4321`, proxying `/api`,
  `/output`, `/uploads` and `/assets` to 3001

Open `http://localhost:4321`. You will land on `/login`; the account comes from
`ADMIN_USERNAME` / `ADMIN_PASSWORD`, or `admin` / `newspapper-dev` in
development — see [configuration.md](./configuration.md#authentication).

## Production mode

```bash
npm run build                    # emits ui/dist/
npm run dev --workspace=api      # the API serves ui/dist/ at /
```

When `ui/dist/` exists the API serves it at `/` and falls back to `index.html`
for any non-`/api/` path, which is what the client-side router needs. `api`'s
`start` script (`node dist/server.js`) refers to a build output the current
scripts do not produce; run the API through `tsx` as above.

Outside development, `SESSION_SECRET`, `ADMIN_USERNAME` and `ADMIN_PASSWORD` are
required and the server exits non-zero without them.

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
