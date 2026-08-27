---
summary: Dated snapshot — v3 shipped and is now being deliberately dismantled; the Wizzard rebuild is specced but not started.
updated: 2026-08-27
---

# Status

_Snapshot: 2026-08-27_

**Where things stand.** v3 is complete, verified, and **being replaced**. A
grilling session on 2026-08-27 pivoted the product: Newspapper no longer
generates copy with a model, and posts are now authored as
[Newspapper Wizzard](./markup.md) documents in a split-screen editor. The design
is settled end to end — see [decisions.md](./decisions.md) — and **no code has
been written against it yet**. No briefs are filed.

The v3 code still runs. Treat the descriptive wiki pages
([architecture.md](./architecture.md), [api.md](./api.md), [data.md](./data.md),
[modules.md](./modules.md), [design-systems.md](./design-systems.md)) as
accurate for *what exists today* and superseded in intent by
[decisions.md](./decisions.md). They get rewritten as the work lands, not before.

## What the pivot removes

Compose and the whole Ollama client · the `/prompt` page and `data/prompt.md` ·
slide-level AI · generated captions · `TemplateDoc`, the nine template JSON
files, the registry, and `/builder` · PNG output · the four-step wizard's
scrape and compose steps.

## What the pivot adds

The `.wzd` language, its parser, formatter, and linter · a split-screen editor
(source · preview · inspector + component palette) · a fixed semantic component
library · image upload and processing via Sharp · username/password auth ·
keyword-filtered RSS with a saved-article library · `draft`/`published` states ·
two more themes.

## What carries over untouched

`TNode` and the template interpreter (now a compile target, not an authoring
surface) · the theme token system · Playwright Chromium rendering · SQLite
storage · the npm workspace layout · the shared UI primitives on Base UI.

## Briefs

Nothing in [`../briefs/todo/`](../briefs/todo/). The 13 v3 briefs are archived in
[`../briefs/done/`](../briefs/done/) — historical, and written against a product
that no longer exists.
