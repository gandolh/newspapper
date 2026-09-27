# Task 89 — The real Ward client is never exercised; only the test double is

## Context

Found in the 2026-09 coverage sweep. `api/src/ward/ward.client.ts`
(`createWardClient` — `verify`, `callWard`/`introspect`, `authenticate`) is the
code that actually decides who is authenticated in production, and **no test ever
calls it**. There is no `ward.client.test.ts`; `ward.guard.test.ts` and
`server.test.ts` inject `createFakeWard()`, whose `verify()` throws
unconditionally and maps a cookie value straight to a session — it never runs the
JWT verification or the introspection HTTP call.

Regressions that ship green today:

- Weakening the algorithm pin (`algorithms: [ACCESS_TOKEN_ALG]`, client.ts:150)
  to accept `alg:none` or the `HS256`-with-public-key confusion the comment warns
  about.
- Wrong `iss`/`aud`, expired token, missing required claims, unknown `kid`.
- A JWKS fetch failure that must surface as **503** (fail-closed), not silently
  pass or 401.
- Introspection returning 5xx must be `WardUnavailableError` → 503, **not**
  treated as "inactive" → 401; introspection 401 must be `WardConfigurationError`
  (app key wrong); `{active:false}` → 401.
- The 30 s introspection cache expiring and re-fetching; the app-key header
  actually being sent.

These are the estate's security boundary; a silent flip from 503→allow or an
accepted unsigned token is the worst-case regression.

## What to do

Add `api/src/ward/ward.client.test.ts` that drives the **real** client with an
injected `fetch` (the `WardClientOptions.fetch` seam) and locally signed tokens:

1. Generate an Ed25519 keypair with `jose`; serve its public JWKS via the
   injected fetch for the JWKS endpoint; sign tokens with `SignJWT`.
2. Assert: a valid token with correct `iss`/`aud`/claims → live session; an
   `alg:none` and an `HS256`-signed-with-the-public-key token → rejected
   (`WardAuthenticationError`); expired / wrong-iss / missing-claim → rejected;
   unknown `kid` → rejected.
3. Introspection: `{active:true,…}` → `WardCaller`; `{active:false}` →
   auth error (401 territory); HTTP 500 → `WardUnavailableError` (503, never
   inactive); HTTP 401 → `WardConfigurationError`; malformed JSON → unavailable.
4. Cache: with an injectable `now`, a second `introspect` within 30 s makes no
   second fetch; after TTL it re-fetches. In-flight de-dup: two concurrent
   `introspect` calls on a cold token make one fetch.
5. Assert the app-key header is present on the introspection request.

## Acceptance

- Each assertion above is a distinct test and fails if the corresponding
  protection is removed (spot-check by mutating the client locally in the
  scratchpad; don't commit the mutation).
- No real network: everything goes through the injected `fetch`.
- `npm test`, `npm run lint`, `npm run build`, `bash corpus/lint.sh` clean.

## Files you OWN

- `api/src/ward/ward.client.test.ts` (new)
- test helpers you add for signing tokens

## Files you must NOT touch

- `api/src/ward/ward.client.ts`, `ward.types.ts`, `config.ts` — testing, not
  changing (if a test finds a real bug, file a new brief)
- `fake-ward.ts` — it stays the guard's double; this brief tests the real client
- `corpus/log.md`, `corpus/wiki/status.md`
