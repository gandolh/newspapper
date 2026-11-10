# Task 08: The house style and the quality harness

**Depends on:**

- In Newspapper: nothing is required, and brief 07 (Base UI 1.9.0) should land first, so the lockfile this brief rewrites is the final one.
- In the owner's skills library:
  - the brief *A house style, and a quality harness that enforces it*: the `house-style` package at `v1.0.0`, the `house-style` skill, and the plugin's `Stop` and `PostToolUse` hooks;
  - the brief *Enforce the base-ui and code-structure skills in every repo*: how the convention checkers are wired and when they run `--warn-only`.
- The owner's grilling of 2026-11-10, questions Q5-Q14 of the skills library's open questions page.

**Runs before:** 09, 10 and 11. The reformat changes 231 files, and those briefs rewrite or move most of them. Formatting first gives one clean reformat commit, and the formatter hook keeps every later diff formatted.

**Before you start:** run `brief-board guide` ([CLAUDE.md](../../../CLAUDE.md)). Read [wiki/green-because-nothing-ran.md](../../wiki/green-because-nothing-ran.md) too: this brief found the eleventh case of it (below), and its acceptance is written around "what did that check reach?".

## Context

On 2026-11-09 the owner made three calls for every web app: Base UI 1.9.0 everywhere, the whole app on Tailwind v4, and the researched conventions enforced in each repo. The skills library measured the house style, the one the owner's other repos and their agents share, and answered with a two-layer harness:

- **The repo's gate:** `npm run check` and its fast subset `npm run check:fast`. They hold for a human, any agent and the deploy.
- **The Claude Code layer:**
  - the plugin's `Stop` hook runs `check:fast`, and exits 2 on a failure;
  - its `PostToolUse` hook formats each saved file;
  - `.claude/rules/*.md`, scoped by `paths:`;
  - a short `CLAUDE.md` with the commands.

Newspapper is one of the four outliers the library names: it writes single quotes (Prettier at 100 columns), where the house writes double quotes and semicolons. So this brief is both the adoption and a style change, and it reverses one dated decision (below).

### What Newspapper has today (read 2026-11-10)

- **A formatter that works.** `.prettierrc.json` is `{ "singleQuote": true, "printWidth": 100 }`. `fmt` and `fmt:check` run over `core/src/**/*.ts`, `api/src/**/*.ts`, `ui/src/**/*.{ts,tsx,css}`, `ui/vite.config.ts` and `ui/index.html` (`package.json` scripts). `npm run build` runs `fmt:check` first. Prettier 3.8.4 is pinned.
- **That config is a recorded decision.** [wiki/decisions-tooling.md](../../wiki/decisions-tooling.md), "The formatter and the linter are enforced, and configured to do something" (2026-08-31), says the config was "derived by measuring" 12 options over 158 files and rejects "picking a house style by preference". The owner's call of 2026-11-09 picks a house style, so that entry is revisited here (step 2 and 9).
- **A thin ESLint.** `eslint.config.js` is 72 lines: `@eslint/js` recommended, `@typescript-eslint` recommended (untyped, 8.61.0, registered through `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` rather than the `typescript-eslint` package), `eslint-plugin-react-hooks` 7.1.1 on `ui/src`, and `_`-prefixed unused names. The `lint` script globs `core/src/**/*.ts`, `api/src/**/*.ts`, `ui/src/**/*.{ts,tsx}` and `ui/vite.config.ts`. It passed on 2026-11-10 in 13.6 s.
- **Three unrelated tsconfigs and no base.** `core/tsconfig.json` and `api/tsconfig.json` are the same file (NodeNext, `strict`, no other strictness flag); `ui/tsconfig.json` is ESNext with `moduleResolution: bundler`. None has `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals` or the other lineage flags. No `tsconfig.base.json`.
- **The tests are outside two typechecks.** `core/tsconfig.json` and `api/tsconfig.json` both `exclude` `**/*.test.ts`, so `tsc` never reads the 40 test files in `core/src` or the 9 in `api/src`. Only `ui` typechecks its tests (it includes all of `src`). Vitest does not typecheck.
- **No root `typecheck` script.** Only `ui` has one (`ui/package.json`, `tsc --noEmit`); `core` and `api` typecheck through `tsc` in their `build`.
- **No `.npmrc`**, so `save-exact` is not set. Exact pins hold by hand: the only ranges are the four root `overrides` (`package.json:40, 42, 44, 46`).
- **`gate`** is `CI=1 npm run build && CI=1 npm test && npm run lint && bash corpus/lint.sh` (`package.json`).
- **`CLAUDE.md`** at the root is 193 lines, with a long "Corpus" section (lines 87-189). There is no `.claude/` directory and no `corpus/CLAUDE.md` (merged into the root file on 2026-08-31; `corpus/lint.sh` lists `corpus/CLAUDE.md` and `.claude/skills` as abandoned roots, so neither may be recreated or named in a wiki page). `.gitignore` ignores `.claude/skills/` only, so `.claude/rules/` can be committed. <!-- lint-ok -->
- **The image has no `git`.** `infrastructure/Dockerfile` is `node:24-bookworm-slim` with only `python3 make g++ ca-certificates` added. Its `deps` stage runs a full `npm ci`, dev dependencies included; `prod-deps` runs `npm ci --omit=dev`.

### Measured on 2026-11-10

Taken on a scratch copy (`npm ci --ignore-scripts`), with Prettier 3.8.1, TypeScript 6.0.3, ESLint 9.39.4, `@vitest/eslint-plugin` 1.6.28, `eslint-plugin-n` 18.5.0, `eslint-plugin-import-x` 4.18.1 and knip 6.44.2. The repo itself was not touched.

**Prettier churn.** Prettier 3.8.1 with `--trailing-comma all` and double quotes and semicolons (its defaults), over 275 files and 38,027 lines (the five script globs above plus `eslint.config.js` and `vitest.config.ts`). "Lines changed" is `git diff --numstat` deleted lines:

| `printWidth` | Lines changed | Files changed |
|---|---|---|
| 100 | 6,768 (17.8%) | 231 |
| 110 | 7,467 | 234 |
| 120 | 7,912 | 234 |
| 130 | 8,250 | 235 |
| 140 | 8,603 | 235 |

The single-quote baseline at 100 columns changes nothing (the tree is clean today). So **the quote swap is the churn, and width adds to it**: Newspapper's least churn is the width it has now, 100, unlike Almanac's 130. At width 100 the lines split as: `.ts` 5,607 in 156 files, `.tsx` 1,074 in 56, `.css` 69 in 18 (attribute selectors and `url()`), `.js` 18 in 1.

Command: `prettier --no-config --write --print-width <w> --trailing-comma all <globs>`, then `git diff --numstat`, then `git checkout -- .`, per width.

**TypeScript flags.** Each flag added alone to the existing tsconfigs, `tsc -p <ws> --noEmit --<flag>`; errors in `core`, `api`, `ui` (source only, since the first two exclude tests):

| Flag | core | api | ui | Where |
|---|---|---|---|---|
| `verbatimModuleSyntax` | 0 | 0 | 0 | |
| `erasableSyntaxOnly` | 0 | 0 | 2 | `ui/src/components/editor/highlight.ts:36`, `ui/src/lib/api.ts:18` (parameter properties, `ApiError`'s `public readonly status`) |
| `noImplicitOverride` | 0 | 0 | 3 | `ui/src/components/ErrorBoundary.tsx:27, 33, 37` |
| `noFallthroughCasesInSwitch`, `isolatedModules`, `noUnusedLocals`, `noUnusedParameters` | 0 | 0 | 0 | |
| `noUncheckedIndexedAccess` | 24 | 25 | 90 | the house flag; **139 errors in source** |
| `exactOptionalPropertyTypes` (not proposed) | 4 | 16 | 7 | |

All the lineage flags plus the two new ones, together: 24, 25 and 95. With the tests included (see the next point), `noUncheckedIndexedAccess` is 196 in `core` and about 121 in `api`.

**The eleventh case of "green because nothing ran".** A scratch tsconfig that extends each workspace's and drops the test exclusion reports, with no new flag:

- `core`: 22 errors in 4 files, among them `RequestInfo` not found in `core/src/reader/refresh.test.ts:27`, `core/src/scrape/rss.test.ts:14` and `core/src/scrape/safe-url.test.ts:31` (the `ES2022` lib has no DOM types), and a stub missing `contentHtml` and `author` of `RssItem` at `core/src/scrape/scrape.test.ts:33`.
- `api`: 95 errors in 2 files, 94 of them in `api/src/server.test.ts` from one helper (`inject` at line 62, whose `cookies` option does not type-check against `app.inject`), and one in `api/src/routes/reader.test.ts:38`.

Both workspaces typecheck green today while 49 test files were never read by `tsc`. Typed lint needs the same fix: `projectService` answers "was not found by the project service" for every test file (49 parse errors in one run), because no tsconfig includes them.

**ESLint, with the proposed rules on the existing code.** `eslint -c <scratch config>` over the lint globs, tsconfigs that include the tests, `parserOptions.project`. Counts are source / test:

| Rule | Today | Findings (src / test) | Where, or what |
|---|---|---|---|
| `@typescript-eslint/no-floating-promises` | off | 2 / 0 | `api/src/server.ts:220`, `ui/src/components/reader/views/SourcesPanel.tsx:127` |
| `@typescript-eslint/no-misused-promises` | off | 16 / 0 | 16 `ui` handlers in 7 files: `LoginIsland.tsx:57`, `SessionMenu.tsx:43`, `LibraryPanel.tsx:166, 229`, `SearchPanel.tsx:127, 200`, `SourcesPanel.tsx:241, 451, 507, 523, 559`, `AccountSection.tsx:86, 120, 184, 254`, `SettingsIsland.tsx:75` (async handlers passed as `onSubmit` or `onClick`) |
| `@typescript-eslint/await-thenable` | off | 0 / 0 | |
| `@typescript-eslint/switch-exhaustiveness-check` | off | 1 / 0 | `ui/src/components/auth/messages.ts:15` |
| `@typescript-eslint/consistent-type-imports` | off | 0 / 1 | `ui/src/components/reader/sanitize.test.ts:34` |
| `@typescript-eslint/no-unnecessary-type-assertion` | off | 25 / 86 | 111 no-op assertions in 33 files; auto-fixable |
| `@typescript-eslint/no-non-null-assertion` | off | 15 / 187 | 202 in 43 files: `core/src` 9, `ui/src` 6, tests 187 (`core` 86, `ui` 80, `api` 21) |
| `@typescript-eslint/no-explicit-any` | error | 0 | |
| `no-restricted-syntax` on `TSEnumDeclaration` | off | 0 | |
| `no-warning-comments` (`todo`, `fixme`) | off | 0 | |
| `no-console` | off | 9 | `core/src/util/logger.ts:7, 10, 13`, `api/src/seed.ts:12, 16`, `api/src/server.ts:201, 207`, `ui/src/components/ErrorBoundary.tsx:34`, `core/src/render/test-support/chromium.ts:64` |
| `import-x/no-default-export` | off | 61 | see the house shapes below |
| `n/no-process-env` (on `api/src`, `core/src`, `ui/vite.config.ts`, tests) | off | 18 / 42 | see the paragraph below |
| `@vitest/eslint-plugin` `valid-expect` | off | 0 / 22 | all false: `expect(value, "message")`, which Vitest allows; set `maxArgs: 2` |
| `@vitest/eslint-plugin` `no-conditional-expect` | off | 0 / 14 | 13 are the `try { ...; expect.unreachable() } catch (err) { expect(...) }` idiom (`core/src/wizard/parse.test.ts:218-222`, `compile.test.ts:46-47`, `roundtrip.test.ts:37-41`, `catalogue.test.ts:65, 75`, `style.test.ts:82`, `font-fallback.test.ts:126`); one is `core/src/render/browser.test.ts:74` |
| `@vitest/eslint-plugin` `expect-expect`, `no-focused-tests`, `no-identical-title` | off | 0 / 0 | |
| `react-hooks` recommended | on | unchanged | |

The `n/no-process-env` row, by workspace, outside tests: `api/src` 9 (`lib/db.ts:14`, `routes/render.ts:23`, `server.ts:31, 66`, `ward/auth.ts:36, 61, 96`, `ward/config.ts:61, 84`), `core/src` 7 (`reader/config.ts:22, 27`, `storage/settings.ts:15`, `uploads/index.ts:110, 112`, `util/paths.ts:22, 45`), `ui/vite.config.ts:68, 78`. In tests: 42 (`api` 18, `core` 24). Five of the nine in `api/src` are `env = process.env` default parameters, the shape the owner's other repos keep in `config.ts`.

**Lint time.** Whole repo, typed rules: `project` 15.8 s, `projectService` 20.4 s, but the `projectService` run skipped 49 test files it could not place, so the comparison is not fair until the tsconfigs include the tests (step 3 then step 1 again). One file: `projectService` 3.2 s, `project` 3.8 s, plain ESLint 1.0 s. Typecheck of the three workspaces in series: 8.0 s. `prettier --check` over the scope: 3.4 s. Whole `vitest run` without the Chromium tests: about 11 s. So `check:fast` (typecheck plus typed lint of one changed file) is about 11 s, under the 15 s target.

**House shapes**, counted with the TypeScript parser over `core/src`, `api/src`, `ui/src` and the three configs (231 files, 33,875 lines):

| Shape | Count | Where |
|---|---|---|
| `enum` | 0 | |
| `any` (the keyword) | 0 | |
| non-null `!` | 202 | 15 in source, 187 in tests |
| `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error` | 0 | |
| `TODO`, `FIXME`, `XXX`, `HACK` | 0 | |
| `console` | 9 | as in the ESLint table |
| default exports | 61 by the lint rule | `api/src/routes/*.ts` 12 (one plugin per file, `export default articlesRoutes`); `ui/src` 48: 46 component, layout and page files, and two ambient `export default` inside `declare module` in `ui/src/css-modules.d.ts:12` and `ui/src/virtual-modules.d.ts:12`; `ui/vite.config.ts` 1. Outside the lint globs: `eslint.config.js:17` and `vitest.config.ts:4`, both required by their tools. 82 `import X from` lines in `ui/src` and 12 in `api/src/server.ts` name them |
| namespaces | 0 | the 4 `declare module` hits are ambient (`api/src/server.ts:56`, `ui/src/css-modules.d.ts:8, 10`, `ui/src/virtual-modules.d.ts:9`) |
| parameter properties | 2 | as in the flags table |
| classes | 13 | 8 extend `Error` |
| `void` on a promise | 44 | the code already marks discarded promises |

**knip, untuned** (no config, so it is noisy): 7 unused files (6 are the vendored Ward library in `api/vendor/ward/` and `ui/vendor/ward/`), 4 unused dependencies in `docs/package.json`, 1 unused dev dependency, `tsx` at `package.json:34` (`api` declares its own), 2 unlisted, 69 unused exports (47 in the vendored `ward-auth.js`). A real run needs a `knip.json` that ignores the vendor folders and names the workspaces; step 1 writes it.

**Not measured here:** `exactOptionalPropertyTypes` beyond the counts above; the Chromium tests (26 of the `ui` tests skipped without Chromium revision 1223); `docker build`; `check-base-ui` and `check-structure` (they do not exist yet in this repo); dependency-cruiser.

## Owner decisions (defaults this brief builds)

1. **Where the configs come from** (skills library Q6). Default: the `house-style` package, depended on through its tagged GitHub **tarball URL**, which npm fetches without `git`. This image has none: a `github:` spec fails `npm ci` in the `deps` stage. If the owner prefers `github:`, add `git` to the `apk`-equivalent line in the same commit: `apt-get install -y --no-install-recommends ... git` in `infrastructure/Dockerfile`'s `base` stage. If Q6 goes the other way (configs copied in), the same rules land as local files with a version header, and steps 3 to 5 do not change.
2. **Width** (Q8). Default: the estate's one width. **Measured here, 100 is cheapest** (6,768 lines, all of it the quote swap); 120 costs 7,912 and 130 costs 8,250. If the estate width is not settled when this runs, use 100 and record it. *New question for the grilling:* Newspapper's least-churn width differs from Almanac's (130); should the estate pick by the owner's taste rather than by the minimum churn across repos?
3. **Quotes and semicolons** (Q9). Default: the house format, double quotes and semicolons, in one reformat commit. This reverses the 2026-08-31 decision that derived `singleQuote` by measurement.
4. **Markdown stays out of Prettier.** Default: `.prettierignore` lists `*.md`. The corpus is prose that `corpus/lint.sh` governs. Not measured here (no Prettier run over Markdown); the Almanac figure was 93 lines in 10 files.
5. **tsconfig** (Q11). Default: a shared `tsconfig.base.json` with `strict` and the lineage flags (`noUncheckedIndexedAccess`, `noImplicitOverride`, `isolatedModules`, `noUnusedLocals`, `noFallthroughCasesInSwitch`) plus `verbatimModuleSyntax` and `erasableSyntaxOnly`; not `exactOptionalPropertyTypes`. **`noUncheckedIndexedAccess` is 139 errors in source and about 270 more in the tests** (`core` 196 and `api` 121 in all, against 24 and 25 in source), far above the 20-finding line the library's brief sets for a lint rule. *New question for the grilling:* adopt it here (default, in its own commits per workspace, step 3), or defer it to a brief of its own and record the exception. The other flags cost 5 fixes in `ui`.
6. **Test files in the typecheck.** Default: yes. Each of `core` and `api` gets a `tsconfig.json` that includes the tests (what the editor, typed lint and `check` read) and a `tsconfig.build.json` that excludes them (what `build` emits). The 117 errors they hide are fixed in step 3.
7. **Typed lint** (Q12). Default: the six rules through `projectService`, unless `project` measures faster once the tests are in the tsconfigs.
8. **The house shapes as errors** (Q13). Default: all errors in source, with these calls on the counts:
   - `no-non-null-assertion` is **15 in source (fixed) and 187 in tests**. Default: an error in source, **off in `*.test.ts`**, recorded in the config with the reason (a test that indexes a fixture asserts its own setup). *New question for the grilling:* Almanac fixed its nine; 187 is not a one-hour fix.
   - `no-unnecessary-type-assertion` (111) is auto-fixable: `eslint --fix`, one commit.
   - **Default exports.** 61 files plus 94 import lines. Default: an error in `api/src` (the 12 route plugins are registered by name in `server.ts`, so the change is mechanical) and in `ui/src`, except `*.d.ts` and `*.config.*`. *New question for the grilling:* React components are named exports in the owner's other repos, so 46 files and 82 imports change; is that wanted here, or are component files excepted?
   - `no-process-env` starts as a **warning** on `api/src`; brief 11 turns it into an error (its findings are that brief's work). `core/src` has 7 readers of its own (`reader/config.ts`, `storage/settings.ts`, `uploads/index.ts`, `util/paths.ts`) and is a library, not a server. Default: the rule covers `api/src` only and `core/src` keeps its readers, recorded as an exception. *New question for the grilling:* does the rule reach a library the server imports, or only the server's own `config.ts` boundary?
   - `valid-expect` is set to `maxArgs: 2`, and `no-conditional-expect` is off in the `try/catch` idiom's files (or the idiom is rewritten to `expect(() => ...).toThrow`); default: rewrite, since 13 of 14 are that one shape.
9. **`check` and `check:fast`** (Q10). Default: `check` is the house name for the gate without the build, and `gate` stays as the superset. `check:fast` is a typecheck plus ESLint on the files changed against `HEAD`, about 11 s warm.
10. **The Claude Code layer** (Q7). Default: the plugin's hooks. If the owner chooses committed hooks, they go in `.claude/settings.json` here.
11. **`CLAUDE.md` at 193 lines** is at the ~200-line ceiling. Default: add the commands in place, net no more than 6 lines, and keep the "Corpus" section where it is. *New question for the grilling:* move the Corpus workflows and maintenance rules into `.claude/rules/corpus.md` (`paths: ["corpus/**"]`), which would take `CLAUDE.md` to about 90 lines but moves rules the owner reads as a block.
12. **The docs workspace** (`docs/`, Docusaurus) stays out of Prettier, ESLint and `check`. Default: `.prettierignore` lists `docs/`. Its 6 TypeScript and script files are not measured here.

## Files you OWN

- New: `tsconfig.base.json`, `core/tsconfig.build.json`, `api/tsconfig.build.json`; edits to `core/tsconfig.json`, `api/tsconfig.json` and `ui/tsconfig.json`.
- `eslint.config.js`, new `knip.json`, the Prettier config (`.prettierrc.json` stays or moves per decision 1), new `.prettierignore`, `.git-blame-ignore-revs`, new `.npmrc` (`save-exact=true`).
- The root `package.json` (scripts, devDependencies) and `package-lock.json`; `core/package.json` and `api/package.json` (their `build` script).
- The reformat itself: whitespace, quote and semicolon changes to every file Prettier covers.
- The fixes the new flags and rules ask for:
  - `ui/src/lib/api.ts:18` and `ui/src/components/editor/highlight.ts:36` (parameter properties);
  - `ui/src/components/ErrorBoundary.tsx:27, 33, 37` (`override`);
  - the 139 index accesses, the 2 floating and 16 misused promises, the switch at `ui/src/components/auth/messages.ts:15`, the `!` in source, the no-op assertions;
  - the typecheck errors in the 49 test files: `core/src/reader/refresh.test.ts:27`, `core/src/scrape/rss.test.ts:14`, `core/src/scrape/safe-url.test.ts:31`, `core/src/scrape/scrape.test.ts:33, 45`, `api/src/server.test.ts:62` and the cascade it causes, `api/src/routes/reader.test.ts:38`.
- New: `.claude/rules/web.md`, `.claude/rules/server.md`, new `scripts/conventions.json` (if an exception is needed).
- `CLAUDE.md`: the commands block.
- `infrastructure/Dockerfile`: only the dependency line of `base`, and only under decision 1's `github:` branch.
- Corpus: [wiki/decisions-tooling.md](../../wiki/decisions-tooling.md) (a new entry, and the revisit), [wiki/green-because-nothing-ran.md](../../wiki/green-because-nothing-ran.md), [wiki/status.md](../../wiki/status.md), [wiki/commands.md](../../wiki/commands.md), [log.md](../../log.md).

## Files you must NOT touch

- Behaviour. Apart from the fixes listed above, every change is formatting, configuration or a type annotation. A fix that changes what the program does (an `await` added where a promise was floating) is called out in the commit message and the outcome note.
- `api/vendor/` and `ui/vendor/`: generated copies of the Ward library, ignored by ESLint, Prettier and knip.
- The `docs/` workspace.
- The layout of `api/src` and `ui/src` and the CSS, which are briefs 09, 10 and 11.
- The skills library and the `house-style` repo. A rule that looks wrong for Newspapper is reported back, not patched here.

## What to do

One commit per step, with `npm run build`, `npm test` and `npm run lint` green after each (and `CI=1` for the tests, so the Chromium ones run).

1. **Measure first.** Re-run the measurements above on the tree you will change, and record them in the `log.md` entry; then turn nothing on that finds more than about 20 real problems without the owner's answer to the question for it. Write `knip.json` (workspaces `core`, `api`, `ui`; ignore `**/vendor/**`) and record its counts.
2. **Prettier, and the reformat.**
   1. Add the config per decisions 1 to 3: `printWidth` per decision 2, `trailingComma: "all"`, `singleQuote: false`, `semi: true`. Pin the package; if the house package is used, extend it.
   2. Add `.prettierignore`: `*.md`, `api/vendor/`, `ui/vendor/`, `docs/`, `package-lock.json`, `**/dist/`, `data/`, `output/`, `uploads/`, `coverage/`, `ui/public/`.
   3. Change `fmt` and `fmt:check` to `prettier --write .` and `prettier --check .`, and commit this alone. Check that `prettier --check .` and the old globs name the same files (`prettier --list-different` on both with the config reverted shows no difference); a glob that names fewer files is the fifth case of "green because nothing ran".
   4. Run `npm run fmt`, and commit only that, as `style: format with Prettier`. Run it when no other brief has uncommitted work. Brief 06 may be open: it rebases onto this commit with one `npm run fmt`.
   5. Put that commit's full hash in `.git-blame-ignore-revs`, in its own commit.
   6. Hand the owner `git config blame.ignoreRevsFile .git-blame-ignore-revs`.
3. **tsconfig.**
   1. Add `tsconfig.base.json` and make the three tsconfigs extend it. Add `verbatimModuleSyntax` and `erasableSyntaxOnly`.
   2. For `core` and `api`: `tsconfig.json` includes `src/**/*` with the tests; `tsconfig.build.json` extends it and excludes `**/*.test.ts`, `test-support` and `*.test-support.ts`; `build` becomes `tsc -p tsconfig.build.json`. Check that `dist/` is byte-identical: `diff -r` of `core/dist` and `api/dist` before and after (the Dockerfile runs `npm run build -w @newspapper/core && npm run build -w @newspapper/api`, so the scripts' names stay).
   3. Add a root `typecheck`: `tsc -p core --noEmit && tsc -p api --noEmit && npm run typecheck -w @newspapper/ui`.
   4. Fix the 117 test errors (22 in `core`, 95 in `api`) with the test files' own types, not casts to `any`.
   5. Fix `ApiError` (`ui/src/lib/api.ts:16-22`) and the highlight class with a declared field assigned in the constructor, and add `override` at `ErrorBoundary.tsx:27, 33, 37`.
   6. `noUncheckedIndexedAccess` per decision 5, one commit per workspace: `core`, then `api`, then `ui`. Each fix is a guard or a destructure with a default, not a `!`.
4. **ESLint.** Replace the config per the table above, passing the roots: server code is `api/src`; browser code is `ui/src`; the CLIs are `api/src/seed.ts` and `api/src/server.ts`'s startup (`console`); the loggers are `core/src/util/logger.ts` and `ui/src/components/ErrorBoundary.tsx` (`console`, which decision 8 lets stand with a recorded reason, or routes through the logger). Typed linting reads each workspace's `tsconfig.json`; `vitest.config.ts`, `eslint.config.js` and `ui/vite.config.ts` use `allowDefaultProject` or `disableTypeChecked`. Fix what the rules find, or list each finding left, with its reason, in the outcome note. The default-export change (decision 8) is its own commit per workspace, with every importer updated.
5. **The gate.** In the root `package.json`:
   - `check` runs `typecheck`, `lint`, `fmt:check`, `check:conventions` and `CI=1 vitest run`. **`check` sets `CI=1` for the tests**, because without it the Chromium tests print a banner and skip, and a green `check` would reach nothing;
   - `gate` becomes `npm run check && npm run build && bash corpus/lint.sh`;
   - `check:conventions` runs knip now, and the two convention checkers from the `house-style` package when briefs 09 and 11 give them something to check (`--warn-only` until then). dependency-cruiser joins in brief 11;
   - `check:fast` runs `typecheck`, then ESLint on the files changed against `HEAD` plus the untracked ones (`*.ts`, `*.tsx`, `*.js`, `*.mjs` that exist). Use the package's changed-file script if it ships one, or a small Node script in `scripts/`. No shell-only syntax: the owner works on Windows under WSL;
   - `lint` stays `eslint .`, the fast subset.

   Time `check:fast` warm with one changed file, and `check` in full. Record both.
6. **`.claude/rules/`.** Each file under about 40 lines.
   - **`web.md`** (`paths: ["ui/src/**"]`):
     - read [wiki/chrome.md](../../wiki/chrome.md) and [wiki/design-components.md](../../wiki/design-components.md) before changing the chrome;
     - one `<App>` element at one position in `ui/src/routes.tsx` (the tray stays mounted);
     - Base UI only under `ui/src/components/ui/`, from subpaths;
     - the galley's textarea and its `<pre>` share every metric ([wiki/design-components.md](../../wiki/design-components.md) §5), and `SourcePane.wax.test.ts` guards it;
     - light only; the app chrome and the slide themes share nothing;
     - `ui/src/lib/api.ts` is the one place the base prefix is applied; URLs through `withBase`.
   - **`server.md`** (`paths: ["api/src/**", "core/src/**"]`):
     - `core/src/wizard` and `core/src/templates` are browser-safe (the UI imports them): no `node:` imports there;
     - every `/api/*` route sits behind the session guard (`api/src/ward/ward.guard.ts`); a route added outside it fails open;
     - a 5xx never sends its message to the client;
     - one `getBrowser` for rendering; tests that launch Chromium go through `core/src/render/test-support/chromium.ts`;
     - dependency versions are exact, and `data/`, `uploads/`, `output/` are gitignored.
7. **`CLAUDE.md`.** Per decision 11: replace the Commands block so `npm run check` and `npm run check:fast` are named, the typecheck is one root script, and a note that `check` sets `CI=1`. Net at most 6 lines. Keep the line "read `corpus/wiki/green-because-nothing-ran.md` before you trust a green command" and change "ten times" to "eleven" with the new case.
8. **Corpus.**
   - [wiki/green-because-nothing-ran.md](../../wiki/green-because-nothing-ran.md): add case 11, "`tsc` in `core` and `api`" (what it reached: not the 49 test files; found by: this brief's measurement; the check that would have caught it: a tsconfig that includes the tests, which `check` now runs). Update its summary and `CLAUDE.md`'s count.
   - [wiki/decisions-tooling.md](../../wiki/decisions-tooling.md): revisit "The formatter and the linter are enforced, and configured to do something" (the config is now the house format, not the measured minimum; the enforcement stays), and add "The house style, formatted and checked" with the width, the config source, and what was rejected and why. The page is 139 lines, so there is room.
   - [wiki/commands.md](../../wiki/commands.md), [wiki/status.md](../../wiki/status.md), [log.md](../../log.md).
   - Run `bash corpus/lint.sh --index`, then `bash corpus/lint.sh`, until it is clean.

## Acceptance

- [ ] `npm run check` passes. Its run time and `check:fast`'s, warm with one changed file, are in the outcome note, and `check:fast` is under about 15 s or the owner has accepted the time.
- [ ] `npx prettier --check .` passes. The reformat is one commit; it changes no program: for every file in `git diff --name-only <hash>^ <hash>`, `git show <rev>:<path> | npx esbuild --minify --loader=<ts|tsx|css|js>` prints the same bytes at `<hash>^` and at `<hash>` (esbuild's minifier normalizes quotes, semicolons and whitespace). Its hash is in `.git-blame-ignore-revs`.
- [ ] `tsc -p core` and `tsc -p api` read the test files: `npx tsc -p core --listFilesOnly | grep -c '\.test\.ts$'` prints 40 and the same for `api` prints 9. `core/dist` and `api/dist` have no `*.test.js`.
- [ ] `tsconfig.base.json` has `verbatimModuleSyntax` and `erasableSyntaxOnly`. `npm run typecheck` passes, and so does `docker build -f infrastructure/Dockerfile .`.
- [ ] ESLint reports zero errors with every rule in step 4. The counts before and after are in the outcome note, with every finding left and its reason.
- [ ] A deliberate `enum`, `!` in `api/src/server.ts`, `console.log` in `core/src/util/paths.ts`, `// TODO` and `export default` in a component each fail `npm run lint`. A floating promise (`fetch('/x')` with no `await`) in a `ui/src` handler fails it as well. Revert them after.
- [ ] `check` runs the Chromium tests: with Chromium missing, `npm run check` fails (it does not print a banner and pass).
- [ ] `.claude/rules/web.md` and `server.md` exist with `paths:` frontmatter. `CLAUDE.md` is at most 200 lines and names `npm run check`.
- [ ] With the plugin's hooks on, an agent's edit is formatted on save, and a type error stops it at `Stop`.
- [ ] `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 09 adds nothing to the gate beyond turning `check-base-ui` on `--warn-only`. Brief 10 adds `eslint-plugin-better-tailwindcss`, deletes the CSS the reformat touched (`ui/src/**/*.module.css`, 18 files, 69 lines), and drops `check-base-ui`'s `--warn-only`. Brief 11 adds dependency-cruiser, drops `check-structure`'s `--warn-only`, and turns `no-process-env` into an error.
- Brief 06 (a post as a video) is the only open brief that touches `core/` and the Dockerfile; run `npm run fmt` on its branch after this one lands.
- Brief 11 renames `api/src/server.ts`'s exports (it splits `buildApp` into `app.ts`); the `import X from` change in this brief's default-export step touches the same lines, so run 08 first.
