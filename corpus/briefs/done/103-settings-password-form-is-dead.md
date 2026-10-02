# Task 103 — Settings still renders a password form for a route that no longer exists

## Context

Found 2026-10-02 during brief 83's documentation pass.
`ui/src/components/settings/SettingsIsland.tsx` still renders `<PasswordSection />`
(line ~203), a "Current password / New password / Confirm" form that POSTs to
`/api/password`. That route was deleted in the Ward move (2026-09-06): newspapper
holds no password, and changing one is Ward's job, on Ward's account page. So the
form is visible on every Settings visit, invites the person to type their password
into the wrong app, and fails with a 404 when submitted.

`SessionMenu.tsx` already links to Ward's account page (`WARD_ACCOUNT_PATH` in
`ui/src/lib/api.ts`), so the replacement exists.

## Files you OWN

- `ui/src/components/settings/SettingsIsland.tsx` (+ its CSS module if a class goes unused)

## Files you must NOT touch

- `ui/src/lib/api.ts` (use `WARD_ACCOUNT_PATH` as it is)
- the API: there is no route to add back

## What to do

1. Delete `PasswordSection` and its state.
2. In its place, a short line pointing at Ward: "Your password and sign-in are
   managed by Ward" with a link to `WARD_ACCOUNT_PATH`. Origin-absolute, like
   `SessionMenu`'s, not base-prefixed.
3. Grep `ui/src` for any other `/api/password`, `/api/login` or `/api/logout`
   call and remove it.

## Acceptance

- `grep -rn "/api/password\|/api/login\|/api/logout" ui/src` returns nothing.
- `npx tsc -p ui --noEmit`, `npm run lint`, `npm test`, `npm run build` clean.
- `corpus/wiki/architecture.md`'s route table drops the "brief 103" note.

## Outcome — 2026-10-02

`PasswordSection` is deleted. In its place, an `AccountSection` card says the
password and sign-in are managed by Ward, and links to `WARD_ACCOUNT_PATH`
(origin-absolute, like `SessionMenu`'s). The now-unused `Input` import and the
`.fields` CSS class are removed. `grep -rn "/api/password\|/api/login\|/api/logout"
ui/src` finds no call. Its one hit is a historical comment in `lib/api.ts`
explaining `skipAuthRedirect`'s origin, which isn't this brief's file. The
`architecture.md` route table no longer carries the brief-103 note.

`tsc -p ui`, `npm run lint`, `npm test` 661/661 and `npm run build` are clean.
Not checked in a browser.
