---
summary: Brief 23 (2026-10-13) — newspapper has local accounts again and a "Sign in with Ward" button, on the shared ward-auth library vendored at 0.2.0. Why routePrefix is /api/auth, why the session cookie's Path is the app base, why /uploads stays guarded, what was dropped (the hand-written Ward client, the 503, the dev /ward proxy) and the data caveat (nothing to migrate).
updated: 2026-10-13
---

# Decisions — accounts and Ward sign-in

Brief 23. It revises the Ward-only identity of 2026-09-06
([decisions-security.md](./decisions-security.md#identity-is-wards-and-authority-is-a-grant)).
The estate's reasoning is Ward's own (`decisions-oidc.md` in its corpus); what
follows is only what this app chose.

## Local accounts, Ward as a second way in
_2026-10-13_ — Users, scrypt passwords, lockout and opaque server-side sessions
live in newspapper's own SQLite file, through the vendored library
(`api/vendor/ward/`, hooks in `ui/vendor/ward/`, version 0.2.0, never edited).
"Sign in with Ward" is a code flow with PKCE finished by this server; a first
Ward sign-in creates a local user linked to the Ward account, and nothing is
ever matched by username. Local sign-in never calls Ward, so the app works while
Ward is down. A session that began with Ward is checked against Ward at most
every 30 seconds, so revoking it in Ward's console ends it within that bound; a
Ward that cannot answer refuses it (`ward_unavailable`) and the local session
keeps working. There is **no register page**: an account comes from the seed
script or a Ward grant.

**Rejected:** staying Ward-only. It made a Ward outage a total outage of a
single-editor tool, and the password path gives the owner a way in that does not
depend on another service. **Rejected:** keeping the hand-written Ward client
beside the library: two implementations of one contract, with the older one's
JWKS and introspection machinery and its unpinned `jose`.

**The lockout is back, as the library's.** The 2026-08-27 reasoning (key on the
address, never the username, or a stranger can lock the one owner out of their
own app) is exactly what the library does, so it was adopted rather than
re-argued. It had been removed on 2026-09-06 because there was no credential to
brute-force; there is one again, and Ward's own lockout does not cover it.

## `routePrefix` is `/api/auth`; the cookie's `Path` is the app base
_2026-10-13_ — The dev proxy and Caddy's `handle_path` strip only `/newspapper`,
so the browser's `/newspapper/api/auth/...` is `/api/auth/...` to Fastify, in
both places. The library's default `/auth` would have put the routes at
`/newspapper/auth/...`, outside the API prefix that proxy rules and the seeded
callback (`.../newspapper/api/auth/ward/callback`) rely on.

The cookie's `Path` is the **base** (`/newspapper`), not the API prefix the guide
shows. The editor and the posts list use `<img src="/newspapper/output/...">` and
`/newspapper/uploads/...`, which are guarded and sit beside `/api`; a cookie
scoped to `/newspapper/api` is never sent with them. `fastify.inject` attaches
cookies without regard to `Path`, so no API test can see this. The cost of the
wider path is that the cookie also rides requests for the UI bundle, which are
public. `NEWSPAPPER_BASE` is the one source, read by both the UI build and the
API at runtime. **Rejected:** `Path=/newspapper/api` with `/output/*` made
public, which would reverse a recorded decision to buy a tighter cookie.

## `/uploads/*` stays guarded
_2026-10-13_ — Brief 23's text says `/uploads/*` "stays public for headless
rendering, as decided in newspapper's corpus". The corpus decided the opposite
on 2026-09-06
([decisions-security.md](./decisions-security.md#uploads-is-public-api-and-output-are-guarded)):
the render browser reads uploads from disk, so nothing anonymous needs the
route. That decision was kept, and the same guard now covers `/api/*`,
`/output/*` and `/uploads/*` through the library's `isPublic` hook, with brief
77's matched-route rule intact (`api/src/ward/ward.guard.ts`). Opening it is one entry
in that function if the owner decides to.

## Nothing to migrate
_2026-10-13_ — The brief asks for rows keyed by a Ward subject to keep working as
the local id. There are none: v5 dropped `users`, and no table in this schema
ever held a user key (`data.md`). So there is no migration, no placeholder
username and no `createLinkedUser` call in the code. The one existing Ward
operator is created on their first "Sign in with Ward" (`userForSignIn`), or
seeded locally and linked from Settings. If a table ever does carry a user id,
use `createLinkedUser({ subject, id: subject, ... })` as the adoption guide's
section 7 says, with a test.

## Dropped
- `api/src/ward/` as it was (the client, its types, the fake Ward) and
  `GET /api/me`. The library's session probe replaces the route; its test
  seam replaces the fake (`test-support.ts`).
- The 403 for "live session, no `newspapper` grant". Ward's grant is checked at
  Ward: no grant means `access_denied` on the login page. Authority inside the
  app is the role in the local row, and every role opens it.
- The `503` for Ward unreachable. A local session never depended on Ward. A
  Ward-originated one answers 401 with `reason: ward_unavailable`, and the
  login page says to use the password.
- The dev server's `/ward` and `/ward-api` proxy and its `Origin` rewrite. The
  browser goes to Ward's own origin; the app's server talks to Ward through
  `WARD_OIDC_ISSUER`.
- `WARD_PUBLIC_ORIGIN`, `WARD_API_BASE_PATH` and `WARD_APP_KEY`, and `jose`.
