---
summary: Newspapper Wizzard (.wzd) — the JSX-like markup a post is written in: document shape, the component catalogue, the props model, and how it compiles to images.
updated: 2026-08-27
---

# Newspapper Wizzard (`.wzd`)

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

Props are **constrained**: each takes a value from a named scale or a short
enum — `size="lg"`, `align="center"`, `emphasis="strong"`. They select from the
theme; they never carry a style value.

There is deliberately **no raw CSS escape hatch**. A `style` prop would be the
one line that lets any post drift off-brand, and design consistency is the whole
reason this project stopped generating its copy with a model.

Invalid prop values are a **lint error**, not a silent fallback.

## How it compiles

```
.wzd text  →  parse  →  semantic tree  →  TNode  →  HTML  →  Chromium  →  JPEG
```

`TNode` — the `box`/`text`/`repeat` tree with `$token` styles that predates this
design — survives as the **compile target**. The interpreter, the theme token
system, and the Chromium renderer carry over unchanged; what changed is that
nobody authors `TNode` by hand any more.

Output is [JPEG, not PNG](./decisions.md#output-is-jpeg-not-png), at 1080×1080.

## Formatter and linter

Wizzard has a canonical printed form, the way JSX does under Prettier. The
**visual editor writes through the formatter** — dragging a component in
produces exactly the text a person would have typed, so the source pane never
looks machine-generated. A manual format-and-lint action is available too.

The formatter owns whitespace; the linter owns meaning:

- unknown component or unknown prop
- a prop value outside its scale
- a malformed document — `Item` outside a `List`, content outside `<body>`
- slide-count and other structural bounds

Author formatting is **not** preserved across visual edits; see
[the decision](./decisions.md#format-and-lint-the-markup-like-jsx) for why
surgical round-tripping was rejected.

## Images

`<Image>` references an upload. Originals are kept; Sharp derives a normalized
copy on upload and runs the optimization pass when a post is
[published](./decisions.md#publishing-is-a-manual-state-that-optimizes-the-output).
Files live in `uploads/` — gitignored, with an env-overridable absolute path so
the store can sit outside the repo.
