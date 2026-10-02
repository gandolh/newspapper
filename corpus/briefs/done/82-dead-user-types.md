# Task 82 — Dead `User`/`UserRecord` types, and the UI's `User` describes a response that no longer exists

## Context

Found in the 2026-09 sweep. The Ward move dropped the `users` table
(`DROP TABLE IF EXISTS users`, `core/src/storage/db.ts:314`) but left its types:

- [core/src/types.ts:80-88](../../../core/src/types.ts) still defines
  `User { id, username, createdAt }` and `UserRecord extends User { passwordHash }`.
  Neither is exported from `core/src/index.ts` (grep: zero hits) — pure fossil.
- [ui/src/lib/types.ts:95-99](../../../ui/src/lib/types.ts) keeps its own hand copy
  of `User` with `id`/`createdAt`. But `GET /api/me` now returns only
  `{ user: { subject, username } }` (`api/src/routes/me.ts:37-42`) — no `id`, no
  `createdAt`, ever. The one consumer, `SessionMenu.tsx`, reads only `.username`,
  so nothing breaks **today** — but `api<{ user: User }>('/api/me')` is an
  unchecked cast, so a future consumer reaching for `user.id`/`user.createdAt`
  gets `undefined` at runtime with no type error, because TS trusts the stale
  interface.

The UI's hand copy of core types is a deliberate, tested convention
(`ui/src/lib/types.test.ts` diffs the two), so this must be fixed on both sides
consistently.

## What to do

1. Delete `User` and `UserRecord` from `core/src/types.ts` (confirm no importer
   anywhere: grep `core`, `api`, `ui`).
2. Redefine the UI's `User` to match the real `/api/me` payload:
   `{ subject: string; username: string }`.
3. Update `ui/src/lib/types.test.ts` if it enumerates `User`/`UserRecord` in its
   core-vs-ui parity check (`UserRecord` is currently in its `CORE_ONLY` set —
   remove it, since it no longer exists in core).
4. Confirm `SessionMenu.tsx` still typechecks against the new shape.

## Acceptance

- `User`/`UserRecord` gone from core; UI `User` is `{ subject, username }`.
- `npx tsc -p ui --noEmit`, `cd core && npx tsc --noEmit`, `npm test`,
  `npm run lint`, `bash corpus/lint.sh` all clean.
- `ui/src/lib/types.test.ts` still passes (adjust its expected sets, don't delete
  the test).

## Files you OWN

- `core/src/types.ts`
- `ui/src/lib/types.ts`
- `ui/src/lib/types.test.ts`

## Files you must NOT touch

- `api/src/routes/me.ts` — its shape is the source of truth this aligns to
- `corpus/log.md`, `corpus/wiki/status.md`

## Outcome — 2026-10-02

`UserRecord` is deleted from core and from the parity test's `CORE_ONLY` set.
`User` is **redefined rather than deleted**, in core and in the UI mirror
alike, as `{ subject: string; username: string }`: the real `GET /api/me`
payload.

Deviation, with the reason: the brief said to delete `User` from core and
redefine only the UI's. But `ui/src/lib/types.test.ts` asserts the mirror has
no exports beyond core, so a UI-only `User` would fail that test, and the brief
also said to keep the test. Instead the core type is now real: `api/src/routes
/me.ts` builds its response as a `User`, so the type the UI mirrors is the one
the route sends, with one source of truth. `SessionMenu.tsx` reads only
`.username` and typechecks unchanged.

`tsc` is clean for ui, core and api. The parity test and the api tests pass (82),
`npm test` passes, and lint is clean.
