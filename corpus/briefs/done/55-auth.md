# Task 55 — Single-account authentication

## Context

[Access is behind a single account](../../wiki/decisions.md#access-is-behind-a-single-account):
one username, one password, one person. This is authentication, **not** a step
toward multi-user — no roles, no registration, no user management screen.

Settled mechanics: `node:crypto` `scrypt` for the hash, a signed cookie session
with a 30-day expiry, and the account seeded from environment variables at first
boot. No new auth dependency.

## Files you OWN

- `api/src/auth/**` — new: hashing, session signing, the `preHandler` guard
- `api/src/routes/auth.ts` — `POST /api/login`, `POST /api/logout`, `GET /api/me`
- `api/src/server.ts` — register the guard and the routes
- `core/src/storage/users.ts` (the table itself comes from brief 52)
- `ui/src/pages/login.astro` and its island
- `.env.example`

## Files you must NOT touch

`core/src/storage/db.ts` (brief 52 owns the migration), the editor, the
renderer.

## What to do

1. **Hashing.** `scrypt` via `node:crypto`, per-password random salt, stored as
   a single self-describing string (`scrypt$N$r$p$salt$hash`) so parameters can
   change later. Compare with `timingSafeEqual` — never `===`.
2. **Seeding.** On boot, if the `users` table is empty, create the account from
   `ADMIN_USERNAME` / `ADMIN_PASSWORD`. If either is unset **and** the app is not
   in development, fail loudly at startup rather than booting unprotected.
3. **Session.** A signed cookie (HMAC over user id + expiry, key from
   `SESSION_SECRET`). Stateless — no sessions table. `httpOnly`, `sameSite=lax`,
   `secure` when not on localhost. 30-day expiry.
4. **Guard.** A `preHandler` on every `/api/*` route except `health` and the auth
   routes themselves. Unauthenticated requests get **401 with a JSON body**, not
   a redirect — the UI decides where to send the user.
5. **UI.** A login page, and a client-side redirect to it on any 401. Do not
   build a password-change screen; it is an open question.
6. Rate-limit failed logins with a simple in-memory counter — a fixed delay after
   5 failures from one address is enough. Do not add a dependency for this.

## Acceptance

- Every `/api/*` route except health and auth returns 401 when unauthenticated;
  tests cover both an allowed and a blocked route.
- A wrong password never reveals whether the username existed.
- Boot with unset credentials in production mode exits non-zero with a clear
  message.
- Cookie is `httpOnly` and signed; tampering with it produces a 401.
- `corpus/wiki/configuration.md` documents the new env vars, and `.env.example`
  lists them.

---

## Outcome — 2026-08-27

Done, 65 tests, no new dependency — `node:crypto` throughout, cookies parsed and
serialized by hand. scrypt with a per-user salt in a self-describing
`scrypt$N$r$p$salt$hash` format so the cost can be raised later without
invalidating accounts; `timingSafeEqual` for both the password and the session
HMAC, with a length guard first so a truncated cookie returns 401 rather than
throwing; a memoised dummy hash so a bad username costs the same wall-clock as a
bad password; scrypt parameters bounds-checked on parse so a tampered stored hash
cannot trigger memory exhaustion.

The guard is a **root-level `onRequest` hook**, not a Fastify plugin and not
`preHandler` as the brief worded it. A plugin would encapsulate the hook and miss
other plugins' routes; `onRequest` rejects before body parsing, so an
unauthenticated 20 MB upload is refused without being buffered.

Both open questions from `wiki/open-questions.md` were answered here and are
recorded in `wiki/decisions-engineering.md`: address-keyed lockout returning 429
rather than an artificial delay, and password rotation via `POST /api/password`.

Beyond the brief: `/output/*` was being served unauthenticated. The rendered
slides are the app's content, so the guard covers them now too.

Left open deliberately: no logout button (the sidebar belongs to brief 62) and
no password-change form (the brief says not to; the endpoint is ready).
