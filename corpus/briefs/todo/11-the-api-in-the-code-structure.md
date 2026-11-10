# Task 11: The API in the house code structure

**Depends on:**

- In Newspapper: brief 08, for the gate, `eslint-plugin-n`'s `no-process-env` (a warning until this brief), the tsconfigs that include the tests, and `.claude/rules/server.md`.
- In the owner's skills library:
  - the brief *A code-structure skill for the Fastify and React apps*: rules 1-11, the server skeleton, the zod type provider reference, the migration method, `check-structure.mjs`, and the dependency-cruiser and knip presets;
  - the brief *The Fastify servers adopt the code structure*: Newspapper's row and the method;
  - the brief *Enforce the base-ui and code-structure skills in every repo*: `check-structure` runs `--warn-only` until this brief is done.
- The owner's grilling of 2026-11-10: Q1 (how the service starts: leave the deploy alone), Q23 (`features/`), Q24 and Q56 (plugin options, explicit registration, no decorator seam), Q25 and Q53 (response schemas, streams exempt), Q43 (one error handler), Q52 (validation before authorisation), Q55 (where schemas live), Q27 (the test runner), and the questions still open below.

**Order:** after 08. It touches nothing in `ui/`, so it may run before 09 and 10, but never at the same time as either: all three change `package-lock.json`.

**Before you start:** run `brief-board guide` ([CLAUDE.md](../../../CLAUDE.md)).

## Context

The owner asked on 2026-11-09 for one researched code structure, enforced in every repo. Newspapper's `api/` already has some of it:

- `buildApp(options)` exists (an `isMain` guard in the same file keeps `start()` out of imports), and 6 test files drive it through `inject()`;
- one error handler, with no 5xx detail sent to a client (`api/src/server.ts:126-133`);
- a session guard that fails closed (`api/src/ward/ward.guard.ts`);
- the built entry is already `api/dist/server.js`.

What is missing:

- an `app.ts` apart from the entry (both live in `server.ts`, 221 lines);
- a `config.ts` (nine readers of the environment are spread over six files);
- feature folders;
- **any route schema at all, and any validation at all**: 39 `req.body|query|params as {…}` casts, no `schema:` anywhere, and no `zod` in any workspace;
- `fastify-plugin` on the cross-cutting plugins, `close-with-grace`, timeouts and `trustProxy`.

### The versions (verified 2026-11-10)

- **fastify 5.12.7** (`api/package.json`). The provider needs `^5.5.0`.
- **No zod anywhere.** `zod` 4.5.4 is in `package-lock.json` only as a transitive dev dependency (`"dev": true`, `package-lock.json:24783`), so this brief adds it as a direct, pinned dependency of `api`. There is **no zod 3 to move off.**
- `@fastify/type-provider-zod` 1.0.3: peers `zod >=4.2.0`, `fastify ^5.5.0`, `openapi-types ^12.1.3` and `@fastify/swagger >=9.5.1`, none optional (`npm view @fastify/type-provider-zod@1.0.3 peerDependencies`, 2026-11-10). npm installs both extra peers. They are type-only weight, and they show in the lockfile diff.
- `fastify-plugin` 6.0.1 and `close-with-grace` 2.5.0 are the other new dependencies. All pinned exactly, in `api/package.json`.
- **The image has no `git`** (`infrastructure/Dockerfile`: `node:24-bookworm-slim`, `python3 make g++ ca-certificates`). Every dependency here is an npm registry tarball, so nothing needs it.
- The provider's serializer throws on any zod `.transform()` in a response schema (reproduced on zod 4.5.4 by the estate's Almanac brief). Newspapper has no zod schema today, so the trap cannot already be present; the response schemas this brief writes are **transform-free** by rule, and a test enforces it (step 6).

### The layout today: 20 source files and 9 test files under `api/src/` (4,020 lines)

| Today | Lines | Target | Note |
|---|---|---|---|
| `server.ts` | 221 | `server.ts` (the entry) + `app.ts` | `buildApp`, `BuildAppOptions`, `bootOptions`, the `declare module 'fastify'` block (line 56) and the registration list (lines 83-117) go to `app.ts`. `start()` and `isMain` stay. `PORT` (line 31) moves to `config.ts`. |
| `server.test.ts` | 684 | `app.test.ts` + per-feature `routes.test.ts` | 46 `it`, 84 `inject`; its `describe`s are named by route (`GET /api/health` at line 68 through `GET /api/themes` at 636, and the error handler at 652) and split along them |
| `lib/db.ts` | 26 | `lib/db.ts` | reads `NEWSPAPPER_DB_PATH` at line 14; takes the path from `config.ts` |
| `lib/sse.ts`, `sse.test.ts` | 28, 77 | `plugins/sse.ts`, `plugins/sse.test.ts` | imports `FastifyReply`, so it cannot live in `lib/` (rule 7: no Fastify import there) |
| `ward/auth.ts` | 104 | `plugins/auth/index.ts` | `createAppAccounts`, `wardClientFromEnv`, `registerAuth`, `seedFromEnv`; env reads at lines 36, 61, 96 |
| `ward/config.ts`, `config.test.ts` | 93, 59 | `plugins/auth/paths.ts`, `paths.test.ts` | `authPaths` and `publicOrigin`; env reads at lines 61, 84 |
| `ward/ward.guard.ts`, `ward.guard.test.ts` | 57, 31 | `plugins/auth/guard.ts`, `guard.test.ts` | `GUARDED_PREFIXES`, `PUBLIC_PATHS`, `pathOf` |
| `ward/auth.test.ts` | 398 | `plugins/auth/auth.test.ts` | 20 `it`, 33 `inject` |
| `ward/test-support.ts` | 120 | `testing/ward.ts` | `signInCookie`, `createFakeWard`; named by the tests |
| `seed.ts` | 18 | `seed.ts` | a CLI; its env reads move to `config.ts` |
| `routes/health.ts` | 9 | `features/health/routes.ts` | |
| `routes/articles.ts` | 84 | `features/articles/routes.ts` | |
| `routes/posts.ts`, `routes/publish.ts` | 164, 36 | `features/posts/routes.ts`, `publish.ts` | `publish` is `POST /api/posts/:id/publish` |
| `routes/render.ts`, `render.test.ts` | 136, 139 | `features/renders/render.ts`, `render.test.ts` | SSE render and `export.zip`; `PORT` read at line 23 |
| `routes/renders.ts`, `renders.test.ts` | 95, 72 | `features/renders/routes.ts`, `routes.test.ts` | |
| `routes/reader.ts`, `reader.test.ts` | 230, 485 | `features/reader/routes.ts`, `routes.test.ts` | SSE refresh; `app.ts` passes `refresh` as plugin options today |
| `routes/scrape.ts` | 38 | `features/scrape/routes.ts` | SSE |
| `routes/settings.ts` | 32 | `features/settings/routes.ts` | |
| `routes/sources.ts` | 105 | `features/sources/routes.ts` | |
| `routes/themes.ts` | 22 | `features/themes/routes.ts` | |
| `routes/uploads.ts`, `uploads.test.ts` | 199, 258 | `features/uploads/routes.ts`, `routes.test.ts` | multipart, and the binary `GET /uploads/:ref` |
| (new) | | `config.ts`, `plugins/errors.ts`, `plugins/static.ts` | the error handler (`server.ts:126-133`) and the static and SPA fallback (lines 71-77, 136-165) |

**There is no `store.ts` layer to move.** Persistence is in `core/src/storage/*` (a library the routes call directly), so the skill's `features/<name>/store.ts` has nothing to hold. Default: a feature is `routes.ts` plus `schemas.ts` (step 5); `core` stays the data layer. *Still open for the owner (decision 12):* does the skill's `store.ts` rule apply to a repo whose data layer is a workspace library, or does `core` count as the store?

**Feature boundaries after the move** (rule 5, only through an `index.ts`): the routes import `@newspapper/core` and each other nowhere today, so no feature needs an `index.ts` yet. `render.ts` imports `PORT` from nowhere (it re-reads the environment), which `config.ts` ends.

### Every reader of the environment

| Where | What | Afterwards |
|---|---|---|
| `api/src/server.ts:31` | `PORT`, default 3001 | `config.ts` |
| `api/src/server.ts:66` | `bootOptions(env = process.env)` | `config.ts` supplies `READER_REFRESH_MINUTES` |
| `api/src/routes/render.ts:23` | a second `PORT` read | `config.ts` |
| `api/src/lib/db.ts:14` | `NEWSPAPPER_DB_PATH` | `config.ts` |
| `api/src/ward/auth.ts:36, 61, 96` | `WARD_OIDC_*`, `SEED_*`, defaults `env = process.env` | `config.ts` (`loadSeedConfig()`, the Ward block) |
| `api/src/ward/config.ts:61, 84` | `authPaths`, `publicOrigin`: the auth base and origin | `config.ts` |
| `core/src/reader/config.ts:22, 27`, `storage/settings.ts:15`, `uploads/index.ts:110, 112`, `util/paths.ts:22, 45` | 7 readers inside the library | **out of scope here**: `core` is a library (decision 8 of brief 08 keeps its readers as a recorded exception) |
| `ui/vite.config.ts:68, 78` | `NEWSPAPPER_BASE`, `PORT` | out of scope: a build config |
| tests | 42 in `api` and `core` | excepted |

No file reads `NODE_ENV`; the Dockerfile sets it only for Fastify's own dependencies.

### Every route: 37, with what each needs

`grep -c "fastify\.\(get\|post\|put\|patch\|delete\)("` per file, 2026-11-10: articles 4, health 1, posts 6, publish 1, reader 7, render 2, renders 1, scrape 1, settings 2, sources 5, themes 1, uploads 6. The vendored `wardAuth` plugin's `/api/auth/*` routes are generated code and out of scope.

| Feature (routes) | Methods and paths | Hand-cast today | Reply |
|---|---|---|---|
| health (1) | `GET /api/health` | | JSON `{ ok: true }` |
| articles (4) | `GET /api/articles`, `POST /api/articles`, `PATCH /api/articles/:id`, `DELETE /api/articles/:id` | `articles.ts:17, 40, 57, 62, 77` | JSON |
| posts (7) | `GET /api/posts`, `POST /api/posts`, `GET/PUT/DELETE /api/posts/:id`, `PUT /api/posts/:id/status`, `POST /api/posts/:id/publish` | `posts.ts:68, 96, 100, 112, 122, 123, 127` and more | JSON |
| renders (3) | `GET /api/renders`, **`POST /api/posts/:id/render` (SSE)**, **`GET /api/posts/:id/export.zip` (binary)** | | JSON, stream, `application/zip` |
| reader (7) | `GET /api/reader/items`, `GET/PATCH /api/reader/items/:id`, `POST /api/reader/mark-read`, `GET /api/reader/counts`, `POST /api/reader/items/:id/save`, **`POST /api/reader/refresh` (SSE)** | | JSON, stream |
| scrape (1) | **`POST /api/scrape` (SSE)** | | stream |
| settings (2) | `GET`, `PUT /api/settings` | | JSON |
| sources (5) | `GET`, `POST /api/sources`, `PUT`, `DELETE /api/sources/:id`, `POST /api/sources/:id/ping` | | JSON |
| themes (1) | `GET /api/themes` | | JSON |
| uploads (6) | `POST /api/uploads` (**multipart**), `GET /api/uploads`, `GET`, `DELETE /api/uploads/:id`, **`GET /uploads/:ref`**, **`GET /uploads/:ref/original`** (**binary streams**) | | JSON, multipart, file streams |

39 `req.body|query|params as {…}` casts in the route files (`grep -rnE "req\.(body|query|params)" api/src/routes | grep -v test`). **Nothing validates input today**; a malformed body reaches the handler as whatever it was.

**Routes a `response` schema cannot describe: 7.** The three SSE routes (`scrape.ts`, `render.ts:38`, `reader.ts:202`, which write to `reply.raw`), `export.zip` (`render.ts:130`), `GET /uploads/:ref` and `/original` (a `createReadStream`, `uploads.ts:79-80`) and the multipart `POST /api/uploads` (body is not JSON). The rule "every route declares `response`" is met by 30 routes and excepted for these 7, recorded with a reason in `scripts/conventions.json`; they still validate `params` and `querystring`. Q53 (decided 2026-11-10, technical call) gives streams and binary routes a standing exception, so none declares `response: { 200: z.any() }`.

**The error body.** Newspapper sends `{ error: string }`: the handler at `server.ts:126-133` answers `{ error: 'Internal Server Error' }` for 5xx and the thrown message for 4xx, and `ui/src/lib/api.ts:92-93, 138-139` read `payload.error`. The skill's example body is `{ error, message, issues? }`. **Q43 (decided 2026-11-10, technical call): keep `{ error: string }`**, with the rule's substance (one handler, no 5xx detail, Fastify's own 4xx passed through) holding. A validation failure becomes `400 { error: "<path>: <message>" }`.

### The entry file does not rename

`api/src/server.ts` is already the entry, and the built file is already `api/dist/server.js`, which the Dockerfile's `CMD ["node", "api/dist/server.js"]` and `api/package.json`'s `start` (`node --conditions=newspapper-built dist/server.js`) name. Splitting `buildApp` out into `app.ts` leaves `server.ts` as the entry, so **no Dockerfile, script or deploy edit is needed**, and Q1 (how vps-deploy starts the service) does not block this repo. The tests import `buildApp` from `./server.js` in 5 files (`server.test.ts:13`, `routes/reader.test.ts:14`, `routes/render.test.ts:17`, `routes/renders.test.ts:12`, `ward/auth.test.ts:6`); they move to `app.js`. With `server.ts` no longer imported by anything, the `isMain` check (lines 215-221) can go, since `tsx watch src/server.ts` and `node dist/server.js` both run it directly.

### Test impact

- 9 test files with 121 `it` calls (`api`), on vitest from the root `vitest.config.ts` (include `api/**/*.test.{ts,tsx}`, which still matches nested folders). `core` has 40 test files and 504 `it`; none moves.
- All `inject()` tests build the app through `buildApp({ wardClient: null })`; the helper in `server.test.ts:61-64` (`inject`) is the one brief 08 fixes for typing.
- New tests: a request body that fails its schema is a 400 with the existing error shape; an extra field on a row is stripped from a reply; a reply that fails its response schema is a 500 `Internal Server Error` with no detail; `config.ts` parses the environment once and rejects a bad one; and the response schemas are transform-free.

## Owner decisions

Decided on 2026-11-10 (the owner's grilling; the technical calls are marked, and the owner may overrule them). An item no answer covers stays a default.

1. **`api/src/features/<name>/`** (Q23, decided 2026-11-10, technical call), as the map.
2. **Typed plugin options and explicit registration** (Q24 and Q56, decided 2026-11-10, technical call). The plugins and features are imported and registered by name in `app.ts`; the options object is typed (`{ refresh }` for reader today). **No decorators as a test seam** (Q56): tests pass their dependencies as plugin options, as the reader tests pass `refresh` today. Newspapper already uses decorators for two app-wide services (`accounts`, `readerSchedule`, `declare module 'fastify'` at `server.ts:56-62`); both are request-time lookups the guard and the SSE route need, not test seams, so default: keep them, and add no new one. *Still open for the owner:* move those two to a `FeatureContext` object as Almanac's did. A feature's CLI may live beside it (Q56): `seed.ts` stays where it is.
3. **A response schema on every route** (Q25 and Q53, decided 2026-11-10, technical call). Pass-through JSON uses a loose object. **The 7 streams and binary routes are exempt** (Q53): the three SSE routes, `export.zip`, `GET /uploads/:ref` and `/original`, and the multipart `POST /api/uploads`. Each has an entry in `scripts/conventions.json` naming the route and the reason, and still validates `params` and `querystring`. (The multipart upload's reply is JSON: it declares its `response` too, and the exemption is for its body, not its reply.)
4. **Where the schemas live** (Q55, decided 2026-11-10, technical call). A zod schema lives in `shared/` when the client imports it, otherwise in its feature folder. Newspapper has no `shared/` folder, and [wiki/decisions-engineering.md](../../wiki/decisions-engineering.md) ("The UI keeps its own copy of the shared types") keeps the UI's types separate from `core`'s on purpose. The UI does not import these schemas, so they live beside their routes in `features/<name>/schemas.ts`, in `api`. A `shared/` workspace is rejected for now.
5. **The error handler** (Q43, decided 2026-11-10, technical call). One error handler, keeping the repo's body shape `{ error: string }`. It passes Fastify's own 4xx (a validation 400) through, and never echoes a thrown message to the client on a 5xx. The handler at `server.ts:126-133` already does both; it moves unchanged to `plugins/errors.ts`.
6. **Validation before authorisation** (Q52, decided 2026-11-10, technical call: accepted). Not an issue here: the session guard is an `onRequest` hook (`server.ts:83`), so it runs before validation and an unauthenticated request to a guarded route answers 401, not 400. No route authorises inside its handler.
7. **The test runner** (Q27, decided 2026-11-10, technical call). vitest stays (atrium is the only repo on `node:test`), with `inject()`. Q26's "tests handlers and plugins without `inject()`" is Shelfmark's, not this repo's.
8. **The test helper.** Default: the skill names `buildTestApp`; Newspapper's tests call `buildApp({ wardClient: null })` directly in 5 files plus a `signInCookie` helper. Add `testing/buildTestApp.ts` (the options, the scratch database, the session) and move the 5 files to it, or record the exception. Default: add it, since the same four lines open every test.
9. **Timeouts and proxy.** Defaults, as in the estate: `connectionTimeout: 10_000`; `requestTimeout: 30_000` **except that the SSE routes and `export.zip` must not hit it** (a render takes longer; step 3 measures one and sets the route's own limit); `keepAliveTimeout: 125_000`, above Caddy's two-minute idle keep-alive to its upstream (check the deploy's Caddy snippet for its own `keepalive`); `trustProxy` loopback plus `AUTH_TRUSTED_PROXIES`, which the vendored Ward library already parses (`parseTrustedProxies`). Listen host stays `0.0.0.0` (`server.ts`, the container needs it).
10. **Logging.** Default: JSON as today (`Fastify({ logger: true })`), no `pino-pretty`.
11. **The reader's single-process loop** (the `startReaderSchedule` call at the end of `buildApp`) stays in `app.ts` as an `onClose`-stopped service; it assumes one API process, as [CLAUDE.md](../../../CLAUDE.md) says. Not moved to a feature.
12. **A store layer** (Q54 covers a big `store.ts`, which this repo has none of). Default: a feature is `routes.ts` plus `schemas.ts`; `core` stays the data layer. *Still open for the owner:* whether the skill's `store.ts` rule applies to a repo whose data layer is a workspace library.
13. **Fastify 5.12.8.** Default: not in this brief.
14. **How the service starts** (Q1, decided 2026-11-10, fact). The container starts a file path, `CMD ["node", "api/dist/server.js"]`, built by `npm ci` and `tsc`, with no tests or lint. Leave the deploy alone: `server.ts` stays the entry, so no Dockerfile edit is owed. `npm run check` and the plugin's `Stop` hook are the gate, not the deploy.
15. **Release flow** (Q4 and Q31, decided 2026-11-10, owner). One commit per step on `main`, pushed to `main`. No branch, no pull request; the owner reviews `main`.

## Files you OWN

- `api/src/**`: the moves, the new plugins and config, the schemas wired in.
- `api/package.json` (new dependencies pinned: `zod` 4.5.4, `@fastify/type-provider-zod` 1.0.3, `@fastify/swagger`, `openapi-types`, `fastify-plugin` 6.0.1, `close-with-grace` 2.5.0) and `package-lock.json`. Check the two peers' exact versions against the registry when installing and pin what resolves.
- New: `.dependency-cruiser.cjs` (the skill's preset); `scripts/conventions.json` (the 7 stream routes and any other exception).
- The root `package.json`: `check:conventions` gains dependency-cruiser and drops `check-structure`'s `--warn-only`.
- `eslint.config.js`: `no-process-env` from warning to error on `api/src`.
- `.claude/rules/server.md`: the structure lines.
- Corpus: [wiki/architecture.md](../../wiki/architecture.md) (203 lines already; move the SSE protocol section to a new page before adding, then `bash corpus/lint.sh --index`), [wiki/modules.md](../../wiki/modules.md) (the `api/src` layout), [wiki/api.md](../../wiki/api.md) (every route's schemas and the 400 shape), [wiki/configuration.md](../../wiki/configuration.md) and `.env.example` (`config.ts` is the one reader), [wiki/dependencies.md](../../wiki/dependencies.md) (the 6 new packages and their licences), [wiki/decisions-security.md](../../wiki/decisions-security.md) (the guard now sits in `plugins/auth/`), [wiki/status.md](../../wiki/status.md), [log.md](../../log.md).

## Files you must NOT touch

- `ui/`. A response schema that drops a field the UI reads is a finding: fix the schema, not the UI.
- `core/`. Its readers of the environment and its storage stay.
- `api/vendor/ward/`: generated; every import of `../vendor/…` is rewritten one folder deeper, the file itself is not.
- The deploy and `infrastructure/Dockerfile`: nothing in it changes (`CMD` and `COPY api/vendor ./api/vendor` stay). `dist/` mirrors `src/` depth, so the vendored path resolves the same.
- Behaviour: status codes, error strings, and every route's JSON apart from fields the comparison shows were leaks. The guard's order (registered before every route) does not change.

## What to do

Follow the skill's migration method. One commit per step; after each, `CI=1 npm run check` and `npm run build` pass, and `npm start` answers `GET /api/health`.

1. **Before.**
   - Run `check-structure` strict and record its counts by rule.
   - Seed a scratch database as [docs/images/shots.md](../../../docs/images/shots.md) does, with a tester account, and save the JSON of every JSON route above, signed in, with fixed query ranges, in a folder outside the repo.
   - Measure one real render's duration and the largest SSE stream's duration, for decision 9.
2. **`config.ts` and the split.** One zod-parsed `config.ts` (`loadConfig(env = process.env)`, `loadSeedConfig()`, `resolveDbPath()`). `server.ts` becomes the entry: `loadConfig`, `buildApp(config, { logger: true, server: { … } })`, `close-with-grace` in place of the two `process.once` handlers at lines 154-155 (keep their exit codes, 143 and 130, which the comment explains), `listen`. `app.ts` takes `buildApp`. Move the five test imports. `no-process-env` now finds nothing in `api/src` outside `config.ts` and tests; make it an error.
3. **The plugins:** `plugins/errors.ts` (the existing handler, in `fastify-plugin`, registered first, keeping `{ error: string }` and the logging at line 128), `plugins/static.ts`, `plugins/sse.ts`, `plugins/auth/` (from `ward/`), all as the map. Every test passes unchanged.
4. **Feature folders.** `git mv` file by file so history follows. Rewrite the relative imports one level deeper. Add `.dependency-cruiser.cjs`, and check that a deliberate import of one feature's file from another feature fails it.
5. **The type provider and the schemas, one feature per commit:** health, settings, themes, sources, articles, posts, renders, reader, scrape, uploads. Each commit declares `params`, `querystring`, `body` and (JSON routes) `response` with zod, removes that feature's `req.… as {…}` casts, types the plugin `FastifyPluginAsyncZod`, and adds the tests that apply. `idParams` stays a string, and a non-numeric id keeps answering what the handler answers today (read each handler first; do not add a regex that turns a 404 into a 400).
6. **After.** Save the same JSON again and diff it against step 1. A field that disappeared is a leak (keep it dropped, list it) or a missing schema field (add it). Add the transform-free test: no response schema contains a `ZodPipe` or transform. Put the diff summary in the `log.md` entry.
7. **Strict.** Drop `check-structure`'s `--warn-only` and put dependency-cruiser in `check:conventions`.
8. **Corpus.** Update the pages under Files you OWN; add a decision, "The API grouped by feature, validated by schema", with what was rejected (the layer split Newspapper had, autoload, TypeBox, a `shared/` workspace) and why; write the `log.md` entry; run `bash corpus/lint.sh --index`, then `bash corpus/lint.sh`.

## Acceptance

- [ ] `check-structure` passes strict, with every exception in `scripts/conventions.json` and its reason. Its counts before and after are in the outcome note, for the skills library's table.
- [ ] `grep -rnE "req\.(body|query|params) as" api/src` prints nothing, and every route in the table has a `schema`, with a `response` on the 30 JSON routes.
- [ ] `grep -rn "process\.env" api/src --include=*.ts | grep -v "\.test\.ts"` prints only `config.ts`, and `no-process-env` is an error on `api/src`.
- [ ] Every commit is on `main` and pushed there; no branch or pull request.
- [ ] Each of the 7 exempt routes has a `scripts/conventions.json` entry with its reason (Q53), and a thrown error's message never reaches a 5xx body (a test).
- [ ] A malformed body to each of `POST /api/articles`, `PUT /api/posts/:id`, `POST /api/sources` and `PUT /api/settings` answers 400 with `{ error }`; a test for each. The stripped-field test, the serialization-500 test and the transform-free test pass, with every existing test unchanged except its import path.
- [ ] The before and after JSON comparison is in `log.md`, with every dropped field named.
- [ ] `npm run build` still writes `api/dist/server.js` and `api/dist/app.js`; `docker build -f infrastructure/Dockerfile .` succeeds and the container answers its health check. No deploy edit is owed (the `CMD` is unchanged); the outcome note says so.
- [ ] A render and a scrape complete over SSE under the new `requestTimeout` (the step 1 measurements).
- [ ] dependency-cruiser fails on a deliberate cross-feature import and passes clean.
- [ ] `CI=1 npm run check` passes, and `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 08's default-export change touches the 12 route plugins this brief moves; run 08 first. Its `no-process-env` warning becomes an error here.
- The skills library should hear that this repo has no `shared/` workspace and no store layer, and that 7 of 37 routes are streams, before the other servers run the migration brief.
