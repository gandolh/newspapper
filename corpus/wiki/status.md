---
summary: Dated snapshot — the Wizard rebuild is fifteen of sixteen briefs in; only the documentation pass remains, plus three briefs filed from findings.
updated: 2026-08-31
---

# Status

_Snapshot: 2026-08-31_

> **Fifteen of sixteen briefs are done** on branch `wizard-rebuild`. The
> wave-7 gate is verified green there: `npm run build`, **637 tests**,
> `npm run lint`, `npx tsc -p ui --noEmit` (0 errors) and `corpus/lint.sh`.
> Of the original backlog only **63** (the documentation pass) is left. Also
> open: **70**, replacing Astro with Vite + React (owner's request), and **72**,
> the ten React effect findings brief 68 had to suppress.

**Where things stand.** The pivot has landed. Newspapper no longer generates
copy with a model; a post is authored as a [Newspapper Wizard](./markup.md)
document in a split-screen editor and compiled to JPEG slides. The `.wzd`
language, its compiler, the editor, auth, uploads, the article library, JPEG
output and the three-theme family are all built and tested. The chrome is
The Mechanical on every route, and the rendered JPEG is finally set in Inter.
What is left is the documentation, which still describes a product two versions
behind.

The descriptive wiki pages — [api.md](./api.md), [modules.md](./modules.md),
[dependencies.md](./dependencies.md), [modules.md](./modules.md),
[design-systems.md](./design-systems.md) and the new [chrome.md](./chrome.md) —
were rewritten as the work landed and are accurate.
[architecture.md](./architecture.md) and [data.md](./data.md) are brief 63's job
to reconcile.

## The design round — closed

The app chrome is being replaced alongside the code, and the world is settled:
**The Mechanical**, a paste-up board. Two rounds ran on 2026-08-27, both drawn
as complete editor screens rather than described; the owner chose it and it was
then raised by five donations from the declined hand. `DESIGN.md` is rewritten
from the approved comps, `PRODUCT.md` carries the register, and the rebuild is
[brief 64](../briefs/done/64-workstation-chrome.md), which shipped on
2026-08-31. The chrome as built is [chrome.md](./chrome.md).

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

Three briefs remain in [`../briefs/todo/`](../briefs/todo/): **70** (replace
Astro with Vite + React, requested by the owner on 2026-08-31), **72** (the
React effect findings), and **63** (the documentation pass, which runs last).
Nineteen are in [`../briefs/done/`](../briefs/done/) with an outcome note each.
Each brief is self-contained — open only the one directing your work.

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
| 5 | 59 | The split-screen editor — **done** | 53, 54, 58 |
| 6 | 62 | API surface and page map — **done** | 55, 59, 60 |
| 7 | 64 | Rebuild the app chrome as The Mechanical — **done** | 59, 62 |
| 5 | 65 | Finish the theme family — ramp, rename, guard — **done** | 61 |
| 7 | 66 | Fix the render typeface — **done** | — |
| 8 | 67 | The slide's font fallback stack — **done** | 66 |
| 8 | 69 | Two loose ends in `ui/` — **done** | 64 |
| 9 | 68 | `fmt` and `lint` cover what they claim — **done** | — |
| 9 | 71 | The typeface guard's control; escaping style values — **done** | 67 |
| 10 | 70 | Replace Astro with Vite + React | 68, 69 |
| 10 | 72 | The React effect findings 68 suppressed | 68 |
| 11 | 63 | Documentation pass | everything |

Three ordering constraints that will bite if ignored: **58 must not start
before 54 lands** (until the component library renders, the templates are the
only thing that renders at all); **64 runs after 59 and 62**, because the
editor's structure is what the world has to clothe; and **63 runs last**, when
the code it describes exists — which now also means after **70**, since
documenting Astro immediately before removing it would waste the pass.

The 13 v3 briefs are archived in [`../briefs/done/`](../briefs/done/) —
historical, and written against a product that no longer exists.
