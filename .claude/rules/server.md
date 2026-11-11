---
paths:
  - "api/src/**"
  - "core/src/**"
---

# The API and the library (api/src, core/src)

- `core/src/wizard` and `core/src/templates` are browser-safe, because the UI imports them: no `node:`
  imports there.
- Every `/api/*` route sits behind the session guard (`api/src/plugins/auth/guard.ts`). A route added
  outside it fails open.
- A 5xx never sends its message to the client.
- One `getBrowser` renders. A test that launches Chromium goes through
  `core/src/render/test-support/chromium.ts`, which skips locally and fails under `CI`.
- Dependency versions are exact, and `data/`, `uploads/` and `output/` are gitignored.
- `tsconfig.json` in `core` and `api` includes the tests and is what typecheck and lint read;
  `tsconfig.build.json` leaves them out. Do not point a tool at the build file.

## The API's structure (the code-structure skill)

- `server.ts` is the entry and the only file that listens; `app.ts` exports `buildApp(config, options)`
  and registers, in order: the zod compilers, `plugins/errors.ts`, `plugins/sse.ts`, CORS,
  `plugins/auth/`, `plugins/static.ts`, then each feature through its `index.ts`.
- `config.ts` is the only reader of `process.env` in `api/src` (`n/no-process-env` is an error);
  `core` reads its own variables, recorded in `scripts/conventions.json`.
- A route lives in `features/<name>/routes.ts` with its zod schemas in `schemas.ts`. Another feature
  imports it only through its `index.ts`. `core` is the data layer: there is no `store.ts`.
- Every route declares `params`, `querystring` and `body` as it takes them, and a `response` for each
  status its handler sends. No handler parses or casts request input. The three SSE streams,
  `export.zip`, the two `/uploads/:ref` file routes and the multipart body are exempt from a schema of
  their reply or body, each recorded in `scripts/conventions.json` (Q53).
- A response schema is transform-free (`app.schemas.test.ts`). A schema's messages name the field, the
  way a handler's check would: the error handler sends the first issue's message as `{ error }`.
- A stream's helpers are `plugins/sse.ts`: `sseHeaders` turns the socket timeout off for the stream,
  and closing the server ends every open stream with an `error` event.
- Tests build the app with `testing/buildTestApp.ts`; route tests use `testing/signedInApp.ts`.
