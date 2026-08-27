---
summary: Newspapper Wizard (.wzd) — the JSX-like markup a post is written in: document shape, the component catalogue, the props model, and how it compiles to images.
updated: 2026-08-27
---

# Newspapper Wizard (`.wzd`)

The markup a post is written in. Designed to be typed comfortably by a person
**and** emitted reliably by a language model — which is what a person pastes
from, now that [the app itself calls no model](./decisions.md#no-llm-in-the-product).

A `.wzd` file is the **source of truth** for a post. Everything else — the
compiled tree, the rendered images, the SQLite metadata columns — is derived.

## Document shape

Two top-level elements, mirroring HTML on purpose so the structure is instantly
readable:

```wzd
<head>
  <title>Three Things About the Budget</title>
  <description>What actually changed, minus the spin.</description>
  <keywords>budget, economy, tax</keywords>
  <date>2026-08-27</date>
  <caption>The budget dropped. Here's what actually moved.</caption>
  <hashtags>#news #budget #economy</hashtags>
</head>

<body>
  <Slide>
    <Kicker>Economy</Kicker>
    <Heading size="xl">Three things about the budget</Heading>
  </Slide>

  <Slide>
    <Heading>What changed</Heading>
    <List>
      <Item>Fuel duty frozen, again</Item>
      <Item>Income tax thresholds held flat</Item>
    </List>
    <PageCounter />
  </Slide>
</body>
```

**Casing carries meaning.** Lowercase tags (`head`, `body`, `title`) are
document structure and metadata — they declare, they never draw. Capitalized
tags (`Slide`, `Heading`) are rendering components. You can tell what a line
does without knowing the catalogue.

`<head>` owns everything about the post that isn't a slide. Its values are both
the post's metadata *and* a data store the renderer reads — `<date>` is what
`{date}` resolves to on a slide. SQLite columns are derived from `<head>` on
save, purely as an index for the posts list and search.

## Component catalogue

| Group | Components | Notes |
|---|---|---|
| Structure | `Slide` `Stack` `Row` | `Slide` is one image. `Stack` flows children vertically; `Row` splits horizontally (this is how two-column comparison happens). |
| Content | `Heading` `Text` `List`/`Item` `Quote` `Stat` `Image` | The words. `Quote` carries its attribution; `Stat` is a big number with a label. |
| Accents | `Kicker` `Divider` `Spacer` `Source` | Small furniture — the eyebrow label, rules, breathing room, attribution line. |
| Generated | `PageCounter` | Renders `2/5`. The renderer fills in both numbers; the author never types them. |

The set is **fixed and built in**. Users do not author components or layouts —
[that's what the theme is for](./decisions.md#a-theme-varies-the-components--there-are-no-presets).

## Props

The rule is **no prop ever carries a style value**. There is deliberately **no
raw CSS escape hatch** — a `style` or `class` prop would be the one line that
lets any post drift off-brand, and design consistency is the whole reason this
project stopped generating its copy with a model. A test asserts no such prop
exists anywhere in the catalogue.

Two kinds of prop satisfy that rule:

- **Scale props** select from a named scale: `size` (`xs sm md lg xl`), `align`
  (`left center right`), `emphasis` (`muted normal strong`). Defaults are
  `size="md"`, `align="left"`, `emphasis="normal"`. These are the only enums,
  and they mean the same thing on every component that takes them.
- **Content props** carry text the slide has to show but that has nowhere else
  to live: `Image.src` (**required**), `Image.alt`, `Quote.by`, `Stat.label`.
  Nothing else takes free text.

The content props are not a loophole — they are content, not styling, and the
catalogue already implied them (`Quote` carries its attribution; `Stat` is a big
number with a label; an `<Image>` with no `src` cannot compile at all). An
earlier draft of this page said props take "a value from a named scale or a
short enum", which was over-broad; the invariant is the *no style value* rule
above.

Invalid prop values are a **lint error**, not a silent fallback. So is a missing
required prop, and so is the same prop written twice (the first value wins, and
the linter says so).

## How it compiles

```
.wzd text  →  parse  →  semantic tree  →  TNode  →  HTML  →  Chromium  →  JPEG
```

`TNode` — the `box`/`text`/`repeat` tree with `$token` styles that predates this
design — survives as the **compile target**. The interpreter, the theme token
system, and the Chromium renderer carry over unchanged; what changed is that
nobody authors `TNode` by hand any more.

Output is [JPEG, not PNG](./decisions.md#output-is-jpeg-not-png), at 1080×1080.

## Syntax details

Settled while building the parser, and worth knowing before you write a
document by hand:

- **Comments are `<!-- ... -->`**, HTML-style, not JSX's `{/* ... */}`. The
  document already mirrors HTML, and `{` is reserved for bindings. A pasted
  `{/* ... */}` parses as literal text.
- **There are no escapes and no entities.** A prop value is delimited by `"` or
  `'`; to include one, use the other. A value containing *both* cannot be
  written in `.wzd` at all — the linter reports it, because the visual editor
  can produce one programmatically even though a person cannot type it.
- **`<` cannot appear in text.** `>` and `&` can.
- **The parser is catalogue-independent** — a pure syntax pass. It does not
  auto-close void components, so `<Divider>` without the slash reports "never
  closed" rather than silently closing. This lets the catalogue change without
  touching the parser.
- **CRLF and a BOM are normalized on parse.** Source offsets index into the
  normalized text, which the parser returns alongside the tree.
- **Whitespace-only text is dropped**, but a blank line survives as a flag on
  the node after it, so grouping you type is grouping the formatter reproduces.

## Formatter and linter

Wizard has a canonical printed form, the way JSX does under Prettier. The
**visual editor writes through the formatter** — dragging a component in
produces exactly the text a person would have typed, so the source pane never
looks machine-generated. A manual format-and-lint action is available too.

The formatter owns whitespace; the linter owns meaning. Twelve rules ship:
`syntax-error`, `unknown-component`, `unknown-prop`, `invalid-prop-value`,
`missing-prop`, `duplicate-prop`, `misplaced-element`, `missing-head`,
`missing-title`, `empty-slide`, `slide-count`, `unknown-binding`. All are errors
except `slide-count` above the maximum, which is a warning.

`unknown-binding` fires when `{something}` in text names anything other than one
of the six `<head>` fields, or names a field the head leaves empty. Bindings
resolve in **text content only**, never in prop values — that is the one place
the linter can see them.

Concretely, the formatter's canonical form: LF only, trailing newline, 2-space
indent, one blank line between top-level nodes, an element with no children
printed self-closing, an element whose only child is text printed on one line
when it fits the print width. **Text is never wrapped** — wrapping is the
classic source of formatter non-idempotency and buys little on a 1080² slide.
`format(format(x))` equals `format(x)`, and `parse(format(x))` is structurally
equal to `parse(x)`. Formatting source that does not parse returns it unchanged
rather than mangling it.

Author formatting is **not** preserved across visual edits; see
[the decision](./decisions.md#format-and-lint-the-markup-like-jsx) for why
surgical round-tripping was rejected.

## Images

`<Image>` references an upload. Originals are kept; Sharp derives a normalized
copy on upload and runs the optimization pass when a post is
[published](./decisions.md#publishing-is-a-manual-state-that-optimizes-the-output).
Files live in `uploads/` — gitignored, with an env-overridable absolute path so
the store can sit outside the repo.
