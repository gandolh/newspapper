---
title: The two app-wide decorators become plugin options
created: 2026-11-11
status: open
tags: [api, code-structure]
---

# The two app-wide decorators become plugin options

Brief 11 kept `fastify.decorate("accounts", …)` and `fastify.decorate("readerSchedule", …)` in `api/src/app.ts` (its decision 2's default) and asked the owner whether they move. The controller answered on the board on 2026-11-11: they move.

## Why

The code-structure skill's rule 4: dependencies travel as plugin options, and a decorator holds only a request-scoped value such as `request.user`. `accounts` and `readerSchedule` are app-wide services, and a decorator is global, untyped at the call site and invisible to grep. The skill's rule 2 names the shape: `buildApp` builds one `FeatureContext` and passes it to the plugins and features that need it, as Almanac does.

## What to do

- Build a `FeatureContext` (`{ accounts, readerSchedule }`) in `buildApp`.
- Pass it as plugin options to the auth plugin (the guard reads `accounts`) and to the reader feature (its SSE route reads `readerSchedule`), with typed options.
- Delete the two `decorate` calls and their `declare module 'fastify'` lines.
- Tests pass the context as options, as the reader tests pass `refresh` today. No reply changes: compare a capture before and after.
- `npm run check` with check-structure strict, and the corpus pages that name the decorators (`wiki/modules-api.md`, `wiki/decisions-api.md`).
