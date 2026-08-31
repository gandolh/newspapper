---
summary: The locked product calls — no LLM, human-centred editing, the Wizard markup and its semantic component model, images, and where it runs.
updated: 2026-08-28
---

# Decisions — product

What Newspapper *is*, and the calls not to be reopened casually. Each was
expensive to reverse, is surprising without context, or had a real alternative
that lost. **Don't relitigate one without an explicit revisit and a
[log.md](../log.md) entry.** This page wins over [status.md](./status.md) for any
choice not formally revisited. How the language actually works:
[markup.md](./markup.md). Engineering calls:
[decisions-engineering.md](./decisions-engineering.md).

Reasons marked _(reconstructed)_ were recovered from `log.md` and git history
rather than recorded at the time.

## No LLM in the product
_2026-08-27_ — Newspapper does not call a language model. A person writes the
words. Two reasons, the second load-bearing: the models available to this project
could not hold the structured output at all; and what they did
produce **read as AI-generated** — fake, unattractive, the opposite of what a
hand-made daily post is for. That second one no amount of compute fixes on this
budget, so the feature isn't worth having even working.
Rejected: local Ollama (the v3 design) and Ollama Cloud (intended, never wired
up). Supersedes "Ollama is the only LLM backend" (2026-05-12) and everything
downstream — system prompt, slide AI, generated caption, Ollama settings.

## The human is in the loop by design
_2026-08-27_ — The workflow is built *around* a person editing; the editor is
the product's centre of gravity. Reverses "no human-in-the-loop", which always
contradicted the shipped product. Approval gates remain rejected — no step
blocks for a verdict. The distinction is vocabulary, not policy: see **editing**
vs **approval gate** in [glossary.md](./glossary.md).

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

## A theme varies the components — there are no presets
_2026-08-27_ — Variation comes from the theme (colors, typography, spacing)
applied to a fixed, built-in component set. **Three themes ship** —
`warm-industrial-1`, `-2`, `-3` — sharing type, spacing, and shape tokens and
differing mainly in primary color. A family, not three designs.
Rejected: shipping preset layouts to drop in and edit (they multiply the surface
and let each post drift further from the last); one theme (monotonous across a
daily feed); a full theme editor (its own feature, and the component library
needs the attention first).

## The workstation is redesigned; the slide theme is not
_2026-08-27_ — Two design systems live in this repo and only one of them
changes. The **slide theme** (`warm-industrial`, terracotta on warm off-white,
Inter 400–900) is what the renderer paints into the 1080² JPEG; it carries over
untouched and gains two sibling palettes. The **app chrome** — the workstation
the operator sits in — is replaced outright, because it was designed around a
four-step pipeline that no longer exists, and its signature components (the
stepper, the wizard shell, the builder toolbar) have nothing left to describe.
Rejected: polishing the incumbent chrome, which would spend effort making a
wizard look better at being a wizard.

**The world is The Mechanical** — a paste-up board: a 26px non-photo blue grid
under everything, the slide inside crop marks and register targets, the markup
waxed on as a galley, the inspector on a tissue overlay that hinges off the
canvas. Zero radius anywhere; state is a **mark** (rubylith, wax, stamp, tissue
corner, hatch), never a coloured badge. Chosen 2026-08-27 from two rounds of
fully-drawn editor screens, over The Forme (letterpress lock-up), The Wire Desk
(teleprinter fanfold) and Page 101 (broadcast teletext). The system is
[`DESIGN.md`](../../DESIGN.md); the build is
[brief 64](../briefs/done/64-workstation-chrome.md).

Two consequences worth stating separately, because they are the parts most
likely to be quietly undone: the chrome face is **Archivo**, and **Inter never
appears in the chrome** — it is the artwork's voice, and that separation is what
keeps the slide legible as a made thing. And a board has no rounded corners:
`border-radius` is `0` throughout.

## The template system is removed
_2026-08-27_ — `TemplateDoc`, the nine template JSON files, the registry, and
the `/builder` page are deleted. Layout authoring is not a user activity.
Supersedes "templates are JSON documents, not code" (2026-06-10), whose whole
purpose was to let a builder read and write layouts. The builder's machinery —
canvas, tree panel, token-aware inspector, undo/redo — is not wasted: it becomes
the post editor. The old templates survive as reference for designing the
built-in components.

## Build the editor; borrow Puck's data model
_2026-08-27_ — Newspapper implements its own editor rather than adopting
[Puck](https://github.com/puckeditor/puck) (MIT, and close to exactly this).
Rejected: depending on Puck — its `<Render>` is React while this pipeline
renders server-side HTML for a Chromium screenshot, and its component-config API
is far larger than a fixed component library needs. Borrowed instead: its data
model, `{ type, props }` per node with children as an inline array in a slot
prop, which maps onto the existing `payload` column.

## Sharp is allowed, for images only
_2026-08-27_ — `sharp` may be added. It normalizes uploads (resize, strip EXIF)
and runs the optimization pass on publish. Originals are kept alongside the
normalized copy. Uploads live in `uploads/` — gitignored, with an
env-overridable absolute path so the store can sit outside the repo.
This **reverses** a standing ban: Sharp was forbidden from v2, when the project
had no image support and the rule existed to stop a heavyweight native
dependency creeping in for nothing. Images are now a first-class component, so
the reason is gone. The ban on the rest of that list stands.

## Output is JPEG, not PNG
_2026-08-27_ — Rendered slides are JPEG. No PNGs are kept.
Rejected: PNG (the format since v1) and keeping both. PNG is lossless and
therefore kind to text-heavy slides, but the files are far larger and Instagram
re-encodes everything on upload anyway — so the fidelity is spent for nothing.
One artifact per slide, no format to choose at export.

## Publishing is a manual state that optimizes the output
_2026-08-27_ — A post is `draft` until a person marks it `published`, meaning
*ready to post*. Publishing runs the optimization pass over the rendered images.
Rejected: deriving the state from whether the post was rendered or exported,
which is what today's `'draft' | 'rendered'` status does. The app cannot know
whether something reached Instagram; only the person can say it's ready.

## Posts are titled and unlimited, not one per day
_2026-08-27_ — A post is identified by its **title**; make as many in a day as
you like. SQLite tracks title, description, datetime, and keywords.
Supersedes "one post per day" (2026-05-18), which only made sense when the input
was *today's* feed. The date survives as a label and in the output path, not as
an identity or a limit. Still rejected from that same call: entity extraction,
clustering, and per-topic splitting.

## Access is behind a single account
_2026-08-27_ — Newspapper requires a username and password. One account, one
person.
Rejected: no auth at all (the v3 assumption baked into `PRODUCT.md`). Still
rejected: multi-tenancy, roles, and user management — an authenticated app is
not the same thing as a multi-user one, and this stays single-user.

## Headless Chromium renders the slides
_2026-06-10_ — Components compile to HTML, which Playwright Chromium screenshots
at 1080×1080.
Rejected: Satori + resvg (the v2 renderer) and `@napi-rs/canvas` (v1). Satori
implements a subset of flexbox and no real CSS cascade, which capped how
expressive a layout could be — and expressive layout is the product. The cost is
a ~300MB browser download, accepted deliberately, and the reason Playwright is
the one heavyweight dependency allowed.

## Keyword matching is case-insensitive OR substring over title + body
_2026-08-28_ — A search matches an article when **any** supplied keyword
appears as a **case-insensitive substring** anywhere in its title or body;
results rank by total match count (occurrences summed across all keywords, all
fields). No fuzzy matching, no word-boundary requirement.
- **Title + body, not title-only**: the keyword a person cares about is usually
  in the copy, not just the headline — title-only would miss most of what
  they're looking for.
- **OR, not AND**: a person hunting news gives a few related terms and wants
  broad recall (`budget, tax, economy`); requiring every term would turn a
  three-keyword search into one that almost nothing survives.
- **Plain substring, not word-boundary**: `tax` should catch `taxes` and
  `taxation` — that's the whole point of typing a bare root rather than a full
  word, and word-boundary matching would silently defeat it.
- **Case-insensitive**: nobody typing a keyword box thinks about capitalization,
  and there's no case where matching should fail because of it.
Rejected: fuzzy/edit-distance matching (unpredictable — a person filtering
today's news wants to know exactly why a result showed up) and AND semantics
(too narrow for a handful of loosely related keywords).
