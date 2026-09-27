# Task 90 — The render route, `/api/me`, and the UI's `api.ts`/router have no tests

## Context

Found in the 2026-09 coverage sweep. Load-bearing code from the last two commits
has no test:

- **`POST /api/posts/:id/render`** (`api/src/routes/render.ts`) — the only
  production call site that wires `db` into the render pipeline (render.ts:88-96,
  the brief-88 fix). No `render.test.ts`; absent from `server.test.ts` (grep).
  A refactor dropping `db: db()` compiles and every other test stays green while
  production renders go blank. Its SSE `progress`/`done`/`error` shape and the
  theme-not-found / compile-error / empty-slides branches are untested.
- **`GET /api/me`** (`api/src/routes/me.ts`) — the one place the estate-wide grant
  map is narrowed to `{ subject, username }`. Untested. A regression spreading
  `...ward` (leaking `grants` to the browser) or dropping `cache-control:
  no-store` ships green.
- **`ui/src/lib/api.ts`** — `wardLoginUrl` (deliberately NOT base-prefixed),
  `redirectToLogin`, and `api()`'s 401→redirect / non-ok→`ApiError` / 204→undefined
  / `skipAuthRedirect` handling. No test. A change routing `wardLoginUrl` through
  `withBase` would send every signed-out user to `/newspapper/ward/login` (nothing
  serves it) with no test failing.
- **`ui/src/router.tsx`** — the base-path strip/add call sites. `base.test.ts`
  tests only the pure helpers and explicitly notes `withBase`/`stripBase` are
  untested because `BASE_URL` is fixed at `/` under vitest, leaving the actual
  router call sites (the code that regresses under `/newspapper/`) uncovered.

## What to do

1. **Render route** (in `server.test.ts` or a new `render.test.ts`, using
   `buildApp({ ward: fake })` + `app.inject`): with a saved post + a stubbed
   renderer (or real Chromium behind the brief-91 skip guard), assert the SSE
   stream emits `progress` then `done`; assert `db()` is actually used (ties to
   brief 88 — an uploaded image round-trips non-blank). Add theme-not-found and
   no-slides cases asserting `event: error`.
2. **`/api/me`**: inject with a signed-in fake session; assert the body is exactly
   `{ user: { subject, username } }` (no `grants` key) and `cache-control:
   no-store`.
3. **`ui/src/lib/api.ts`**: mock `global.fetch` and `window.location.assign`;
   assert 401 → `assign('/ward/login?next=…')` + throws `ApiError(401)`;
   `skipAuthRedirect:true` suppresses the redirect; a non-ok body's `error`
   becomes the thrown message; 204 → undefined.
4. **Router base path**: add a seam so `BASE_URL` can be overridden per test (a
   small injectable base on `usePathname`/`navigate`, or a module mock), then
   assert `usePathname()` under `location.pathname='/newspapper/posts'` returns
   `/posts` and `navigate('/posts')` writes `/newspapper/posts`. This seam also
   unblocks the base-path assertions in brief 78.

If a DOM is needed for the UI tests, add `jsdom` (or `happy-dom`) as a **pinned**
devDependency, and rely on brief 81 having widened the vitest glob to `.tsx`.

## Acceptance

- Each of the four areas has at least one test that fails under the regression it
  guards (spot-check by local mutation, not committed).
- `/api/me` test proves `grants` never reaches the client.
- `npm test`, `npx tsc -p ui --noEmit`, `npm run lint`, `npm run build`,
  `bash corpus/lint.sh` clean.

## Files you OWN

- `api/src/server.test.ts` and/or `api/src/routes/render.test.ts`
- `ui/src/lib/api.test.ts` (new), `ui/src/router.test.tsx` (new)
- a minimal test seam in `ui/src/router.tsx` if needed (smallest change; behaviour
  unchanged in prod)
- `ui/package.json` only to add a pinned `jsdom`/`happy-dom` devDependency

## Files you must NOT touch

- production behaviour of `api/src/routes/*` and `ui/src/lib/api.ts` — testing,
  not changing
- `corpus/log.md`, `corpus/wiki/status.md`

## Depends on

- Brief 81 (vitest `.tsx` glob) for the UI tests to be collected.
- Coordinates with brief 78 (shares the router base-path test seam).
