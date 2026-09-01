---
summary: The locked product calls — no LLM, human-centred editing, the Wizard markup and its semantic component model, images, and where it runs.
updated: 2026-09-01
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
[design.md](./design.md) + [design-components.md](./design-components.md)
(moved out of the repo-root `DESIGN.md` by brief 63); the build is
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

## A saved article is a reference, not a pipeline input

_2026-09-01_ — The article library holds source material you write **from**.
There is no action that turns one into a post, and there will not be: you read
the article and you write the document. Copy and paste is the connection, and
that is the answer rather than a gap waiting to be filled.

Rejected: `POST /api/articles/:id/start-post`, seeding a starter `.wzd` from
`Article.title` and `Article.url`. It is genuinely cheap — the API already holds
both fields, and the route would be additive rather than a redesign — which is
exactly why it kept coming back. **It was in scope in brief 60 and withdrawn at
dispatch, then left to brief 59, which also did not build it.** Twice specced,
twice dropped, and never for a reason anyone wrote down. That is what this entry
fixes.

The reason it stays unbuilt: seeding a document from an article makes the
article an *input to a pipeline*, and the pivot's whole point was that there is
no pipeline. A post is written, not derived. A `start-post` button would be the
first step back toward "generate a post from a source", which is the thing the
v4 rebuild removed — the mechanism would be a template rather than a model, but
the shape is the same, and shapes are what come back.

If retyping a title ever genuinely hurts, the smaller answer is to make the
article's title and URL easy to *copy* from the library, not to have the app
compose a document.

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
