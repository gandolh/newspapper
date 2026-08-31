# Routing

Which layer answers which question, and how work is picked up. Useful to anyone
— or any agent — starting cold.

## Intent

| The request | Route to |
|---|---|
| "add a todo", "remember to…" | a file in [todos/](todos/) |
| "let's build X", "work on brief NN" | a numbered spec in [briefs/todo/](briefs/todo/) |
| "what does the wiki say about X" | [index.md](index.md), then at most 2–3 wiki pages |
| "why is it done this way" | one of four: [decisions.md](wiki/decisions.md) (product), [decisions-engineering.md](wiki/decisions-engineering.md) (runtime/library), [decisions-security.md](wiki/decisions-security.md), [decisions-tooling.md](wiki/decisions-tooling.md) (the repo itself) |
| "how do I make a post" | [README.md](../README.md), then [wiki/markup.md](wiki/markup.md) |
| "the check passed — did it check anything?" | [wiki/green-because-nothing-ran.md](wiki/green-because-nothing-ran.md) |
| "what's the state of things" | [wiki/status.md](wiki/status.md) |
| "how does the markup work" | [wiki/markup.md](wiki/markup.md) |
| "what do we call this" | [wiki/glossary.md](wiki/glossary.md) |
| "is this still broken" | [wiki/open-questions.md](wiki/open-questions.md), then verify against the code |

## Knowledge routing

| Question shape | Layer | Why |
|---|---|---|
| Why is it this way? What was rejected? | **wiki** — the decisions pages, [log.md](log.md) | The corpus is the *why*. Authored, reviewed, a source of truth. |
| What's the current state / what's blocking? | **wiki** — [status.md](wiki/status.md) | The living dashboard. |
| What does this module export? | **wiki** — [modules.md](wiki/modules.md), then verify in `core/src/` | The page drifts; the code wins. |
| Who calls X? What breaks if I change X? | **grep** | There is no generated code index in this repo. |
| Did I get *every* usage? | **grep** (`grep -rnw`) | Completeness is never a wiki question. |
| Does this actually work? | **run it** — `npm test`, or the app | Nothing in the corpus is authoritative over behavior. |
| Did that green run reach anything? | **check what the tool's scope actually is** — [green-because-nothing-ran.md](wiki/green-because-nothing-ran.md) | Eight defects in this repo were the checkers, not the code. |

## READ / SKIP

| | |
|---|---|
| **READ** | [index.md](index.md) first, always. Then [wiki/overview.md](wiki/overview.md) + at most 2 more pages. Root `CLAUDE.md` for the hard constraints. |
| **SKIP** | `briefs/` and `todos/` wholesale — [status.md](wiki/status.md) has every brief's state in one line. `data/`, `output/`, `uploads/`, `node_modules/`, `package-lock.json`. |
| **NEVER** | Relitigate a decisions entry without an explicit revisit + a log line. Reintroduce a removed dependency (see the constraints in root `CLAUDE.md`). |

## Working a brief

1. Read the brief in [briefs/todo/](briefs/todo/) — it is self-contained by design.
2. Respect its **Files you OWN** / **must NOT touch** contract; briefs are
   written so several can run in parallel without collision.
3. When it's done: move the file to [briefs/done/](briefs/done/) keeping its
   number, append an outcome note, add a [log.md](log.md) entry, and fold what's
   durable into the wiki.
4. `bash corpus/lint.sh` must exit clean before committing corpus changes.
