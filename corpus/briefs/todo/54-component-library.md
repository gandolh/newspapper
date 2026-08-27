# Task 54 — Component library and the compile to `TNode`

## Context

[Components are semantic with token-only props](../../wiki/decisions.md#components-are-semantic-with-token-only-props):
the author writes `<Heading size="xl">`, never CSS. `TNode` — the existing
`box`/`text`/`repeat` tree with `$token` styles — survives as the **compile
target**, so the interpreter, the theme system and the Chromium renderer carry
over unchanged. See [markup.md](../../wiki/markup.md) for the catalogue.

This is the back half of the language. It depends on the AST and catalogue from
brief 53.

## Files you OWN

- `core/src/wizard/compile.ts` and `core/src/wizard/components/**`
- `core/src/wizard/catalogue.ts` (shared with brief 53 — coordinate, don't fork it)
- Co-located tests

## Files you must NOT touch

`core/src/templates/interpreter.ts` (consume it, don't change it),
`core/src/render/**`, `api/`, `ui/`.

## What to do

**1. Implement the catalogue.** Each component is a function
`(props, children) => TNode`, built from theme tokens only. The set:

| Group | Components |
|---|---|
| Structure | `Slide` `Stack` `Row` |
| Content | `Heading` `Text` `List` `Item` `Quote` `Stat` `Image` |
| Accents | `Kicker` `Divider` `Spacer` `Source` |
| Generated | `PageCounter` |

`Slide` is one 1080×1080 image. `Stack` flows children vertically with a
token gap; `Row` splits horizontally — this is how two-column comparison
happens. `Quote` carries its attribution; `Stat` is a big number with a label.

**2. Props resolve to tokens, never to values.** `size="lg"` selects a
typography token; `emphasis="muted"` selects a color token. A component must not
be able to emit a raw CSS value that didn't come from the theme — that
invariant is the point of the design and is worth a test of its own.

**3. `PageCounter` renders `2/5`.** The index and total are injected at compile
time from the document's slide list — the author never types either. The
interpreter's existing `{{_index}}` / `{{_total}}` bindings already carry this.

**4. `<head>` values become the binding scope.** `{date}`, `{title}` and the
rest resolve from `<head>`; an unresolved binding is a lint error (coordinate
the rule with brief 53), not a silently empty string.

**5. Compile entry point:** `compileDocument(doc: WzdDoc, theme: Theme): TNode[]`
— one `TNode` per slide, ready for the existing renderer.

## Acceptance

- Every component in the catalogue has a test asserting its `TNode` output.
- A test proves no component can emit a style value absent from the theme.
- A full sample document compiles to `TNode`s that render through the existing
  interpreter without modification.
- `PageCounter` produces correct `n/total` for every slide in a multi-slide doc.
- `npm test` passes.
