# Task 53 — Newspapper Wizard: parser, formatter, linter

## Context

Posts are written in **Newspapper Wizard** (`.wzd`), a JSX-flavoured markup.
Read [markup.md](../../wiki/markup.md) first — it is the spec, and this brief
implements its front half. The relevant decisions:
[the language choice](../../wiki/decisions.md#a-post-is-a-newspapper-wizard-document)
and [format and lint](../../wiki/decisions.md#format-and-lint-the-markup-like-jsx).

This brief delivers text → AST → text. Brief 54 turns the AST into something
renderable. They are separable: agree the AST shape below and both can proceed.

## Files you OWN

- `core/src/wizard/**` — new module: `parse.ts`, `ast.ts`, `format.ts`,
  `lint.ts`, `index.ts`, and co-located tests
- `core/src/index.ts` — export the new module

## Files you must NOT touch

`core/src/templates/**`, `core/src/render/**`, anything in `api/` or `ui/`.

## What to do

**1. AST.** Borrow Puck's shape — a node is `{ type, props, children }`, where
`children` is an inline array. Keep source positions on every node (line,
column, offset); the linter and the editor both need them.

```ts
type WzdNode = { type: string; props: Record<string, string>; children: WzdNode[]; loc: Loc }
type WzdDoc  = { head: Record<string, string>; body: WzdNode[]; loc: Loc }
```

**2. Parser.** Hand-written recursive descent — no parser generator, no new
dependency. It must handle: nested elements, self-closing tags (`<PageCounter />`),
string props (`size="lg"`), text content, and comments. It must **not** support
arbitrary JS expressions — this is markup, not JSX. `{date}` style bindings are
parsed as text tokens and resolved later by the renderer.

Parse errors carry a position and a message a human can act on. Never throw a
bare `SyntaxError`.

**3. Formatter.** One canonical printed form: 2-space indent, one element per
line unless it holds only text, props on one line until they exceed the width,
attribute order preserved. `format(parse(x))` must be idempotent —
`format(format(x)) === format(x)`. This is the property test that matters.

**4. Linter.** Rules, each with a code, a message, and a position:

- `unknown-component` — not in the catalogue
- `unknown-prop` / `invalid-prop-value` — not on that component, or outside its scale
- `misplaced-element` — `Item` outside `List`, content outside `<body>`, `Slide` nested in `Slide`
- `missing-head` / `missing-title`
- `empty-slide`
- `slide-count` — a post needs at least 1 slide; warn above 10

Severity is `error` or `warning`. The linter returns a list; it never throws.

The component catalogue and prop scales are shared with brief 54 — put them in
`core/src/wizard/catalogue.ts` as data (component name → allowed props → allowed
values), so both briefs read one definition. Props are exactly `size`
(`xs|sm|md|lg|xl`), `align` (`left|center|right`), `emphasis`
(`muted|normal|strong`), and not every component takes all three.

## Acceptance

- Round-trip: for a corpus of at least 10 hand-written sample documents,
  `format(parse(doc))` is stable and idempotent.
- Every lint rule above has a test that triggers it and one that doesn't.
- Parse errors and lint findings both carry accurate line/column.
- `npm test` passes; no new runtime dependency added.
