# Corpus conventions

This directory is the project's knowledge and work, run as an LLM-maintained
wiki. **The human curates the sources and asks the questions; the LLM curates
the synthesis and tracks the work.** It is the durable counterpart to
`TodoWrite` (in-session only) and to chat (which evaporates) — a reusable
finding gets folded in here, not left in a transcript.

Read [index.md](index.md) first. Route with [routing.md](routing.md).

## Layout

```
corpus/
  CLAUDE.md    this file — the rules
  index.md     the catalog. Generated: `bash corpus/lint.sh --index`
  routing.md   which question goes to which layer
  lint.sh      health check; exit non-zero on findings
  log.md       append-only, chronological, newest last
  todos/       captured ideas, prose, pre-spec
  briefs/      work specs — todo/ · done/ · superseded/
  wiki/        the synthesis layer. The LLM owns this.
```

## The retrieval budget

A corpus exists to make an agent **cheaper**, not just better-informed.

1. Read `index.md`. Then read **at most 2–3 wiki pages**.
2. Needing a fourth is a **signal**, not a licence: a page is straddling topics
   and must split, or its `summary:` is not sharp enough. Fix the cause.
3. Never read `briefs/` or `todos/` wholesale. `wiki/status.md` holds every
   brief's state in one line; open a brief only for the spec that directed
   specific work.
4. Prefer the `summary:` line over opening the page.

## Rules

- **Every wiki page opens with frontmatter** — exactly `summary:` and
  `updated:`. The summary is written for an agent deciding whether to open the
  page, not as a title. `index.md` is generated from these; never hand-edit the
  catalog block.
- **One concept per file.** Split a page past ~200 body lines or straddling two
  topics, and cross-link.
- **Briefs are immutable.** Numbers are stable — never renumber one when it
  moves. Don't edit a brief in `done/`; if later work undoes it, move it to
  `superseded/` with a one-line note. New work gets a new brief in `todo/`.
- **The LLM curates `wiki/` freely.** Rewrite a page as understanding improves;
  it is synthesis, not an append-only log. Stale phrasing is a bug, not history.
- **Standard relative markdown links**, not `[[wikilinks]]`. From `wiki/`, code
  is `../../core/src/...`; from `briefs/done/`, the same.
- **Absolute dates** (`2026-08-27`), never "yesterday".
- **Log every meaningful change** — one entry at the bottom of `log.md`:
  `## [YYYY-MM-DD] <kind> | <one-line summary>`, where kind is one of `done`,
  `todo`, `maintenance`, `decision`, `ingest`, `lint`, `incident`, `resume`.
- **Never commit corpus changes unless asked.** The user controls when they land.

## Source of truth, when things disagree

1. **The actual code** wins over any wiki claim.
2. A brief in **`done/`** wins over `wiki/` if the wiki hasn't caught up.
3. **`wiki/decisions.md`** wins over `wiki/status.md` for tech choices not
   formally revisited.

**Verify before quoting.** A page naming a path, function, or commit may have
drifted: check the path exists, grep the symbol, `git log` the hash. Never
recommend an action based on an unverified wiki claim about specific code.

## This project's constraints

The hard product and dependency constraints live in the **root `CLAUDE.md`**
(no LLM at all; Satori/canvas/cheerio/axios and friends must not be added;
exact version pinning; ESM throughout). The *reasoning* behind them
lives in [wiki/decisions.md](wiki/decisions.md) and its three siblings —
`decisions-engineering.md`, `decisions-security.md`, `decisions-tooling.md`.
Root CLAUDE.md says what; those say why.

## Workflows

| Task | Do |
|---|---|
| Capture an idea | Write `todos/<slug>.md` with `title` / `created` / `status: open` frontmatter. One todo per file. |
| Promote to a brief | Next number across all three brief dirs, then `briefs/todo/<NN>-<slug>.md`: Context · Files you OWN · Files you must NOT touch · What to do · Acceptance. Mark the source todo `status: promoted`. |
| Finish a brief | `git mv` it to `briefs/done/` (keep the number), append an outcome note at move time, add a `log.md` entry, then **fold the durable findings into `wiki/`** — `status.md` always, plus the relevant concept page. |
| Ingest a finding | Update the affected wiki pages; create a page if the concept has none; cross-link from `index.md`; log an `ingest` entry. |
| Health check | `bash corpus/lint.sh`, then sweep by hand for contradictions, stale claims, orphan pages, and named-but-pageless concepts. Log a `lint` entry. |
