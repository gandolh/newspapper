# Task 91 — Two Chromium test files silently pass without a browser, and there is no CI

## Context

Found in the 2026-09 coverage/DX sweep. Of the four test files that drive real
Chromium, only two fail-loud when a browser is expected but missing:

- `core/src/render/fonts.test.ts` and `core/src/templates/font-fallback.test.ts`
  use `browserOrSkip()`, which prints a boxed banner and **throws when
  `process.env['CI']` is set**.
- `core/src/render/render.test.ts` and the Chromium sub-test in
  `api/src/routes/uploads.test.ts` just `console.warn(...); return;` — no `CI`
  check. On a machine without `npx playwright install chromium`, they report
  **passed** while asserting nothing.

And there is **no CI at all** (no `.github/workflows`, verified). The deploy path
(`vps-deploy`) only builds the Docker image (`npm ci` + `tsc --noEmit` + `vite
build`) — it never runs `npm test`, `npm run lint`, or `bash corpus/lint.sh`. So
the "fails under CI" guarantee the docs claim is (a) only half-implemented and
(b) never actually exercised, because nothing sets `CI`. This is the tenth
"green because nothing ran" waiting to happen, in the files closest to the
product's output.

## What to do

1. Extract the `browserOrSkip()` / banner helper (from `fonts.test.ts`) into a
   shared test util (e.g. `core/src/render/test-support/browser-or-skip.ts` or a
   co-located helper) and use it in **`render.test.ts`** and the
   **`uploads.test.ts`** Chromium sub-test, so all four behave identically: skip
   locally with a loud banner, **throw under `CI`**.
2. Add a CI workflow (`.github/workflows/ci.yml` or the estate's equivalent) that,
   with `CI=1`, runs: `npm ci` → `npx playwright install --with-deps chromium` →
   `npm run build` → `npm test` → `npm run lint` → `bash corpus/lint.sh`. The
   Chromium install is what makes the now-throwing browser tests actually run
   rather than trip the CI-fail branch.
3. (If the owner wants the deploy gated) note in the brief outcome how CI could be
   made a precondition of `vps-deploy` — but wiring the deploy is out of scope
   here; adding CI + unifying the guard is the deliverable.

## Acceptance

- With Chromium **absent** and `CI=1`, `npm test` **fails** (not passes) in all
  four browser files. With Chromium absent and `CI` unset, they skip with a
  visible banner. With Chromium present, they run for real. State how you
  verified each of the three.
- The CI workflow runs the full gate and is green on the current tree (once the
  other Now-tier fixes land) — or documents which briefs must precede it.
- `npm run lint`, `bash corpus/lint.sh` clean.

## Files you OWN

- `core/src/render/render.test.ts`, `core/src/render/fonts.test.ts`,
  `core/src/templates/font-fallback.test.ts`, `api/src/routes/uploads.test.ts`
  (only the skip-guard wiring; not the assertions)
- a new shared skip helper
- `.github/workflows/ci.yml` (new)

## Files you must NOT touch

- the actual test assertions / fixtures
- `corpus/log.md`, `corpus/wiki/status.md`

## Note

Briefs 88 and 90 rely on this helper for their Chromium tests — landing 91 first
keeps them from re-inventing the guard.

## Outcome — 2026-10-03

New `core/src/render/test-support/chromium.ts` exports `probeChromium(suite,
unverified)`, which returns `{ available, orSkip(skip), close() }`. Locally a
missing browser skips with a boxed banner (stderr, at the test and again at
teardown). Under `CI` it **throws**. All five Chromium suites use it:
`fonts`, `font-fallback`, `render` (six early-`return` tests converted to
`ctx.skip`), the api `uploads` sub-test, and brief 88's `uploads-route`.
`grep browserAvailable` over the tests is now empty.

**The three modes, verified** by pointing `PLAYWRIGHT_BROWSERS_PATH` at an
empty directory to simulate a missing install:
- **present:** 54/54 pass in the five files;
- **absent, `CI` unset:** 37 pass and 13 are skipped, with a banner from every
  one of the five suites;
- **absent, `CI=1`:** 13 fail and all 5 files are red.

**CI:** `.github/workflows/ci.yml` runs on push and PR with `CI=1`: `npm ci`,
`npx playwright install --with-deps chromium`, build, test, lint, corpus lint,
on Node 24 like the Dockerfile. **It has not run yet:** nothing is pushed.
Locally the same gate is green (666 tests, lint, build). Gating `vps-deploy` on
it would mean the deploy checking the commit's workflow status (for example
`gh run list --commit <sha> --json conclusion`) before building. Left for the
owner, as the brief says.

`CLAUDE.md`'s Tests paragraph now names the five files, the guard and the
workflow.
