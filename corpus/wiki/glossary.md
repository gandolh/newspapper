---
summary: The project's vocabulary — one canonical definition per term Newspapper uses in a particular way, and the synonyms each one displaces.
updated: 2026-08-27
---

# Glossary

Definitions only. If an entry starts explaining *how* something works, that
belongs on a concept page and this should link to it instead. `_Avoid_` is the
load-bearing half — it names the synonyms that would otherwise drift back in.

**Post**:
One day's output as a single unit — an ordered set of slides plus a caption and
hashtags. The thing the app produces, and one row in `posts`.
_Avoid_: carousel, article, story, deck

**Slide**:
One 1080×1080 image in a post, and one `SlideBlock` in the payload. Between 2
and 8 per post.
_Avoid_: page, card, frame

**Family**:
The coarse kind of a slide — `title`, `body`, or `quote`.
_Avoid_: type, category, group

**Variant**:
The specific layout a slide uses, identified by a template id such as
`title-main` or `body-comparison`. Nine ship. A variant always belongs to one
family.
_Avoid_: template type, layout name, style

**Template** (`TemplateDoc`):
The JSON document that defines one variant — its editable fields and its node
tree. Lives in `assets/templates/<theme>/`. See [design-systems.md](./design-systems.md).
_Avoid_: layout file, component, schema

**Theme**:
A named set of design tokens — colors, typography, spacing, shapes — that
templates resolve `$token` references against. One ships: `warm-industrial`.
_Avoid_: design system (that is the broader discipline), skin, palette

**Component**:
One semantic element in a post's markup — a heading, a paragraph, a quote, an
image. Carries constrained, token-only props; never raw CSS. The component set
is fixed and built in; users don't author new ones.
_Avoid_: block, widget, element, box

**Stack**:
A component that lays its children out in flow, one after another, with a gap.
The only way layout happens — Newspapper has no absolute positioning. See
[decisions.md](./decisions.md#flow-layout-with-stacks--never-absolute-positioning).
_Avoid_: container, flex, group, div

**Prop**:
A named value on a component, constrained to a scale or an enum (`size="lg"`,
`align="center"`). Props select from the theme; they never carry style values
directly.
_Avoid_: attribute, setting, option, style

**Editing**:
A person changing a post's content inside the app — rewriting a slide, adding or
reordering slides, fixing the caption. **Expected and central**: the product is
built around it, not in spite of it. See
[decisions.md](./decisions.md#the-human-is-in-the-loop-by-design).
_Avoid_: review, human-in-the-loop (too vague — it collapses this with the next entry)

**Approval gate**:
A pipeline step that halts and waits for a yes/no verdict before continuing.
**Rejected** — Newspapper has none. Distinct from *editing*: editing changes the
work, an approval gate merely permits it.
_Avoid_: confirmation step, checkpoint, human-in-the-loop

**Render**:
Turning a finished post into PNG files via headless Chromium. Strictly the
image-production step — not composition, and not export.
_Avoid_: generate, build, export (export is zipping the result)
