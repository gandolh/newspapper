---
summary: Dated snapshot — v3 shipped and is now being deliberately dismantled; the Wizard rebuild is specced but not started.
updated: 2026-08-27
---

# Status

_Snapshot: 2026-08-27_

**Where things stand.** v3 is complete, verified, and **being replaced**. A
grilling session on 2026-08-27 pivoted the product: Newspapper no longer
generates copy with a model, and posts are now authored as
[Newspapper Wizard](./markup.md) documents in a split-screen editor. The design
is settled end to end — see [decisions.md](./decisions.md) — and **no code has
been written against it yet**. No briefs are filed.

The v3 code still runs. Treat the descriptive wiki pages
([architecture.md](./architecture.md), [api.md](./api.md), [data.md](./data.md),
[modules.md](./modules.md), [design-systems.md](./design-systems.md)) as
accurate for *what exists today* and superseded in intent by
[decisions.md](./decisions.md). They get rewritten as the work lands, not before.

## The design round — closed

The app chrome is being replaced alongside the code, and the world is settled:
**The Mechanical**, a paste-up board. Two rounds ran on 2026-08-27, both drawn
as complete editor screens rather than described; the owner chose it and it was
then raised by five donations from the declined hand. `DESIGN.md` is rewritten
from the approved comps, `PRODUCT.md` carries the register, and the rebuild is
[brief 64](../briefs/todo/64-workstation-chrome.md) — which runs *after* brief
59, since the editor's structure is what the world has to clothe.

Also settled: the slide theme is untouched and out of scope, and `animejs`
4.5.0 is the motion engine.

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

Fourteen briefs in [`../briefs/todo/`](../briefs/todo/), in dependency waves.
Each is self-contained — open only the one directing your work.

| Wave | # | Brief | Depends on |
|---|---|---|---|
| 0 | 51 | Strip the AI surface | — |
| 0 | 52 | SQLite schema for authored posts | — |
| 1 | 53 | Wizard parser, formatter, linter | — |
| 1 | 54 | Component library + compile to `TNode` | 53 |
| 1 | 55 | Single-account authentication | 52 |
| 1 | 56 | Image uploads + Sharp pipeline | 52 |
| 2 | 57 | Render to JPEG + optimize on publish | 56 |
| 2 | 58 | Retire templates and `/builder` | 54 |
| 3 | 59 | The split-screen editor | 53, 54, 58 |
| 3 | 60 | Keyword RSS + article library | 52 |
| 3 | 61 | Themes 2 and 3 | 54 |
| 3 | 62 | API surface and page map | 55, 59, 60 |
| 4 | 63 | Documentation pass | everything |
| 4 | 64 | Rebuild the app chrome as The Mechanical | 59, 62 |

Two ordering constraints that will bite if ignored: **58 must not start before
54 lands** (until the component library renders, the templates are the only
thing that renders at all), and **63 runs last**, when the code it describes
exists.

The 13 v3 briefs are archived in [`../briefs/done/`](../briefs/done/) —
historical, and written against a product that no longer exists.
