# Task 73 — Remove the dead configuration the docs pass uncovered

## Context

Brief 63 verified the documentation against the source and found four things
that exist, are tracked, and do nothing. **Two were deleted outright on
2026-08-31** during a cleanup pass — a compose file defining only an Ollama
service for a product that calls no LLM, and a root `tsconfig.json` that no
workspace extended, pointing at a root `src/` that contained no files. Both were
file removals with nothing to decide.

The two that remain need judgement, which is why they are still a brief.

Neither is a bug. Both are **inert weight that reads as live**, which is the
failure mode this project has been paying for all rebuild: eight entries in
[green-because-nothing-ran.md](../../wiki/green-because-nothing-ran.md), most of
them a thing that looked wired up and was not.

**1. `loadConfig()` is exported and called nowhere.** `core/src/util/config.ts:20`,
re-exported from the core barrel at `core/src/index.ts`. Grep returns the
definition and the re-export and nothing else. So seven environment variables —
`MAX_ARTICLES_PER_SOURCE`, `USER_AGENT`, `REQUEST_TIMEOUT`, `MAX_RETRIES`,
`OUTPUT_DIR`, `DB_PATH`, `DEFAULT_RETENTION_DAYS` — are documented, settable, and
**have no effect whatsoever**. Setting one and expecting a change is a debugging
session that ends in nothing. `THEME` is the exception: it is live, but only
because `core/src/storage/settings.ts:9` reads it separately.

**2. `api/package.json` declares `start: node dist/server.js`.** The api's build
is `tsc --noEmit` and emits no `dist/`. The script cannot work.

## Files you OWN

- `core/src/util/config.ts`, `core/src/index.ts` (the re-export)
- `api/package.json` (the `start` script only)
- `.env.example`
- `corpus/wiki/configuration.md`

## Files you must NOT touch

- `core/src/storage/settings.ts` — `THEME` is live and must stay live
- Anything else under `core/src/`, `api/src/`, `ui/src/`
- `corpus/log.md` — the controller updates it

## What to do

For each of the two: **decide whether the right answer is to delete it or to
wire it up**, and say which and why.

- `loadConfig` is the one that needs real judgement. Deleting it and its seven
  vars is honest and smallest. Wiring it up is defensible **only** if a caller
  genuinely wants the value — and if you wire one up, it needs a test that fails
  when the variable is ignored, or you have created the ninth instance of the
  pattern above.
- The `start` script: either make `api` emit a `dist/` or delete the script.
  A script that cannot run is worse than no script. Note that `api`'s build is
  deliberately `tsc --noEmit` because the API runs under `tsx` in dev and is
  never bundled — so "make it emit" is a real change, not a config tweak.

Whatever you remove, remove its documentation in the same pass. A variable
deleted from the code and left in `.env.example` is the same defect wearing a
different hat.

## Acceptance

- No environment variable is documented in `.env.example` or
  `configuration.md` unless something reads it. **Prove this by grepping for a
  reader of each**, and put that list in the outcome note.
- No script in any `package.json` fails when run.
- `npm run build`, `npm test`, `npm run lint` pass; `npx tsc -p ui --noEmit` at 0;
  `bash corpus/lint.sh` clean.

---

## Outcome — 2026-08-31

Both items resolved. Gate verified by the controller: build ✓, **659 tests / 47
files** ✓, lint ✓, `tsc -p ui` at 0 ✓, corpus lint ✓.

**This brief was wrong about its own first item, and the agent caught it.**
`core/src/util/config.ts` line 1 is `import 'dotenv/config'` — **the only dotenv
call site in the repo.** The barrel imported that module, `api` imports the
barrel, and that is the entire mechanism by which `.env` reaches
`process.env`. Deleting the file as "dead" — which is what this brief described,
and what a reader skimming for a `loadConfig()` would do — would have silently
stopped `.env` being read at all, taking `SESSION_SECRET`, `ADMIN_USERNAME`,
`ADMIN_PASSWORD`, `PORT`, `NEWSPAPPER_DB_PATH`, `UPLOADS_DIR`,
`UPLOADS_BASE_URL` and `THEME` with it. No throw, no log — the app just boots on
defaults.

That is instance **nine**, and it would have been built by hand inside the brief
filed to prevent it. It was avoided by measuring rather than reasoning: with a
probe variable appended to `.env`, a script whose only statement was
`import '@newspapper/core'` printed it; the same script without that import
printed `undefined`.

So: `loadConfig()`, the `Config` interface and all seven inert variables are
deleted; the side effect is kept and **promoted to the barrel's first
statement**, with both sites commented to say they are load-bearing despite
exporting nothing. A new `core/src/util/config.test.ts` guards both halves, and
the controller mutation-checked it — removing the barrel import fails the test,
restoring it passes.

**`api`'s `start` script is deleted, and "make it emit" was rejected on
evidence rather than argument.** The agent compiled `api` for real and ran the
output: it dies with `ERR_MODULE_NOT_FOUND` reaching into `core`, because
`core`'s `exports` map points at `./src/index.ts` — raw TypeScript, resolvable
only under a TS-aware loader. Making the script work would require compiling
`core` and re-pointing its exports, which would break `ui`'s Vite build against
the `./wizard` and `./templates` source subpaths.

**The reader-per-variable table is in `configuration.md`**, and every surviving
variable has a named reader: `PORT`, `SESSION_SECRET`, `ADMIN_USERNAME`,
`ADMIN_PASSWORD`, `NEWSPAPPER_DB_PATH`, `UPLOADS_DIR`, `UPLOADS_BASE_URL`,
`THEME`. `USER_AGENT` was a near-miss worth noting — `core/src/scrape/index.ts`
has a `DEFAULT_USER_AGENT` constant and a `userAgent` option, but never
consulted the env var.

`THEME` was verified end-to-end against the changed code with a real `.env` and
a scratch DB, not via the existing `vi.stubEnv` tests — those would have passed
with dotenv gone, which is exactly the trap.

Every script in every `package.json` was run. Three docs the agent flagged
outside its ownership were fixed by the controller: `commands.md` described the
now-deleted `start` script, `modules.md` still listed `loadConfig()`, and
`status.md`'s strays table still carried both resolved rows.
