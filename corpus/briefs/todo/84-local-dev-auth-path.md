# Task 84 — There is no way to run the app locally after the Ward move

## Context

Found in the 2026-09 sweep and verified by running `api/src/ward/config.ts`. A
developer who follows README and does `cp .env.example .env && npm run dev`:

- **With WARD_* unset**, `buildApp()` throws in `registerAuthGuard → wardConfig()`
  (`required()` at `api/src/ward/config.ts:17-25`) before `.listen()`; the API
  exits 1. (Verified: `WARD_PUBLIC_ORIGIN is not set…`.)
- **With the `.env.example` placeholders** (`WARD_PUBLIC_ORIGIN=https://gandolh.ro`,
  `WARD_API_BASE_PATH=/ward-api`, `WARD_APP_KEY=wak_replace_me`) the API boots,
  but the UI at `localhost:4321` 401s on its first `/api/me` — there is no
  `ward_session` cookie on `localhost` (Ward issues it only for `gandolh.ro`).
  `redirectToLogin` sends the browser to `/ward/login?next=…` (origin-absolute by
  design, `ui/src/lib/api.ts`), which on localhost hits nothing — the Vite proxy
  forwards only `/api`, `/output`, `/uploads`, `/assets` — so Vite serves
  `index.html`, the router finds no `/ward/login` route, and it loops.

There is **no** coded dev path: no `NODE_ENV` branch in `api/src/ward/*` (grep:
zero), `fake-ward.ts` is reachable only via `buildApp({ ward })` (tests only), and
Ward's own integration contract
([wzd_auth/corpus/wiki/integrating.md](../../../../wzd_auth/corpus/wiki/integrating.md))
documents one production instance with no local variant for consuming apps. The
owner cannot run newspapper on a fresh machine, and neither can any future
contributor or agent.

## Decision needed before building

Pick the local-dev auth story and record it as a decision (this is why the brief
is in Next, not Now):

- **(A) A dev-only guard bypass.** Gate on `NODE_ENV === 'development'` (or an
  explicit `NEWSPAPPER_DEV_AUTH=1`) in `ward.guard.ts` to inject
  `createFakeWard()` with a standing grant, and make `wardLoginUrl` a no-op/base-
  aware in dev. Cheapest; risk is a bypass that must be provably impossible in
  production. **Recommended** — fail-safe if gated on an explicit opt-in that
  defaults off and is asserted off when `NODE_ENV==='production'`.
- **(B) Point dev at the real Ward** via a documented tunnel / hosts entry so the
  `gandolh.ro` cookie is present. No app code; heavier setup; only the owner can
  do it.

Prefer (A) with an explicit, default-off env flag, and a test asserting the
bypass is inert under `NODE_ENV==='production'`. Confirm the choice before coding
(the sweep recommends A but the owner decides the security tradeoff).

## What to do (for choice A)

1. In `ward.guard.ts`, when the opt-in dev flag is set AND `NODE_ENV !==
   'production'`, use a fake session with a `newspapper` grant instead of calling
   Ward — without weakening the production path (the real client is still the
   default and the only thing production can reach).
2. Make the UI's 401 handling not loop in dev: either the bypass means no 401
   fires, or `wardLoginUrl` degrades to a harmless local target in dev.
3. Add the flag to `.env.example` with a comment that it is dev-only and unsafe
   in production, and document the local-dev flow in README / commands.md
   (coordinate with brief 83).

## Acceptance

- `cp .env.example .env && npm run dev` yields a usable app on `localhost:4321`
  (editor loads, `/api/me` succeeds) with no infinite redirect. State exactly
  what env produced it.
- A test asserts the bypass does nothing when `NODE_ENV==='production'` (the
  guard still calls the real Ward and 401s without a session).
- Production boot still requires all three WARD_* and fails closed without them.
- `npm test`, `npm run lint`, `npm run build`, `bash corpus/lint.sh` clean.
- Record the choice in `corpus/wiki/decisions-security.md` (the controller may do
  this at move time) — note what was rejected and why.

## Files you OWN

- `api/src/ward/ward.guard.ts` (+ its test)
- `.env.example`, `infrastructure/.env.example` if the flag applies there
- README.md / `corpus/wiki/commands.md` for the local-dev note (coordinate w/ 83)

## Files you must NOT touch

- `api/src/ward/ward.client.ts` — the real client is not the bug
- `corpus/log.md`, `corpus/wiki/status.md`

## Note

If the owner picks (B), this brief becomes docs-only (README + commands.md +
configuration.md describing the tunnel) and no guard code changes — move it to a
docs pass and say so at completion.
