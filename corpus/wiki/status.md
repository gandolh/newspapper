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

Fifteen briefs in [`../briefs/todo/`](../briefs/todo/), in dependency waves.
Each is self-contained — open only the one directing your work.

Waves below are the **executed** order, which differs from the originally filed
one: file-ownership collisions the dependency graph alone did not show forced
several briefs apart. `core/src/types.ts` is claimed by both 51 and 52,
`core/src/index.ts` by 51, 53 and 58, `.env.example` by 55 and 56, and the
nav/sidebar by 58, 62 and 64.

```
51 → 52‖53 → 54‖55‖56‖60 → 57‖58‖61 → 59‖65 → 62 → 64 → 63
```

| Wave | # | Brief | Depends on |
|---|---|---|---|
| 1 | 51 | Strip the AI surface — **done** | — |
| 2 | 52 | SQLite schema for authored posts — **done** | — |
| 2 | 53 | Wizard parser, formatter, linter — **done** | — |
| 3 | 54 | Component library + compile to `TNode` — **done** | 53 |
| 3 | 55 | Single-account authentication — **done** | 52 |
| 3 | 56 | Image uploads + Sharp pipeline — **done** | 52 |
| 3 | 60 | Keyword RSS + article library — **done** | 52 |
| 4 | 57 | Render to JPEG + optimize on publish — **done** | 56 |
| 4 | 58 | Retire templates and `/builder` — **done** | 54 |
| 4 | 61 | Themes 2 and 3 — **done** | 54 |
| 5 | 59 | The split-screen editor | 53, 54, 58 |
| 6 | 62 | API surface and page map | 55, 59, 60 |
| 7 | 64 | Rebuild the app chrome as The Mechanical | 59, 62 |
| 5 | 65 | Finish the theme family — ramp, rename, guard | 61 |
| 8 | 63 | Documentation pass | everything |

Three ordering constraints that will bite if ignored: **58 must not start
before 54 lands** (until the component library renders, the templates are the
only thing that renders at all); **64 runs after 59 and 62**, because the
editor's structure is what the world has to clothe; and **63 runs last**, when
the code it describes exists.

The 13 v3 briefs are archived in [`../briefs/done/`](../briefs/done/) —
historical, and written against a product that no longer exists.
