# Task 87 — Editor autosave has no in-flight guard: duplicate posts and silent lost updates

## Context

Found in the 2026-09 sweep by reading the editor state machine.
[ui/src/components/editor/EditorIsland.tsx:427-452](../../../ui/src/components/editor/EditorIsland.tsx)
(`save`) and :570 (the Save button):

- **Duplicate posts.** On a new post, two quick saves (a manual click plus the
  ~900 ms autosave timer, or a double-click) both read `postId === null` and both
  fire `POST /api/posts`, creating two rows. `save()` has no "already saving"
  guard, and the button's `disabled={!dirty}` stays enabled (`dirty` only clears
  on success). The later response wins the UI's `postId`/URL; the other row is a
  permanent orphan.
- **Silent lost update.** On an existing post, autosave sends `PUT /api/posts/5`
  (body v1); the user edits again before it returns; a second `PUT` (v2) fires. If
  v2's response resolves first, the UI shows "Saved"/v2, then v1's response
  resolves and is treated identically — but server-side
  `api/src/routes/posts.ts` does an unconditional `updatePost` with no
  version/timestamp check, so whichever bytes reach SQLite last win. If that is
  the stale v1, the user's latest edits are silently overwritten in the DB while
  the UI still says "Saved" and shows v2.

Confirmed no `AbortController`/`savingRef`/in-flight tracking exists in the file
(grep), and the PUT handler applies no optimistic-concurrency check.

## What to do

1. Disable Save (and suppress the autosave fire) while `saveState === 'saving'`.
2. Track the in-flight request in `save()` — an `AbortController` and/or a
   monotonically increasing request id — and ignore or abort a superseded
   response so an older PUT can never be the one that "wins" the UI state.
3. Guarantee at most one create in flight for a new post: once a `POST` is
   inflight, later saves must wait for its `postId` and then `PUT`, never fire a
   second `POST`.
4. (Recommended, server side) add an `updated_at` precondition to the PUT so a
   stale write is rejected/merged rather than silently overwriting — coordinate
   with the owner on whether to reject (409) or last-writer-wins-but-consistent.

## Acceptance

- A test (component or a focused unit test of the save controller): two rapid
  saves on a new post result in exactly one `POST`; two overlapping edits on an
  existing post never let an older response overwrite a newer one in the UI, and
  the final DB state matches the last edit the user made.
- Manual check: rapid typing + navigation does not create orphan posts and does
  not show "Saved" while the DB holds stale content. State how you verified.
- `npm test`, `npx tsc -p ui --noEmit`, `npm run lint`, `npm run build`,
  `bash corpus/lint.sh` clean.

## Files you OWN

- `ui/src/components/editor/EditorIsland.tsx` (+ any test/helper you extract)
- `api/src/routes/posts.ts` and its test **only if** you add the `updated_at`
  precondition

## Files you must NOT touch

- the `<App>`/routing structure (`ui/src/routes.tsx`) — load-bearing
- `corpus/log.md`, `corpus/wiki/status.md`

## Outcome — 2026-10-02

Saves go through a new `ui/src/components/editor/saveQueue.ts`, a single-flight
queue. At most one request is in flight. A save requested meanwhile is
remembered, and **one** more runs when the current one settles, reading the
content at send time. So:
- a new post gets exactly one POST, and later saves wait for its id and PUT;
- requests reach the server in order, so the DB's last write is the latest
  edit;
- responses arrive in order, so an older one can't overwrite the UI's newer
  state.

`onSaved` marks the editor clean only if the written body still equals the
current content. Otherwise it stays dirty and the next save goes out. A failed
save ends its run (no blind retry loop), and the next edit or Save retries.
The Save button is disabled while saving.

The queue is created in an effect and reads content through refs. The React
compiler lint forbids ref access during render, which ruled out a
`useState`-initializer version. The load effect calls `setId` when another
post is opened.

Tests (`saveQueue.test.ts`, a fake server whose requests resolve on command):
- two rapid saves on a new post produce exactly one POST, then one PUT;
- three overlapping edits on an existing post never have two PUTs in flight,
  the second request carries the latest content, the DB ends on the last edit,
  and the UI sees `v1` then `v3`, never `v1` after `v3`;
- a failure ends the run and the next save retries.

`npm test` 660/660, `tsc -p ui`, `npm run lint` and `npm run build` are clean.

**Not done:**
- The optional server-side `updated_at` precondition on PUT. It needs the
  owner's call between 409 and last-writer-wins. Two *tabs* editing one post
  are still last-writer-wins; within one tab the queue already orders writes.
- The manual rapid-typing check in a signed-in browser.
