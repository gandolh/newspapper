# Task 80 — `npm run lint` is red on a leftover import

## Context

Found in the 2026-09 sweep. `npm run lint` currently **exits non-zero**:

```
api/src/server.ts
  19:10  error  'db' is defined but never used  @typescript-eslint/no-unused-vars
```

[api/src/server.ts:19](../../../api/src/server.ts) still imports `{ db }` from
`./lib/db.js`, left behind when the Ward move reshaped `server.ts`. The lint gate
is load-bearing here — brief 68 made `eslint` actually enforce rules after it had
enabled none for the project's whole life, and `green-because-nothing-ran.md`
records that history. A red gate that everyone learns to ignore is how that work
gets quietly undone.

## What to do

- Remove the unused `import { db } from './lib/db.js';` at server.ts:19 (confirm
  nothing in the file uses `db` — the render/route plugins get their own handle).
- Run `npm run lint` and confirm it exits 0 across all three workspaces.

## Acceptance

- `npm run lint` exits 0.
- `npm run build` (which runs `fmt:check` then typechecks) and `npm test` still
  pass; `bash corpus/lint.sh` clean.

## Files you OWN

- `api/src/server.ts`

## Files you must NOT touch

- `eslint.config.js`, the `lint` script — the config is right; the code is wrong
- everything else
- `corpus/log.md`, `corpus/wiki/status.md`

## Outcome — 2026-10-02

Removed the unused `import { db } from './lib/db.js'` from `api/src/server.ts`. Nothing in the file used it. `npm run lint` now exits 0 across all three workspaces, `npm run build` (with `fmt:check`) passes, `npm test` passes 652/652, and corpus lint is clean.
