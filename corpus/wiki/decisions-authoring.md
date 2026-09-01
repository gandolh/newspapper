---
summary: The locked calls about how a post is written — the .wzd document, semantic token-only components, flow layout, the markup as source of truth, formatting and linting it like JSX, and the editor's data model.
updated: 2026-09-01
---

# Decisions — authoring

How a post gets written. These are the calls that make the Wizard language what
it is, and they hang together: semantic components with no style props are what
let the markup be the source of truth, which is what lets it be formatted and
linted like code.

The sibling pages: [decisions.md](./decisions.md) for product shape,
[decisions-engineering.md](./decisions-engineering.md) for runtime and library
calls, [decisions-security.md](./decisions-security.md) for the security
posture, [decisions-tooling.md](./decisions-tooling.md) for how the repo builds
itself. Same rule for all five: don't reopen one without an explicit revisit and
a [log.md](../log.md) entry.

## A post is a Newspapper Wizard document
_2026-08-27_ — Posts are authored as text in **Newspapper Wizard**, a small
JSX-flavoured markup. File extension `.wzd`.
Rejected: **YAML** (indentation is the most common way a model emits a broken
document); **Markdown with directives** (lovely for prose, awkward once layout
nests). JSX wins on unambiguous nesting, clean re-serialization from a visual
editor, and how reliably models emit it. Spec: [markup.md](./markup.md).

## Components are semantic, with token-only props
_2026-08-27_ — Components are meaningful things — heading, text, quote, image —
with constrained props (a size from a scale, an alignment). **There is no raw
CSS field**; all styling resolves from the theme.
Rejected: generic styled boxes with open CSS, which is what `TNode` is today.
Open CSS is how off-brand output gets back in — and this project dropped its LLM
precisely because output looked unattractive, so the format must make ugly hard.
Constrained props mean a post is on-brand by construction, whoever typed it.
`TNode` survives as the **compile target**, not the authoring surface.

## Flow layout with stacks — never absolute positioning
_2026-08-27_ — Components lay out in flow, stacked. Position is never part of
the document. Rejected: absolute x/y/w/h on the 1080×1080 canvas — it makes
drag-and-drop trivial to build and is a trap, because text that grows overlaps
its neighbours instead of pushing them, so one long headline silently destroys a
slide. Puck's data model carries no positioning either, for the same reason.

## The markup is the source of truth
_2026-08-27_ — A post is stored as its `.wzd` text. The compiled tree is derived
on preview and render, never persisted as the authority. `<head>` declares
everything about the post that isn't a slide — title, description, keywords,
caption, hashtags, date — and SQLite columns are **derived from it** on save, as
an index for listing and search.
Rejected: compiled JSON as the truth with markup as a view, which reintroduces
the round-trip problem canonical formatting exists to avoid. Two authorities
would disagree; one won't.

## Format and lint the markup, like JSX
_2026-08-27_ — The markup has a canonical printed form and a linter. The visual
editor writes **through** the formatter, so dragging a component produces the
same text a person would have typed. A manual format-and-lint action exists too.
Rejected: preserving the author's formatting across visual edits, which needs a
full concrete syntax tree with source positions — months of work to keep
whitespace intact. The linter is where semantic rules live: unknown component,
invalid prop value, malformed slide.

## Build the editor; borrow Puck's data model
_2026-08-27_ — Newspapper implements its own editor rather than adopting
[Puck](https://github.com/puckeditor/puck) (MIT, and close to exactly this).
Rejected: depending on Puck — its `<Render>` is React while this pipeline
renders server-side HTML for a Chromium screenshot, and its component-config API
is far larger than a fixed component library needs. Borrowed instead: its data
model, `{ type, props }` per node with children as an inline array in a slot
prop, which maps onto the existing `payload` column.
