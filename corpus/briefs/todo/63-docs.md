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
