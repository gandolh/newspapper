# Task 101 — Publishing a post whose render dir was deleted returns the wrong status and leaks a path

## Context

Found in the 2026-09 sweep and reproduced. If a render's `output/<dir>` was removed
(manual cleanup, disk pruning) and the post is then published, `publishPost` →
`optimizeOutputDir` → `slideFilesIn` calls `readdirSync(dir)`, which throws
`ENOENT: no such file or directory, scandir '<path>'`
([core/src/publish/optimize.ts:43-52](../../../core/src/publish/optimize.ts)). The
route's catch (`api/src/routes/publish.ts:14-24`) does
`status = message.includes('not found') ? 404 : 409` — but the ENOENT message says
"no such file or directory", not "not found", so it returns **409** with the raw
filesystem path in the body. The sibling `export.zip` route
(`api/src/routes/render.ts:128-130`) already guards this exact case with an
`existsSync` check returning a clean `404 { error: 'Output directory no longer
exists' }`; publish just never got the same guard.

Reproduced: created a post + a render row pointing at a nonexistent dir, called
`publishPost` → `ENOENT … scandir '.../this-output-dir-does-not-exist'`, and
confirmed the route maps it to 409 with the path leaked.

## What to do

- In `publishPost` (or the route, matching where `export.zip` does it) check
  `existsSync(render.outputDir)` up front and fail with a clean **404**
  (`{ error: 'Output directory no longer exists' }`), no filesystem path in the
  body — mirroring `render.ts`'s export handler.
- Do not leak the path in any publish error response (brief 79 also generalises
  5xx message leakage, but this specific one should be a clean 404, not a 5xx).

## Acceptance

- A test: publish a post whose `render.outputDir` does not exist → **404** with a
  generic message, no absolute path in the body.
- Publishing a normally-rendered post still works (re-encode + status flip).
- `npm test`, `npm run lint`, `npm run build`, `bash corpus/lint.sh` clean.

## Files you OWN

- `core/src/publish/index.ts` and/or `api/src/routes/publish.ts` (+ tests)

## Files you must NOT touch

- `core/src/publish/optimize.ts`'s re-encode logic (only the missing-dir guard)
- `corpus/log.md`, `corpus/wiki/status.md`
