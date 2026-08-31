# Task 68 — Make `npm run fmt` and `npm run lint` cover what they claim

## Context

Found by the controller during brief 64's verify gate, by running `npm run fmt`
on a working tree. It should have been a no-op. It rewrote 106 files.

This is the **fifth** instance of the pattern `log.md` calls *green because
nothing ran* — a command that reports success, or is assumed to, while reaching
far less (or far more) than its name implies. The previous four were the DB path
the tests set but nothing read, the `.gitignore` rule that would have hidden a
module, the vitest `include` that omitted `ui/**`, and the UI workspace that was
bundled but never typechecked.

Three separate defects, all in `package.json`:

**1. There is no Prettier config anywhere in the repo.** No `.prettierrc`, no
`prettier` key in `package.json`. So `npm run fmt` formats with Prettier's
defaults — **double quotes** — against a codebase written entirely in single
quotes. Running it converts the whole tree to a style the ESLint config does not
share. The command is documented in `CLAUDE.md` as a normal thing to run.

**2. `npm run fmt` exits 2.** Its glob names `ui/src/**/*.astro`, and no
`prettier-plugin-astro` is installed, so Prettier reports *"No parser could be
inferred"* for all six `.astro` pages and fails. It still writes every other
file first, so it half-succeeds loudly and is easy to dismiss.

**3. `npm run lint` covers only `core/src` and `api/src`.** The entire `ui`
workspace — the biggest surface in the repo after brief 64 — is never ESLinted.

There is also a booby trap worth understanding before you touch anything:
`ui/src/lib/types.test.ts` compares the **source text** of each mirrored
declaration in `ui/src/lib/types.ts` against `core/src/types.ts`. It is
therefore formatting-sensitive. Reformatting one side and not the other fails
it — which is exactly how the controller found defect 1. Decide whether that
test should compare shape rather than text; if you leave it text-based, say why.

## Files you OWN

- `package.json` (root) — the `fmt` and `lint` scripts, and any config/dev
  dependency they need
- A new Prettier config, if you add one
- `eslint.config.*`
- `ui/src/lib/types.test.ts` — only if you change how it compares

## Files you must NOT touch

- Anything under `corpus/` except your own outcome note
- Product behaviour of any kind. **This brief changes tooling only.** If a lint
  rule newly flags real code, fix the formatting/lint violation, not the logic —
  and if a rule demands a behaviour change, disable the rule and report it.

## What to do

1. **Add a Prettier config that matches the code as written** — single quotes,
   and whatever else the existing style already is. Derive it by measuring the
   current tree, not by preference: the correct config is the one under which
   `prettier --check` on today's committed code is closest to clean.
2. Either install `prettier-plugin-astro` or drop `.astro` from the glob. Pick
   one and say which. `npm run fmt` must exit 0.
3. Extend `npm run lint` to `ui/src`. Expect a first run to surface real
   findings; fix them, and report anything you had to disable with the reason.
4. **Decide whether formatting should be enforced rather than merely available.**
   A `fmt:check` in the build is the obvious lever. Argue it either way, but
   note that "a formatter nobody runs" is how this got five years of drift.

## Acceptance

- `npm run fmt` exits 0 and is a **no-op on a clean tree** — run it twice, the
  second run changes nothing.
- `npm run lint` covers all three workspaces and passes.
- `npm run build`, `npm test` pass; `npx tsc -p ui --noEmit` stays at 0.
- The formatting diff, if any, is committed separately from the config change so
  it can be reviewed as noise rather than read line by line.
