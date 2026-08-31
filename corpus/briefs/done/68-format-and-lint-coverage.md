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

---

## Outcome — 2026-08-31

All three defects fixed, and a fourth found that was worse than any of them.
Gate verified by the controller: build ✓ (with `fmt:check` first), **657 tests /
46 files** ✓, lint ✓ across all three workspaces, `tsc -p ui` at 0 ✓, corpus
lint ✓, `npm run fmt` exit 0 and **idempotent** — run twice, the changed-file
count did not move.

**`eslint.config.js` enabled zero rules.** It registered the TypeScript parser
and plugin, then set `no-unused-vars`, `@typescript-eslint/no-unused-vars` and
`no-undef` all to `'off'`, and imported no recommended config. So `npm run lint`
has reported green for this project's entire history **while linting nothing**.
Proved by the controller rather than taken on report: a file containing a plain
unused variable draws **exit 0 and no output** from the old config, and an error
from the new one. That is a seventh *green because nothing ran*, and the only one
so far where the tool was configured to do nothing rather than merely pointed at
the wrong place. Now on `js.configs.recommended` + `@typescript-eslint`
flat/recommended + `eslint-plugin-react-hooks` for `ui/`. Only 16 findings
appeared; all resolved.

A tell that would have exposed it earlier: `ui/src/components/editor/SourcePane.tsx:114`
carries an `eslint-disable-next-line react-hooks/exhaustive-deps` — a suppression
for a rule that did not exist. **A disable comment is evidence that someone
expected a rule to run.**

**The Prettier config was derived by measurement, not preference**, which is what
the brief asked for: a coordinate-ascent search over 12 options against all 158
committed `.ts`/`.tsx` files, scored by files already clean. Prettier's defaults
— what `npm run fmt` had been using — scored **1 of 158**. The landed config,
`{ singleQuote: true, printWidth: 100 }`, scores 88 and sits at the minimum of
the changed-line curve (9,030). Width 102 scores two more clean files with more
churn. Every other axis measured best at its default and was left unset.

**`.astro` was dropped from the glob rather than plugged**, on the reasoning that
brief 70 deletes all 360 lines of it shortly, so a pinned dev dependency added
now would be removed in days — and that one of the eight files is
`ui/src/proof/kitchen-sink.astro`, which this brief was forbidden to touch.
Consequence accepted and recorded: **`.astro` is now formally uncovered**, and
brief 70 closes the gap by removing the files.

**Formatting is enforced, not merely available**: `npm run build` runs
`fmt:check` first. The honest cost, stated by the agent: an agent mid-refactor
running `build` for type feedback now gets a formatting failure before any type
errors. Judged worth it, since a formatter nobody runs is exactly how 106 files
drifted. **Brief 70 rewrites the build script and must carry `fmt:check` forward
or this regresses immediately** — that requirement is now written into brief 70.

**`ui/src/lib/types.test.ts`: the brief's premise was wrong and the agent said
so.** It does not compare source text — it parses both files with the TypeScript
compiler and re-emits each declaration from the AST, so indentation, line breaks
and print width already cannot affect it. Its one real sensitivity is that
TypeScript's printer re-uses original source text for **literals**, so a
string-literal union keeps its file's quote character. That single channel is
what broke. Closed by normalizing quotes in a `shapeOf()` helper, with two
negative controls run: changing `id: string` → `id: number` in the UI copy still
fails, and flipping every quote now passes. That is live evidence rather than
theory — `core/src/types.ts` *was* reformatted by this brief and
`ui/src/lib/types.ts` *was not*, the exact asymmetry that broke it before.

**Ten React Compiler findings were suppressed rather than fixed** —
`react-hooks/set-state-in-effect` at 8 sites and `react-hooks/refs` at 2 — because
every fix restructures an effect, which is a behaviour change this brief
forbade. The two rules that catch correctness bugs, `rules-of-hooks` and
`exhaustive-deps`, are **on and pass clean**. Filed as brief 72.

Scope note: the agent also added `*.css` to the fmt glob (8 files reformatted,
all multi-value wrapping). A small extension beyond the brief, kept.

On the commit split: 4 config files and 4 code files are substantive; 77 files
are pure reformatting, each verified mechanically with Prettier as an oracle —
format the `HEAD` version, compare to the working copy, equal means the only
change was the formatter. The agent also correctly identified that brief 71 was
writing to the same tree concurrently and that its own `fmt` pass had formatted
brief 71's three files.
