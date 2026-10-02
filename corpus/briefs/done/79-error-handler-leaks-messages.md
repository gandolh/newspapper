# Task 79 — The 500 handler returns internal exception text to the client

## Context

Found in the 2026-09 sweep and reproduced. The global error handler at
[api/src/server.ts:84-88](../../../api/src/server.ts) sends the raw exception
message for **any** status, including 5xx:

```ts
fastify.setErrorHandler((err, _req, reply) => {
  const status = err.statusCode ?? 500;
  fastify.log.error(err);
  void reply.status(status).send({ error: err.message });
});
```

Any unhandled throw returns its message to the caller — e.g. a null-deref surfaced
as `500 {"error":"Cannot read properties of null (reading 'subject')"}`, and DB
errors leak SQL/filesystem fragments. Reproduced via `GET /api/me` reached with
no session (independent of the guard bug in brief 77; any 500 leaks its message).

This is low-severity next to brief 77 but is a cheap, unconditional hardening and
independent of it.

## What to do

- For `status >= 500`, send a generic body (`{ error: 'Internal Server Error' }`)
  and keep logging the real error server-side (`fastify.log.error(err)` stays).
- For explicit 4xx (where `err.statusCode` is set by the route deliberately),
  keep `err.message` — those are intended, user-facing messages.
- Do not change the status codes themselves, only the body for 5xx.

## Acceptance

- A test: a route that throws a plain `Error('secret internal detail')` returns
  500 with a body that does **not** contain `secret internal detail`.
- A route that throws with `statusCode: 400` and a message still returns that
  message (4xx behaviour unchanged).
- `npm test`, `npm run lint`, `npm run build`, `bash corpus/lint.sh` clean.

## Files you OWN

- `api/src/server.ts`
- `api/src/server.test.ts`

## Files you must NOT touch

- Route files (they set their own 4xx messages, which stay)
- `corpus/log.md`, `corpus/wiki/status.md`

## Outcome — 2026-10-02

The global error handler sends `{ error: 'Internal Server Error' }` for any
status `>= 500` and still logs the real error. A deliberate 4xx keeps
`err.message`. Status codes are unchanged.

Tests in `server.test.ts`: a test-only route throwing
`Error('secret internal detail: /srv/…')` returns 500 with a generic body
containing neither the detail nor the path, and a `statusCode: 400` throw keeps
its message. The 500 test fails before the change. `npm test` and
`npm run build` are clean. Repo lint has one pre-existing error, brief 80's.

The security decisions for briefs 77, 85 and 79 are recorded in
`wiki/decisions-security.md`.
