# Task 81 — The vitest `include` glob would silently skip any `*.test.tsx`

## Context

Found in the 2026-09 sweep. [vitest.config.ts:5](../../../vitest.config.ts):

```ts
include: ['core/**/*.test.ts', 'api/**/*.test.ts', 'ui/**/*.test.ts'],
```

`ui/**/*.test.ts` matches only names ending `.test.ts`; `Component.test.tsx` ends
`.test.tsx` and does **not** match. Today this costs nothing — every UI test is a
`.test.ts` on pure logic, and there is no jsdom/testing-library dep — but
`ui/src/components/` is entirely `.tsx`, and the natural name for the first
component test is `Component.test.tsx`, which would be collected by nothing and
run silently as zero tests.

This is the exact shape of incident #3 in
[green-because-nothing-ran.md](../../wiki/green-because-nothing-ran.md) ("a vitest
`include` that omitted `ui/`"), one extension further down the same trap — and
briefs 78 and 90 both propose adding component tests, which will land as `.tsx`.
Fix the glob **before** those briefs run.

## What to do

- Change the three globs to also match `.test.tsx`, e.g.
  `ui/**/*.test.{ts,tsx}` (and `core`/`api` too, for symmetry and future-proofing).
- Confirm the existing 44 test files still all run (count unchanged) after the
  change — i.e. the new glob is a superset, not a replacement that drops any.

## Acceptance

- `npx vitest run` collects the same 44 files (plus any `.tsx` added later).
- A throwaway proof (do **not** commit it): a temporary `x.test.tsx` with one
  `expect(true)` is collected and run under the new glob and was NOT under the
  old one. State the before/after collected count.
- `npm test`, `bash corpus/lint.sh` clean.

## Files you OWN

- `vitest.config.ts`

## Files you must NOT touch

- everything else
- `corpus/log.md`, `corpus/wiki/status.md`

## Note

If a real `.tsx` component test needs a DOM, adding `jsdom`/`happy-dom` as a
pinned devDependency is in scope for the brief that writes that test (90), not
this one — this brief is only the glob.
