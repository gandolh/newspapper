# Task 104 — A JWKS outage answers 401 ("signed out") instead of 503

## Context

Found 2026-10-03 by brief 89's client tests, and pinned there as an `it.fails`
case in `api/src/ward/ward.client.test.ts` ("a JWKS outage is unavailable (503),
not unauthenticated (401)").

`verify()` in `api/src/ward/ward.client.ts` wraps **every** error from
`jwtVerify` as `WardAuthenticationError`. That includes jose's failure to fetch
the key set (`JWKSTimeout`, a non-200 from the JWKS endpoint, a network error).
So when Ward's key endpoint is down, or newspapper's first request after a
restart can't reach it, the guard answers **401**. The UI treats that as signed
out and sends the person to Ward's login page, which is down too. The client's
own header says an unreachable Ward must fail closed with a 503, never a 401,
and introspection already does exactly that. The JWKS path is the gap.

## Files you OWN

- `api/src/ward/ward.client.ts` (`verify` only)
- `api/src/ward/ward.client.test.ts` (flip the `it.fails` to `it`)

## Files you must NOT touch

- `ward.types.ts` (the error classes are right), the guard, `fake-ward.ts`

## What to do

1. In `verify`, distinguish key-retrieval failures from token failures. jose
   exposes them as error classes/codes: `JWKSTimeout` (`ERR_JWKS_TIMEOUT`), and
   fetch/HTTP failures from `createRemoteJWKSet` (`ERR_JOSE_GENERIC`, "Expected
   200 OK from the JSON Web Key Set HTTP response"). Map those to
   `WardUnavailableError`. Everything else stays `WardAuthenticationError`.
   Note: `ERR_JWKS_NO_MATCHING_KEY` (an unknown `kid`) is a token problem, not an
   outage, and must stay 401.
2. Flip the `it.fails` test to `it`, and add a timeout case if practical.

## Acceptance

- A JWKS 500 or a network failure surfaces as `WardUnavailableError` (the guard
  answers 503). An unknown `kid`, a bad signature or an expired token still
  answers 401.
- All of `ward.client.test.ts` passes with no `it.fails` left. `npm test`,
  `npm run lint`, `npm run build` and corpus lint are clean.

## Outcome — 2026-10-03

`verify` now classifies a `jwtVerify` failure with `isKeySetUnavailable`. These
become `WardUnavailableError`, which the guard answers with 503:
- jose's `ERR_JWKS_TIMEOUT` and `ERR_JWKS_INVALID`;
- the generic `ERR_JOSE_GENERIC` errors jose throws for a non-200 or
  unparseable JSON Web Key Set;
- any error that never became a jose error (a network failure).

Every token problem keeps its specific jose code and stays
`WardAuthenticationError` (401). That includes an unknown `kid` against a
healthy set (`ERR_JWKS_NO_MATCHING_KEY`).

Tests: the `it.fails` from brief 89 is now a plain passing `it` (JWKS 500 →
unavailable). Three more cases: a JWKS network failure and an unparseable JWKS
are unavailable, and an unknown `kid` is still unauthenticated and not
unavailable. `npm test` 691/691, lint and build clean.
