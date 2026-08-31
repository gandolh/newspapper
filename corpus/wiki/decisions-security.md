---
summary: The locked security calls — single-account auth and its lockout, password rotation, and which paths are guarded versus deliberately public.
updated: 2026-08-31
---

# Decisions — security

The app runs on loopback for one person, and every call here was made against
that assumption. **That assumption is the thing to revisit first** if Newspapper
is ever exposed beyond localhost — several of these trade safety for the fact
that there is exactly one account and no network adversary.

Engineering calls live in
[decisions-engineering.md](./decisions-engineering.md), product-shaping ones in
[decisions.md](./decisions.md). Same rule: don't reopen one without an explicit
revisit and a [log.md](../log.md) entry.

## Login lockout is keyed on address, never on username
_2026-08-27_ — Five failed logins from one address earn a `429` with
`Retry-After` for 60 seconds. In-memory, per-process, capped at 1000 keys,
entries expiring after 15 idle minutes; a success clears the counter.
Rejected: **an artificial delay**, which the brief suggested. Holding a
connection open for N seconds *is* the denial of service the measure exists to
prevent — it hands an attacker free socket exhaustion. Rejected more firmly:
**keying on username.** Newspapper has exactly one account, so a username-keyed
lockout lets any stranger who can reach the port lock the owner out of their own
app indefinitely. The address is the only key that fails safe here.

## The password can be rotated from inside the app
_2026-08-27_ — `POST /api/password` (guarded, requires the current password,
rotates the session cookie on success). No UI yet; the endpoint is ready for one.
Rejected: seeding-only. `ADMIN_PASSWORD` is read at first boot **only**, so
without a rotation path a compromised password could be changed only by
hand-editing SQLite, and the plaintext would live in `.env` forever.

## `/uploads/*` is public; `/api/*` and `/output/*` are guarded
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

`/output/*` went the other way. The brief only asked for `/api/*`, but the
rendered slides are the app's actual content and were being served to anyone who
asked, so the guard covers them too.
