# Task 99 — Eight hand-rolled "repo root" path computations, and `output/` has no env override

## Context

Found in the 2026-09 sweep. At least eight sites each count `../` by hand from
their own file depth to reach the repo root or a fixed subdir, with no shared
helper:

- `core/src/render/output.ts:14-18`, `core/src/storage/db.ts:17-26`
  (`defaultDbPath` + `defaultSourcesPath`), `core/src/uploads/store.ts:5-6`,
  `core/src/themes/index.ts:17-20`, `api/src/server.ts:24`,
  `api/src/routes/render.ts:22-23`, `api/src/routes/renders.ts:8-9`.

They use different `..` counts (2, 3, and 4 levels) that must all land on the same
directory. Concretely: if `api/src/routes/render.ts` or `renders.ts` is ever moved
one level deeper (a plausible refactor as routes grow), only that file's
`'../../..'` resolves one level short — and `render.ts` uses `outputPrefix` to
string-slice `result.dir.slice(outputPrefix.length)` when building `/output/…`
URLs, and `renders.ts` uses it for a file-existence check. A wrong prefix produces
corrupted/empty paths with **no exception** (`.slice()` doesn't throw). Separately,
`infrastructure/Dockerfile:130-134` calls this out: `output/` has no env override,
so relocating it to a bigger disk is a code change in lockstep across files — the
Dockerfile bind-mounts a `VOLUME` at the hardcoded path to work around it.

## What to do

1. Add one helper (e.g. `core/src/util/paths.ts`) exporting `repoRoot()` (resolved
   once from `import.meta.url`) and the derived roots (`outputRoot()`,
   `uploadsRoot()` honouring `UPLOADS_DIR`, `fontsDir()`, `dbPath()` honouring
   `NEWSPAPPER_DB_PATH`, `sourcesSeedPath()`). Import it everywhere instead of
   re-deriving `..` counts. `api/*` can import from `@newspapper/core` (dependency
   direction ui→api→core holds).
2. Add an optional `OUTPUT_DIR` (or `NEWSPAPPER_OUTPUT_DIR`) env override mirroring
   `UPLOADS_DIR`, read in the one `outputRoot()` helper, so `render.ts`,
   `renders.ts` and `output.ts` all agree by construction. Add it to `.env.example`
   with its reader (the repo's rule: no settable var without a reader) and update
   the Dockerfile note / `corpus/wiki/configuration.md` (coordinate with 83).
3. Keep ESM path resolution from `import.meta.url` (never `process.cwd()`), per the
   locked decision.

## Acceptance

- All eight sites resolve their root via the shared helper; grep shows no
  remaining ad-hoc `resolve(__dirname, '../..'…)` for the repo root in those files.
- A test asserts `outputRoot()`/`uploadsRoot()`/`dbPath()` honour their env
  overrides and otherwise resolve to `<repo>/output` etc.
- Moving a consumer file no longer changes the resolved root (the helper's own
  depth is the single point of truth) — note how you sanity-checked this.
- `npm test`, `npm run build`, `npm run lint`, `bash corpus/lint.sh` clean; the
  Docker build still resolves the same paths (the volume mount lines may simplify,
  but that is optional).

## Files you OWN

- new `core/src/util/paths.ts` (+ test)
- `core/src/render/output.ts`, `core/src/storage/db.ts`, `core/src/uploads/store.ts`,
  `core/src/themes/index.ts`
- `api/src/server.ts`, `api/src/routes/render.ts`, `api/src/routes/renders.ts`
- `.env.example`, `infrastructure/.env.example`

## Files you must NOT touch

- `corpus/log.md`, `corpus/wiki/status.md`

## Note

Touches many files that other briefs also edit (render.ts, renders.ts, output.ts,
db.ts). Sequence after the render/DB briefs (86, 92-95, 97) or expect merge
coordination — this is a mechanical consolidation and is the lowest-risk done last.
