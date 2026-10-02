# Task 100 — Bump the production dependencies that carry security advisories

## Context

Found in the 2026-09 sweep. `npm audit --omit=dev` reports advisories in
production dependencies; the app is now internet-facing on a shared VPS. Reachable
in the runtime (not just dev tooling):

- **`@fastify/static` 8.3.0** — advisories incl. a **high** "route guard bypass
  via path traversal" (GHSA-83w8-p2f5-377r) and "auth bypass via non-canonical URL
  paths" (GHSA-8pvw-jcv7-9cmj). newspapper serves `/output/*`, `/assets/fonts/*`
  and `ui/dist` through this plugin, behind the Ward guard. **I probed the fonts
  route with encoded/`..` traversal variants and it refused all of them** (403 or
  the SPA index, never `data/sources.json`), so this is **not currently
  exploited** here — but the advisory class is exactly "static plugin + guard
  bypass", it compounds with brief 77, and the fix is a version bump. Patched in
  the 10.1.x line (a **major** from 8.x — check the `@fastify/*` peer set).
- **`fastify` 5.8.5** — moderate X-Forwarded spoofing under trustProxy (low here:
  behind Caddy, and trustProxy config should be checked) and a schema-coercion
  bypass. Patched in 5.12.5 (non-major).
- **`find-my-way` ≤9.6.0** — high "DDoS with HTTP2" (Caddy terminates HTTP/2, so
  low reachability). Transitive via fastify.
- **`fast-uri` ≤3.1.5** — SSRF/host-confusion advisories, transitive via fastify's
  ajv. Picked up by bumping fastify.

Dev-only advisories (esbuild/vite, vitest, concurrency/shell-quote, brace-expansion
via eslint/typedoc) are **out of scope** here — they don't ship to production.

**Constraint:** this repo pins every dependency exactly (no `^`/`~`) — a locked
decision. Bumps must be to exact versions, and the caret ranges currently in
`api/package.json` (`jose`) and all of `docs/package.json` are a separate
pinning-hygiene issue noted for the owner, not fixed here.

## What to do

1. Bump `@fastify/static` to the current patched exact version, resolving the
   `@fastify/*` peer set it needs; run the full suite (the static-serving tests in
   `server.test.ts`/`uploads.test.ts` must still pass) and manually confirm
   `/output`, `/assets/fonts` and the SPA fallback still serve.
2. Bump `fastify` to `5.12.x` (exact), which also updates `find-my-way`/`fast-uri`
   transitively; re-run `npm audit --omit=dev` and confirm the production
   advisories clear.
3. Keep everything pinned exactly; update `package-lock.json`; note any behaviour
   change from the `@fastify/static` major in the brief outcome.
4. Re-run the brief-77 encoded-path guard tests after the bump — the static
   plugin's path handling may have changed.

## Acceptance

- `npm audit --omit=dev` reports no high/critical in production deps (or documents
  why any residual is unreachable).
- All versions exact (no `^`/`~`) in the files you touch; `npm ci` reproduces.
- `npm test`, `npm run build`, `npm run lint`, `bash corpus/lint.sh` clean; manual
  check that static assets and the SPA still serve.
- Update `corpus/wiki/dependencies.md` for the bumped versions (coordinate w/ 83).

## Files you OWN

- `api/package.json`, root `package-lock.json`
- `corpus/wiki/dependencies.md`

## Files you must NOT touch

- `docs/package.json` caret ranges (separate hygiene item) unless a shared
  transitive forces it
- `corpus/log.md`, `corpus/wiki/status.md`

## Note

Landing brief 77 (guard on matched route) is the actual fix for the guard-bypass
*class*; this bump is defence-in-depth on the static plugin. Do 77 regardless of
this.

## Outcome — 2026-10-02

`api/package.json` pins `@fastify/static` 10.1.5 (from 8.3.0, a major) and
`fastify` 5.12.5 (from 5.8.5), exactly. A plain `npm audit fix` (no `--force`,
lockfile only) moved the transitive packages inside their ranges:
`find-my-way` 9.9.0, `fast-uri` 3.1.8, `brace-expansion` 5.0.12. **`npm audit
--omit=dev` reports 0 vulnerabilities.** Dev-only advisories remain, out of
scope.

**Behaviour after the static major**, probed with `app.inject` against the real
app and a fixture file:
- `/assets/fonts/Inter-Bold.ttf` 200;
- `/output/<dir>/slide-01.jpg` 200 with a session and 401 without;
- the SPA fallback `/posts` 200 `text/html`;
- three traversal spellings (`..%2f`, `%2e%2e/`, `../`) all get the SPA shell,
  never `package.json` or `sources.json`.

The brief-77 encoded-path guard tests pass, and so do all 660 tests, the build
and lint. `jose`'s caret range is the separate pinning-hygiene issue the brief
names and is untouched. `wiki/dependencies.md` notes the versions.
