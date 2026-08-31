# Task 63 — Documentation pass

## Context

The root documentation still describes the pre-pivot product. Some of it is not
merely stale but **actively harmful**: the root `CLAUDE.md` forbids adding Sharp,
which brief 56 requires, and describes an Ollama pipeline that no longer exists.
A future agent reading it would make the wrong call.

`PRODUCT.md` and `DESIGN.md` also move into the corpus — documentation belongs
in one place.

Run this **last**, when the code it describes actually exists.

## Files you OWN

- `CLAUDE.md`, `README.md`
- `PRODUCT.md` → `corpus/wiki/product.md`
- `DESIGN.md` → `corpus/wiki/design.md` (+ a one-line root stub)
- `corpus/wiki/{overview,architecture,modules,commands,configuration,data,dependencies,api,design-systems,status}.md`

## Files you must NOT touch

Any source file. This brief changes documentation only.

## What to do

1. **Root `CLAUDE.md`** — rewrite the pipeline, commands, data and constraints
   sections. The constraint list must now say Sharp **is** allowed for image
   processing and that Ollama and all LLM calls are gone. Keep the corpus
   section and its maintenance rules; add `decisions-engineering.md` to rule 6.
2. **`README.md`** — rewrite around the real product: write a post in Wizard
   markup, edit it visually, render, publish.
3. **Move `PRODUCT.md`** to `corpus/wiki/product.md` with frontmatter, rewritten:
   it currently describes a single local user, an RSS-to-carousel pipeline and a
   four-step wizard, none of which is true.
4. **Move `DESIGN.md`** to `corpus/wiki/design.md`. It is 260 lines, over the
   corpus's 200-body-line cap — **split it** (tokens / components / rules) rather
   than exempting it. Leave a one-line `DESIGN.md` at the root pointing at the
   corpus so tooling that expects it there still resolves.
5. **Rewrite the descriptive wiki pages** to match the shipped code. These were
   deliberately left stale during the pivot — `status.md` says so. Verify each
   claim against the source before writing it; do not carry a sentence forward
   because it reads plausibly.
6. **Rewrite `status.md`** for the post-pivot state, and clear from
   `open-questions.md` anything the work resolved.
7. `bash corpus/lint.sh` must exit clean, and `--index` regenerated.

## Acceptance

- No file in the repo describes Ollama, compose, templates, the builder, PNG
  output, or the four-step wizard as current behaviour.
- `grep -ri "do NOT add Sharp" .` returns nothing.
- Every wiki page's `updated:` reflects the pass; `corpus/lint.sh` is clean.
- A reader who knows nothing about the project can go from `README.md` to a
  rendered post without opening a source file.

---

## Outcome — 2026-08-31

Done, and no source file was touched. Gate verified by the controller: build ✓,
**657 tests / 46 files** ✓, lint ✓, `tsc -p ui` at 0 ✓, corpus lint ✓, index
regenerated at 22 pages.

**The documentation was not merely stale — several pages asserted things the
code contradicts**, and the agent believed the code in every case:

- `configuration.md` documented an Ollama section and eight env vars as live.
  **`loadConfig()` is exported from the core barrel and called nowhere**, so
  seven of them are inert. `THEME` survives only because `settings.ts:9` reads it
  separately. Filed as brief 73.
- `architecture.md` listed `compose` as a core export and `POST /api/compose` in
  the pipeline. Neither exists.
- `commands.md` described `npm run build` as "typecheck + astro build" and lint
  as core+api only.
- `data.md` claimed schema v4 while its own migration table stopped at v3.
- `status.md` claimed 15 of 16 briefs; there are 34 in `done/`.

**`DESIGN.md` split into `design.md` (§1–§4) and `design-components.md` (§5–§9),
with continuous section numbering** — which is load-bearing rather than tidy:
nine source files cite "DESIGN.md §N" in comments. Root `DESIGN.md` and
`PRODUCT.md` are one-line stubs. The `PRODUCT.md` stub was **not** in the brief;
it is required because `briefs/done/64` links `../../../PRODUCT.md` and the
linter checks links inside `done/`. Briefs are immutable, so the stub stays
unless that brief is amended.

**The best thing in this pass is a page the brief did not ask for.**
`green-because-nothing-ran.md` collects all eight incidents with, for each, what
the tool actually reached, how it was caught, and the cheap check that would
have caught it sooner. It is linked from `CLAUDE.md`, `README.md`, `index.md`,
`routing.md`, `overview.md`, `status.md`, `commands.md` and `configuration.md`.
Those incidents were the most useful thing this project knows about itself and
they were buried in an append-only log where nobody would find them.

The agent also fixed single errors in pages it was told not to rewrite — a
paragraph in `chrome.md` duplicated from `design-systems.md` and referring to
nothing on its own page; present-tense Astro claims in `decisions-engineering.md`
and `decisions-tooling.md`; `glossary.md` still defining `Template` by a deleted
directory and `Render` as PNG. And it corrected `corpus/CLAUDE.md`, whose own
constraints paragraph still said "Ollama only, no Sharp, one post per day" —
precisely the harm this brief was filed to remove, one directory further in than
anyone had looked.

**Stated plainly rather than asserted:** no `engines` field exists anywhere, so
the README says "developed and gated on Node 24" rather than claiming a floor;
and the "Making a post" walkthrough is verified against the route table and
components, not against a live browser session.

Four dead-but-tracked strays are documented in `status.md` and filed as brief
73: `loadConfig` and its seven inert vars, an `infra/docker-compose.yml` that
defines only an Ollama service, a root `tsconfig.json` pointing at an untracked
`src/`, and an `api` `start` script referencing a `dist/` its build never emits.
