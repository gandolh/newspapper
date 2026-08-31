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

---

## Outcome — 2026-08-27

Done, 73 tests. `core/src/wizard/` gained `compile.ts`, `bindings.ts` and
`components/` (structure, content, accents, style, context).

Two compile paths exist on purpose. `compileDocument` is **strict** — it lints
and throws `WzdCompileError` on any error-severity diagnostic, and refuses a
theme missing a token the library needs. That is what the render pipeline calls.
`compile`/`compileSource` **never refuse**: an unknown component renders as
nothing, an `<Image>` with no `src` renders as nothing, and an unresolvable
`{binding}` stays on the slide as written so the author sees `{date}` rather
than a gap. That is what the live preview calls, because errors are the normal
state mid-keystroke.

The compile is **browser-safe** — no `node:` built-ins, no `import.meta.url` —
so brief 59 runs the identical code in the preview and pairs it with the
existing `resolveStyle`. That is what makes the "no second copy of style
resolution" requirement achievable rather than aspirational.

The token invariant is enforced by exported production code, not a test helper:
`unthemedStyleValues(nodes, theme)` returns any length, colour or font that is
not a theme token, and the acceptance test asserts `[]` across all 45 prop
combinations of every component.

A twelfth lint rule, `unknown-binding`, was added here — brief 54 required
unresolved bindings to be an error and 53 had shipped eleven rules without one.

**Finding for brief 61.** `warm-industrial` ships only six typography tokens, so
`Heading` resolves to `display` at *both* `lg` and `xl`, and `Stat` collides
across `md`/`lg`/`xl`. Two different sizes in the markup produce identical
output. The compiler is purely token-driven, so a richer ramp in the theme fixes
it without touching this code. The theme's scale is also web-sized (body copy at
16–18px), which is small for a 1080² canvas.
