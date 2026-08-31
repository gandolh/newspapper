# Task 73 — Remove the dead configuration the docs pass uncovered

## Context

Brief 63 verified the documentation against the source and found four things
that exist, are tracked, and do nothing. It documented them as "known strays"
in `status.md` rather than deleting them, correctly — it was a documentation
brief and this is code.

Nothing here is a bug. It is all **inert weight that reads as live**, which is
the failure mode this project has been paying for all rebuild: eight entries in
[green-because-nothing-ran.md](../../wiki/green-because-nothing-ran.md), most of
them a thing that looked wired up and was not.

**1. `loadConfig()` is exported and called nowhere.** `core/src/util/config.ts:20`,
re-exported from the core barrel at `core/src/index.ts:23`. Grep returns the
definition and the re-export and nothing else. So seven environment variables —
`MAX_ARTICLES_PER_SOURCE`, `USER_AGENT`, `REQUEST_TIMEOUT`, `MAX_RETRIES`,
`OUTPUT_DIR`, `DB_PATH`, `DEFAULT_RETENTION_DAYS` — are documented, settable, and
**have no effect whatsoever**. Setting one and expecting a change is a debugging
session that ends in nothing. `THEME` is the exception: it is live, but only
because `core/src/storage/settings.ts:9` reads it separately.

**2. `infra/docker-compose.yml` defines only an Ollama service.** The product
calls no LLM at all — see [decisions.md](../../wiki/decisions.md#no-llm-in-the-product).

**3. Root `tsconfig.json` has `include: ["src/**/*"]`**, pointing at an untracked
root `src/` of v2 leftovers that is not part of any workspace.

**4. `api/package.json` declares `start: node dist/server.js`.** The api's build
is `tsc --noEmit` and emits no `dist/`. The script cannot work.

## Files you OWN

- `core/src/util/config.ts`, `core/src/index.ts` (the re-export)
- `infra/**`
- Root `tsconfig.json`
- `api/package.json` (the `start` script only)
- `.env.example`
- `corpus/wiki/configuration.md`

## Files you must NOT touch

- `core/src/storage/settings.ts` — `THEME` is live and must stay live
- Anything else under `core/src/`, `api/src/`, `ui/src/`
- `corpus/log.md` — the controller updates it

## What to do

For each of the four: **decide whether the right answer is to delete it or to
wire it up**, and say which and why. They will not all have the same answer.

- `loadConfig` is the one that needs real judgement. Deleting it and its seven
  vars is honest and smallest. Wiring it up is defensible **only** if a caller
  genuinely wants the value — and if you wire one up, it needs a test that fails
  when the variable is ignored, or you have created the ninth instance of the
  pattern above.
- The `start` script: either make `api` emit a `dist/` or delete the script.
  A script that cannot run is worse than no script.
- Do **not** delete `infra/` wholesale without checking whether anything
  references it — `README.md` and `configuration.md` are the likely places.

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
