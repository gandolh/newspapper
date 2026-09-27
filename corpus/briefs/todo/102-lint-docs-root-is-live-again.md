# Task 102 — The corpus linter still calls `docs/` abandoned, but it is a live directory again

## Context

Found in the 2026-09 sweep, while filing the sweep's own briefs. `corpus/lint.sh`
keeps a `ABANDONED_ROOTS` list (lint.sh:17-24) that flags any corpus page
referencing a retired directory:

```
ABANDONED_ROOTS=(
  "docs/"          # → corpus/ (2026-08-27)
  …
)
```

`docs/` was correct on 2026-08-27, when the old `docs/` wiki was migrated into
`corpus/`. But on **2026-09-07** the Starlight documentation site re-introduced a
real `docs/` directory (`docs/astro.config.mjs`, `docs/scripts/sync-corpus.mjs`,
`docs/package.json`, `npm run docs -w @newspapper/docs-site`), and the list was
never updated. So the rule now produces **false positives**: any corpus page that
legitimately references the live docs site is reported as stale.

This surfaced because briefs 83 and 100 are the first corpus files to reference
`docs/` since it came back — `bash corpus/lint.sh` now reports three findings, all
from this one stale entry, none of them real:

```
corpus/briefs/todo/100-bump-advisory-deps.md — references abandoned path root 'docs/'  (×2)
corpus/briefs/todo/83-reconcile-docs-with-ward.md — references abandoned path root 'docs/'
```

## What to do

- Remove the `"docs/"` line from `ABANDONED_ROOTS` in `corpus/lint.sh` — `docs/`
  is no longer abandoned; it is the documentation-site workspace.
- Leave the other entries (`.claude/skills`, `plans/`, `infra/`, `corpus/CLAUDE.md`)
  — verify each is still genuinely gone (quick `ls`), and drop any that are not.
- Confirm `bash corpus/lint.sh` then exits clean with briefs 83 and 100 in place.

## Acceptance

- `bash corpus/lint.sh` exits 0 with the full `todo/` backlog present (no `docs/`
  false positives).
- The remaining abandoned roots still correspond to directories that really do
  not exist (state which you checked).
- No corpus page that references a genuinely-retired root is let through (i.e. you
  removed only the entry that is wrong, not the check).

## Files you OWN

- `corpus/lint.sh`

## Files you must NOT touch

- the briefs themselves — their `docs/` references are correct
- `corpus/log.md`, `corpus/wiki/status.md`

## Note

Trivial and safe to do first — until it lands, `bash corpus/lint.sh` reports three
false positives, which will mask a real corpus-lint finding if one appears.
