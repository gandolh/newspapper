---
summary: The layout of api/src since 2026-11-11 — server.ts and app.ts, config.ts as the one reader of the environment, the plugins (errors, sse, auth, static), a folder per feature with its routes and zod schemas, lib/ and testing/ — and what each file is for. The library's modules are in modules.md.
updated: 2026-11-11
---

# The API's modules (`api/src`)

The API follows the estate's code-structure skill
([decision](./decisions-api.md)). `core` is its data layer: the routes call
`@newspapper/core` directly, so a feature holds no `store.ts`.

```text
api/src/
  server.ts            the entry: loadConfig, buildApp with the logger, trustProxy and timeouts,
                       close-with-grace (exit 143 on SIGTERM, 130 on SIGINT), listen on 0.0.0.0
  app.ts               buildApp(config, options): the zod compilers, then the plugins, then the
                       features, in a fixed order; the Reader's background loop; never listens
  config.ts            the one reader of process.env: loadConfig(env), loadSeedConfig(env),
                       resolveDbPath(env); a ConfigError names every bad variable
  seed.ts              the seed CLI (npm run seed --workspace=api)
  plugins/
    errors.ts          the one error handler, registered first, { error } bodies
    sse.ts             the stream helpers, and the preClose hook that ends open streams
    auth/              index.ts (accounts, the Ward client, the auth plugin, the seed), paths.ts
                       (base, cookie path, public origin), guard.ts (who needs a session)
    static.ts          /assets/fonts/, /output/, ui/dist and the client-side routes' fallback
  features/<name>/     index.ts (what app.ts registers), routes.ts, schemas.ts, *.test.ts
                       health, settings, themes, sources, articles, posts (+ publish.ts),
                       renders (+ render.ts: the render stream and export.zip), reader,
                       scrape, uploads
  lib/                 db.ts (the database handle), schemas.ts (the { error } body, query and
                       id helpers); no Fastify import
  testing/             buildTestApp.ts, signedInApp.ts (a scratch database and a signed-in
                       session per test), ward.ts (signInCookie, the fake Ward)
```

- **Order in `buildApp`.** The compilers first, so every scope validates and
  encodes with zod; `errors` before anything, so every route inherits the
  handler; `sse`; CORS; `auth` before every route its guard covers; `static`;
  then the features, each through its `index.ts`.
- **Plugin options, not decorators.** The render routes take `{ port }`, the
  Reader `{ refresh }` and the auth plugin `{ accounts, ... }`; `buildApp` builds
  `accounts` and the Reader's schedule itself and decorates nothing. The guard
  never read `accounts` at request time, and the SSE route never read the
  schedule (the old note here said both did; only tests did). A test seeds
  users and sessions through `testAccounts()` in `testing/ward.ts`, which opens
  the accounts on the same database file.
- **Schemas** live beside their routes, since the UI keeps its own copy of the
  types ([decision](./decisions-engineering.md)); a feature that answers with
  another's shape imports it through that feature's `index.ts` (the Reader's
  save answers with `articleSchema`).
- **Tests** run every route through `inject()` on the whole app, guard
  included. A feature tested alone (uploads) sets the two zod compilers on its
  bare Fastify, as `buildApp` does.
