---
summary: The eight times a tool in this repo reported success while reaching nothing — what each one was, how it was caught, and the cheap check that would have caught it sooner. Read before trusting a green command here.
updated: 2026-08-31
---

# Green because nothing ran

**Most of this project's real defects were not in the code. They were in the
things that were supposed to be checking it.**

Eight separate times, a command in this repo exited 0 while touching nothing it
was believed to touch. Not one was found by the tool that should have found it;
every one was found by somebody asking, out loud, *what did that actually
reach?*

They are collected here because an append-only [log](../log.md) buries a
pattern, and this one is the most useful thing the project knows about itself.
Each entry links back to its log entry for the full account.

## The eight

| # | The tool | What it reached | Found by |
|---|---|---|---|
| 1 | `npm test` setting `NEWSPAPPER_DB_PATH` | **The developer's real database.** `defaultDbPath()` resolved from `import.meta.url` and never read the variable, so every test run migrated `data/newspapper.db`. Harmless until a migration started dropping tables — then a test run deleted 1 post and 33 articles. | A destructive migration landing (2026-08-27) |
| 2 | `.gitignore`'s unanchored `uploads/` | It also matched `core/src/uploads/` — **the whole new module would have been invisible to git**, building and testing green locally and shipping as "done" until someone cloned the repo. Fixed by anchoring to `/uploads/`. | The wave gate's "tracked, not merely on disk" check |
| 3 | `vitest.config.ts`'s `include` | `core/**` and `api/**` only. A brand-new guard test under `ui/` **would have existed and never executed.** | Writing the guard test and watching for it in the run |
| 4 | `astro build` as the UI's typecheck | It bundles from page entry points and tree-shakes, so an unreferenced file was never checked. `tsc -p ui` by hand caught nothing either: a deprecated `baseUrl` in `ui/tsconfig.json` aborted the run **before a single file was checked**. Nine errors were hiding. | Chasing one dangling import and asking why no gate caught it |
| 5 | `npm run fmt` | **No Prettier config existed anywhere.** It formatted with defaults — double quotes, against a single-quote codebase — rewriting 106 files, and exited 2 on a glob naming `.astro` files with no plugin installed. `npm run lint` meanwhile covered only `core/` and `api/`, skipping the largest workspace. | Running it on a clean tree expecting a no-op |
| 6 | The typeface guard's control | `fonts.test.ts` built its "no Inter" control with `html.replace(/'Inter'/g, …)`, which worked **only because the inline styles were unquoted**. Quote them and the rename hits both sides — control and subject become the same document. Its own comment claimed it renamed the family everywhere; it did not, and it worked *because* it did not. | A later change quoting the family, which failed the test closed — by luck |
| 7 | `npm run lint` | `eslint.config.js` registered the parser and plugin, switched off the three rules it named, and imported no recommended config. **Zero rules were enabled**, for the project's entire history. Verified rather than assumed: a file with a plain unused variable drew exit 0 and no output. | Brief 68, filed about something else |
| 8 | `api/src/routes/uploads.test.ts` | It imported `sharp` that `api/package.json` never declared, resolving against **the hoisted copy Astro pulled in as an optional dependency**. So it had been testing image handling against sharp 0.34.5 while production ran 0.35.4 — and the moment Astro was removed it contributed **zero** tests instead of fourteen. | An import error inside a two-agent wave, resolved by reading `git show HEAD:package-lock.json` rather than by argument |

## What generalises

- **A harness that sets an environment variable is not evidence that anything
  reads it.** (1)
- **A file on disk is not a file in the repo**, and a build that is green on
  your machine proves nothing about a fresh clone. (2)
- **A test that exists is not a test that runs.** Check the runner's `include`
  when you add a file in a new place. (3)
- **A bundler is not a typechecker.** It only reaches what an entry point
  imports. And a config-level error can abort a checker before file one — zero
  errors and zero files checked look identical from outside. (4)
- **A tool with no configuration still has a configuration**, and it is
  whatever the vendor picked. (5)
- **A control should be structurally incapable of the thing it controls for**,
  not incapable by side effect of a regex. If a small edit elsewhere can
  collapse the control into its subject, it is not a control. (6)
- **A linter can be pointed correctly and still be told to do nothing.** The
  tell had been sitting in the tree: a `eslint-disable-next-line` for a rule the
  config never defined. **A disable comment is evidence that someone expected a
  rule to run** — grepping for suppressions of undefined rules is cheap and
  would have caught this. (7)
- **A dependency that resolves only by hoisting is a test that passes by
  coincidence.** Removing an unrelated package breaks it, and the version it
  silently binds to is whatever the accident supplied. (8)

Six of the eight were tools pointed at the wrong place. Number 7 was configured
to do nothing, which no amount of correct pointing would have fixed. Number 6
was a test whose control was correct in principle and load-bearing on an
accident.

## The check

When a command passes, ask **what it reached**, and prefer an answer you can
measure over one you can reason to:

1. Make the check fail on purpose. Break the thing it guards and confirm it goes
   red. (This is how 7 was verified.)
2. Read the tool's own idea of its scope — the `include`, the glob, the entry
   points, the config file it resolved — rather than the script name.
3. Confirm new files are **tracked**, not merely present.
4. Grep for suppressions of rules, and skips of tests, that nothing defines.
5. For a test's dependencies, check they are **declared** by the package that
   imports them.

The gates the project runs today — `npm run build` (which runs `fmt:check`
first, then typechecks all three workspaces), `npm test`, `npm run lint` across
all three, and `bash corpus/lint.sh` — are the shape they are because of these
eight. See [decisions-tooling.md](./decisions-tooling.md) for what each one is
now required to cover, and [commands.md](./commands.md) for how to run them.
