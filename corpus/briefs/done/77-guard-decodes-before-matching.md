# Task 77 — The guard reads the raw URL; Fastify routes the decoded one

## Context

**Critical, internet-exploitable, unauthenticated.** Found in the 2026-09
improvements sweep and **reproduced** against the real app (`buildApp({ ward })`
with a fake Ward, no cookie sent).

The Ward guard decides whether a request needs a session from the **raw**
request URL:

- [api/src/ward/ward.guard.ts:96-98](../../../api/src/ward/ward.guard.ts) — the
  `onRequest` hook calls `isGuardedPath(req.url)`.
- `isGuardedPath` / `pathOf` (same file, ~line 72-80) test
  `path.startsWith('/api/')` etc. against that raw string.

But Fastify's router (find-my-way) **percent-decodes** the path before matching,
so `/%61pi/posts` (`%61` = `a`) never matches `/api/` in the guard, the hook
`return`s without authenticating, and then routes straight to the real
`/api/posts` handler. The `config: { public: true }` opt-out is unaffected; this
is purely the raw-vs-decoded mismatch.

Reproduced, **no cookie**, against the seeded DB:

```
GET  /api/posts       → 401   (guarded, correct)
GET  /%61pi/posts     → 200   returns every post incl. markup
GET  /a%70i/settings  → 200
POST /%61pi/posts     → 201   created a post anonymously
PUT  /%61pi/settings  → 200
GET  /%6Futput/<dir>/slide-01.jpg → 200 (rendered slide bytes)
GET  /%75ploads/<ref> → reaches the handler (404), i.e. guard skipped, not 401
```

On the public VPS (`https://gandolh.ro/newspapper/`, Caddy `handle_path`
forwards the encoded path unchanged) this is anonymous full read **and write** of
every post, source, setting, upload and rendered slide. It is the single most
important finding in the sweep.

## Root cause, stated once

Guardedness must be decided from **what Fastify matched**, not from the raw URL
bytes. In the `onRequest` hook `req.routeOptions.url` is already populated and
holds the **matched route pattern** (`/api/posts` for a request to
`/%61pi/posts`) — verified in the same probe. The hook already reads
`req.routeOptions.config` for the `public` flag on that same object, so the
matched pattern is in hand.

## What to do

1. In the `onRequest` hook, decide guardedness from the matched route, not the
   raw URL: use `req.routeOptions?.url` when present, and treat a request that
   matched **no** route as non-guarded (it will 404 anyway — but confirm that a
   404 path cannot reach a guarded handler).
2. Keep `PUBLIC_PATHS` / `GUARDED_PREFIXES` / the `config.public` opt-out exactly
   as they are — only the **input** to `isGuardedPath` changes.
3. Consider whether `/output/*` and `/uploads/*`, which are served by
   `@fastify/static` (not declared route handlers), expose a
   `req.routeOptions.url`. If a static-plugin request does **not** carry a
   matched route pattern, the hook must still guard it — do not let a static
   asset fall through to "no route matched → not guarded". Decide this
   explicitly and prove it with a test at both the encoded and decoded spelling.

## Acceptance

- New tests in `api/src/ward/ward.guard.test.ts` (or `server.test.ts`) that, with
  **no** session, assert **401** for each of: `/%61pi/posts`, `/a%70i/settings`,
  `POST /%61pi/posts`, `/%6Futput/x/slide-01.jpg`, `/%75ploads/<ref>`, and a
  double-encoded (`%2561pi`) spelling. Each must NOT reach its handler.
- The decoded spellings (`/api/posts`, `/output/...`, `/uploads/...`) still 401
  without a session and 200 with a grant — no regression.
- `/api/health` still public; `config.public` routes still public.
- `npm test`, `npm run lint`, `npm run build`, `bash corpus/lint.sh` all clean.
- State whether a `@fastify/static` request carries `req.routeOptions.url`, and
  how the fix guards it either way — with the test that proves it.

## Files you OWN

- `api/src/ward/ward.guard.ts`
- `api/src/ward/ward.guard.test.ts`
- `api/src/server.test.ts` (if the encoded-path cases land here)

## Files you must NOT touch

- `api/src/ward/ward.client.ts`, `ward.types.ts`, `config.ts`, `fake-ward.ts` —
  the client and its contract are not the bug; the guard's input is
- `core/**`, `ui/**`
- `corpus/log.md`, `corpus/wiki/status.md` — the controller updates these

## Notes

- Related: brief 78 (base-path) and the guarded static routes overlap here only
  in that both touch how URLs are interpreted — they are independent fixes.
- Do **not** "fix" this by decoding `req.url` yourself and re-testing the
  prefix: a decode-then-normalize is easy to get wrong (double-encoding, `..`,
  mixed case). The matched-route pattern is the authoritative source and is
  already computed. If you must normalize a raw path anywhere, justify why the
  matched route was not usable.

## Outcome — 2026-10-02

The `onRequest` hook now calls `requiresSession(req.url, req.routeOptions?.url)`.
A request is guarded if the **matched route pattern** is guarded, or if the raw
URL is. The pattern is the router's own decoded match, so nothing decodes a
path by hand. It is public only when neither spelling is guarded, or when the
matched pattern is exactly a public path (`/api/health`). `PUBLIC_PATHS`,
`GUARDED_PREFIXES` and `config.public` are unchanged.

**Does a `@fastify/static` request carry `req.routeOptions.url`? Yes:** the
plugin declares a real wildcard route, so `/output/*` is matched. The proof is
`/%6Futput/x/slide-01.jpg`: its raw URL doesn't start with `/output/`, yet it
now gets 401, which can only come from the matched pattern. Uploads are a
declared route (`/uploads/:ref`), so they are covered the same way. A request
that matches nothing has no pattern and falls back to the raw check. The router
then 404s it and no guarded handler runs.

Tests (`ward.guard.test.ts`, 9 new): with no session, 401 for `GET /%61pi/posts`,
`GET /a%70i/settings`, `POST /%61pi/posts`, `PUT /%61pi/settings`,
`/%6Futput/x/slide-01.jpg`, `/%75ploads/<ref>` and `/%75ploads/<ref>/original`.
Double-encoded `/%2561pi/posts` decodes once to a literal that matches no
route, and never reaches the posts handler: it gets a 404, or the public SPA
shell when `ui/dist` exists. The decoded spellings still 401. A granted session
gets through at both spellings, and `/api/health` stays public at both. Without
the fix, 7 of these fail.

`npm test` 619/619, `npm run build` clean, `bash corpus/lint.sh` clean. `npm
run lint` still reports its one pre-existing error (an unused `db` in
`api/src/server.ts`), which is brief 80's.

Noticed, out of scope: the prod not-found handler decides "API or SPA" from the
raw URL too, so `/%61pi/<unknown>` gets the SPA shell instead of a JSON 404.
That's cosmetic, with no data exposed.
