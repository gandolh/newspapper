---
summary: Who Newspapper is for, what it is for, the brand personality (The Mechanical), the anti-references it is defined against, and the six design principles. The register, not the implementation.
updated: 2026-08-31
---

# Product

_Rewritten 2026-08-27, against the Wizard pivot. Brand personality filled in the
same day when the owner chose **The Mechanical** from the direction round; the
full system is [design.md](./design.md) and
[design-components.md](./design-components.md). Moved from the repo root into
the corpus on 2026-08-31; re-checked against the shipped code the same day, and
everything it claimed was true._

## Register

product

## Users

One person — technical, running Newspapper locally on their own desktop, behind
their own username and password. They are **authoring**, not browsing: they open
a post, write it, look at it, and publish it when it is ready. They do this
often enough that fluency matters more than guidance, and they are the only
person who will ever see this interface.

Not multi-tenant. Not mobile. Not a first-run experience that needs explaining
twice.

## Product Purpose

Turn a story into an Instagram slide post — a set of 1080×1080 JPEGs plus a
caption — by writing it as **Newspapper Wizard** markup and watching it set.

The person writes the words; no model does. Posts are authored in a split-screen
editor: source on one side, the live 1080 canvas on the other, an inspector and
component palette alongside. The markup is the source of truth; the visual panes
are views of it. Because props are constrained to the theme's own scales and
there is no raw CSS field, a post is on-brand by construction.

Success = the post that comes out looks hand-made and deliberate, and the person
never had to fight the tool to get there. RSS scraping still exists, but as a
**library of source material** to write from, not a pipeline that produces a post.

## Brand Personality

**The paste-up board.** Newspapper is a layout artist's board: a non-photo blue
grid printed under everything, the slide pasted down inside crop marks with a
register target at each corner, the markup waxed on beside it as a galley, and
the notes on a tissue overlay hinged over the work. Three words: **flat,
marked, square.**

- **Flat** — zero radius anywhere, two shadows only, both describing a physical
  relationship (waxed down; hinged).
- **Marked** — state is carried by a production mark, never a coloured badge.
  Rubylith means held out. Wax means selected. A stamp means published. A folded
  tissue corner means draft.
- **Square** — one 26px grid governs every surface at every breakpoint, and it
  never carries information, only alignment.

Two constraints the world exists to satisfy:

- **The slide theme is not the app.** The rendered 1080² output stays
  `warm-industrial` — terracotta `#a2391a` on warm off-white `#fbf9f8`, Inter
  400–900 — and has since gained its two sibling palettes
  ([design-systems.md](./design-systems.md)). It appears in exactly one place: on
  paper, inside crop marks, as the thing being made. The chrome is board,
  graphite and marks, in Archivo. Keeping Inter out of the chrome is what keeps
  the artwork legible as artwork.
- **This is an Operate surface.** Expression may never obscure the task, the
  state, or a familiar affordance. Brand lives in precise details — a register
  target, a leader line with a real number on it — not in ornament laid over the
  work.

Chosen over three alternates on 2026-08-27: The Forme (letterpress lock-up), The
Wire Desk (teleprinter fanfold), Page 101 (broadcast teletext). What that
decision knowingly accepts is in [design.md](./design.md),
[design-components.md](./design-components.md) and [the log](../log.md).

## Anti-references

- **The VS Code clone.** Grey chrome, blue accent, tab bar, file-tree icons.
  Every markup-plus-preview tool ships this, and shipping it again means the
  visual question was never asked.
- **The warm-cream editorial SaaS.** Cream ground, serif display, terracotta
  accent, an eyebrow label above every section. This is the incumbent *and* the
  default any careful redesign lands on. Double-excluded.
- **The literal broadsheet.** Masthead, hairline rules, Didone display, because
  the product is called Newspapper. Naming the thing is not designing it.
- **Motion as decoration.** Scattered hover effects and entrance animations on
  every panel. One authored moment per surface, or none.
- **The board wearing a costume.** A rounded corner, a soft ambient shadow, a
  coloured status pill — any one of these turns this into a generic dashboard
  with production marks sprinkled on top, which is worse than either.
- Narrow content marooned in empty space. This is a workstation; use the width.

## Design Principles

1. **The editor is the product.** Everything else — the post library, the
   article library, settings — is support. Judge a direction on the editor
   screen, not on a marketing shot.
2. **The markup is the truth, and the panes agree.** The preview must never show
   something the renderer would refuse; an unknown token surfaces as a visible
   warning on the node, not a silent fallback.
3. **Constrained by construction.** Props select from a scale. There is no
   "advanced" escape hatch, and adding one is a regression, not a feature.
4. **Every state is designed** — loading, empty, error, lint finding, selected,
   draft, published. No happy-path-only screens.
5. **Deliberate density.** A working surface may be information-dense. Padding
   everything to a narrow column is not calm, it is evasion.
6. **One motion moment.** Motion belongs to the compile — typed source becoming
   a set slide — and to nothing else. The canvas itself never moves.

## Accessibility & Inclusion

WCAG 2.2 AA as the floor for the operator's own use: body text ≥4.5:1,
placeholder text included; visible focus rings on every control; a keyboard path
through authoring, selection, and publishing that never requires the pointer;
and a `prefers-reduced-motion` alternative for every animation.

State is never carried by color alone — a lint severity, a draft/published
status, or a selected node must also read as shape, mark, or position.
