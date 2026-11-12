---
summary: The API grouped by feature and validated by schema (2026-11-11) — the estate's code structure in api/src, zod route schemas through the type provider with the seven stream and binary exemptions, one config module, and the error body kept as { error } — with what each call rejected and the questions left for the owner.
updated: 2026-11-11
---

# Decisions — the API's structure

Split from [decisions-engineering.md](./decisions-engineering.md), which is at
its size cap. The layout itself is [modules-api.md](./modules-api.md).

## The API grouped by feature, validated by schema

_2026-11-11_ — `api/src` follows the estate's code-structure skill: `server.ts`
listens and `app.ts` builds; `config.ts` alone reads the environment, with zod,
and fails at start naming every bad variable; the cross-cutting parts are
`fastify-plugin` plugins (errors, the SSE close hook, auth, static files); each
feature is a folder (`features/<name>/routes.ts`, `schemas.ts`, `index.ts`) used
through its index. Every route declares its inputs and, for each status its
handler sends, its reply, as zod schemas through `@fastify/type-provider-zod`.
`check-structure` (strict), dependency-cruiser and `n/no-process-env` hold it.

Rejected:

- **The layer split Newspapper had** (`routes/`, `lib/`, `ward/`): a feature's
  routes, its schemas and its tests lived apart, and `lib/` held a Fastify
  helper.
- **`@fastify/autoload`.** Registration order is the architecture (the error
  handler first, the guard before every route), and a feature registered by
  name is found with grep and keeps its option types.
- **TypeBox.** zod is the estate's schema library (the UI's forms elsewhere use
  it), and the provider types the handlers from the same schema.
- **A `shared/` workspace.** The UI keeps its own copy of the types on purpose
  ([decision](./decisions-engineering.md#the-ui-keeps-its-own-copy-of-the-shared-types)),
  and it imports none of these schemas, so they live beside their routes.
- **The skill's `{ error, message, issues? }` body.** The UI reads
  `payload.error` and shows it, so the body stays `{ error }` (Q43). A schema
  failure answers the first issue's message, and every schema writes its own
  messages, the handlers' old ones where there was one ("title is required"),
  so a 400 reads as it did. Rejected: the brief's `"<path>: <message>"`, which
  would have changed every one of those strings.
- **A `store.ts` per feature.** `core` is the data layer; the routes call it.

**Exempt from a schema of their reply or body (Q53), each in
`scripts/conventions.json`:** the three SSE streams (they write to
`reply.raw`; see [sse.md](./sse.md)), `export.zip` and the two `/uploads/:ref`
file routes (binary; a declared JSON 404 alone would type the Buffer out), and
the multipart upload's body (its JSON reply declares 201, 400, 413 and 415).
All seven still declare their `params` or `body`.

**Timeouts** (`server.ts`): `connectionTimeout` 35 s, above a source's ping,
the longest silent JSON route (its 30 s feed timeout); the streams turn the
socket timeout off for themselves. `requestTimeout` 60 s covers receiving the
request only, enough for a 10 MB upload at about 1.4 Mbit/s. `keepAliveTimeout`
125 s outlives Caddy's two-minute idle upstream connection. `trustProxy` is
loopback plus `AUTH_TRUSTED_PROXIES`, the list the login lockout reads too.

**The two decorators are gone (2026-11-12).** `accounts` and `readerSchedule`
left the Fastify instance. `accounts` is an option of the auth plugin; the
schedule is local to `buildApp`, stopped in `onClose`. No route read either, so
the `FeatureContext` the owner asked for would have carried nothing, and was
not built; tests reach the accounts through `testAccounts()`.

**Still open for the owner:**

- Does the skill's `store.ts` rule apply to a repo whose data layer is a
  workspace library, or does `core` count as the store?

