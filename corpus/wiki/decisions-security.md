---
summary: The locked security calls — single-account auth and its lockout, password rotation, and which paths are guarded versus deliberately public.
updated: 2026-09-06
---

# Decisions — security

The app ran on loopback for one person, and every call below was made against
that assumption. **That assumption is now retired.** Newspapper moved to the
shared VPS on 2026-09-06 and is served at `https://gandolh.ro/newspapper/`, so
the three calls that leaned on an unreachable port have each been revisited —
see the dated notes in each section, and the new section at the end.

Engineering calls live in
[decisions-engineering.md](./decisions-engineering.md), product-shaping ones in
[decisions.md](./decisions.md). Same rule: don't reopen one without an explicit
revisit and a [log.md](../log.md) entry.

## ~~Login lockout is keyed on address, never on username~~
_2026-08-27_ — Five failed logins from one address earn a `429` with
`Retry-After` for 60 seconds. In-memory, per-process, capped at 1000 keys,
entries expiring after 15 idle minutes; a success clears the counter.
Rejected: **an artificial delay**, which the brief suggested. Holding a
connection open for N seconds *is* the denial of service the measure exists to
prevent — it hands an attacker free socket exhaustion. Rejected more firmly:
**keying on username.** Newspapper has exactly one account, so a username-keyed
lockout lets any stranger who can reach the port lock the owner out of their own
app indefinitely. The address is the only key that fails safe here.

> **Revised 2026-09-06 — removed, not retuned.** The obvious move on leaving
> loopback was to keep this and tighten the numbers. That would have been
> solving a problem newspapper no longer has: there is **no credential here to
> brute-force**. Login is Ward's, and Ward has its own lockout with its own
> budget — which is the right place for it, because a per-app counter would have
> guarded one of six front doors to the same set of accounts while the other
> five stood open. The reasoning above about address-keying remains correct and
> is why Ward's own lockout is not username-keyed either.

## ~~The password can be rotated from inside the app~~
_2026-08-27_ — `POST /api/password` (guarded, requires the current password,
rotates the session cookie on success). No UI yet; the endpoint is ready for one.
Rejected: seeding-only. `ADMIN_PASSWORD` is read at first boot **only**, so
without a rotation path a compromised password could be changed only by
hand-editing SQLite, and the plaintext would live in `.env` forever.

> **Superseded 2026-09-06.** `POST /api/password` is gone with the `users`
> table. Changing a password is a Ward self-service action now, at
> `/ward/account`, and it applies across the estate rather than to one app. The
> concern that motivated this — a compromised password with no rotation path
> short of editing SQLite — is answered better by Ward, which can also revoke
> the sessions.

## ~~`/uploads/*` is public~~; `/api/*` and `/output/*` are guarded
_2026-08-27_ — The upload asset routes serve without a session, deliberately.
Headless Chromium fetches `<Image>` sources mid-render and carries no cookie, so
guarding them would break rendering. The exposure is bounded rather than absent:
a ref carries 32 bits of unguessable entropy, the app is single-user on
loopback, and the routes are marked `public` explicitly so they keep working if
the guarded prefix list grows.
Rejected: minting a render-scoped token — more machinery than a local
single-user app earns. Note this is a real trade, not an oversight: anyone who
can reach the port can serve an upload whose ref they have. If Newspapper ever
leaves loopback, this is the first thing to revisit.

> **Revised 2026-09-06 — `/uploads/*` is now guarded like everything else.**
> Newspapper left loopback, so the exposure lost the half that was actually
> doing the work: 32 bits of ref entropy **and an unreachable port** became 32
> bits of ref entropy on the public internet.
>
> The expected fix was a render-scoped token, and the reason this section
> rejected one — "more machinery than a local single-user app earns" — had
> indeed stopped being true. It was rejected again anyway, for a better reason:
> **the request can be removed instead of authorised.**
> `core/src/render/uploads-route.ts` intercepts `/uploads/*` inside the render
> browser's context and fulfils it from disk, which is precisely the mechanism
> `render/fonts.ts` already used for `@font-face` files (there for a CORS
> reason, here for a security one).
>
> That is strictly stronger than a token: no new bearer credential exists, so
> there is no lifetime, no signing key, no leak path through logs and no
> revocation story to get wrong; the route stops being public *at all*, so a
> ref's entropy goes back to being an identifier rather than a security
> boundary; and rendering stops depending on the API being reachable, exactly
> as fonts already did.
>
> The cost is one coupling: `renderSlides` now needs the uploads database
> handle. **A run that renders images without passing it produces blank
> images** — the fetch falls through to the network and gets a 401. That is the
> intended failure mode, and it is loud; a silent fallback to an
> unauthenticated fetch is the thing that must not happen.

`/output/*` went the other way. The brief only asked for `/api/*`, but the
rendered slides are the app's actual content and were being served to anyone who
asked, so the guard covers them too.

## Identity is Ward's, and authority is a grant
_2026-09-06_ — Newspapper holds **no credential of any kind**. The stateless
30-day HMAC session cookie, `SESSION_SECRET`, the scrypt password check, the
`users` table, `POST /api/login`, `POST /api/logout` and the login page are all
deleted. The browser presents Ward's `ward_session` cookie; newspapper verifies
it locally against Ward's JWKS — **with the algorithm pinned as a literal**,
never read from the token's own header, which is what closes the `alg`-confusion
class — and then asks Ward whether the session is still live, caching that
answer 30 seconds.

**Three outcomes, three status codes**, and the middle one is the new idea:

- **401** — no session, or a dead one. The UI navigates to `/ward/login?next=…`.
- **403** — a live Ward session holding **no `newspapper` grant**. Holding a
  Ward account confers nothing; a grant is the estate's actual security
  boundary, which is what lets prm keep public self-registration without those
  accounts reaching this app. This must not redirect: the person is already
  signed in, and only a superuser issuing a grant resolves it.
- **503** — Ward unreachable, or newspapper's own app key refused. **Fails
  closed**, and deliberately never reported as "signed out" — telling somebody
  to sign in when the identity service is down sends them to a login page that
  cannot work either.

Newspapper hand-writes its Ward client (`api/src/ward/`) rather than importing a
shared package; the contract is
[`wzd_auth/corpus/wiki/integrating.md`](../../../wzd_auth/corpus/wiki/integrating.md),
and `wzd_auth/client/` is the tested reference it was adapted from. There is no
logout here and there must not be: the session belongs to the estate, so ending
it in one app while the others still honoured it would be a lie the cookie
contradicts on the next request.
