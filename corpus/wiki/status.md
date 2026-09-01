---
summary: Dated snapshot — the Wizard rebuild is complete and documented, gates green at 657 tests across 46 files, plus the six known strays left in the tree and the two questions still open.
updated: 2026-09-01
---

# Status

_Snapshot: 2026-08-31. Branch `wizard-rebuild`, not yet merged to `main`._

> **Twenty-one of the twenty-two Wizard-rebuild briefs are in
> [`../briefs/done/`](../briefs/done/); the twenty-second is 63, this
> documentation pass, and it lands with the commit that carries this line.**
> The final gate is verified green:
> `npm run build` (which runs `fmt:check`, then typechecks all three
> workspaces), **657 tests across 46 files**, `npm run lint` over all three
> workspaces, and `bash corpus/lint.sh`.

## Where things stand

The pivot has landed and the documentation has caught up with it. Newspapper no
longer generates copy with a model; a post is authored as a
[Newspapper Wizard](./markup.md) document in a split-screen editor and compiled
to JPEG slides. The `.wzd` language, its compiler, the editor, auth, uploads,
the article library, JPEG output and the three-theme family are all built and
tested. The chrome is The Mechanical on every route, the rendered JPEG is set in
Inter, and the UI is a plain Vite + React SPA — Astro was removed once it was
clear that every page was fully hydrated behind auth, so nothing it offered was
in use.

Brief 63 (this pass) rewrote the root `README.md` and `CLAUDE.md`, moved
`PRODUCT.md` and `DESIGN.md` into the corpus, and reconciled every descriptive
wiki page with the shipped code. The wiki no longer describes Ollama, compose,
the template system, `/builder`, PNG output, the four-step wizard or Astro as
anything but history.

## The thread worth reading first

[green-because-nothing-ran.md](./green-because-nothing-ran.md) — nine times a
tool in this repo reported success while reaching nothing. A DB path the tests
set but nothing read; a `.gitignore` rule that would have hidden a module; a
vitest `include` omitting `ui/`; a workspace bundled but never typechecked; a
formatter with no config; a test control that collapsed into its subject; an
ESLint config with **zero rules enabled**; and a test whose import resolved only
through a hoisted optional dependency.

Most of this project's real defects were not in the code. They were in the
things that were supposed to be checking it.

## What the pivot removed

Compose and the whole Ollama client · the `/prompt` page and `data/prompt.md` ·
slide-level AI · generated captions · `TemplateDoc`, the nine template JSON
files, the registry, and `/builder` · PNG output · the four-step wizard ·
Astro.

## What it added

The `.wzd` language, its parser, formatter, and linter · a split-screen editor
(source · preview · inspector + component palette) · a fixed semantic component
library · image upload and processing via Sharp · username/password auth ·
keyword-filtered RSS with a saved-article library · `draft`/`published` states ·
two more themes · The Mechanical · a hand-rolled router.

## What carried over untouched

`TNode` and the template interpreter (now a compile target, not an authoring
surface) · the theme token system · Playwright Chromium rendering · SQLite
storage · the npm workspace layout · the shared UI primitives on Base UI.

## Known strays

Found while writing the docs, and **all but two are now resolved.** Deleted
2026-08-31: a v2/v3 build-plan tree, an Ollama-only compose file, a root
`tsconfig.json` extended by nothing and pointing at a root `src/` that held no
files, and the resolved resume document. Brief 73 then took the code half —
`loadConfig()` and its seven inert variables, and `api`'s unrunnable `start`
script.

What is left is genuinely benign:

| Stray | What it is |
|---|---|
| `api/src/server.ts` | The SPA fallback still tries a per-route `index.html` first and its comment names a build that is gone. Harmless — the root `index.html` fallback is what serves. |
| `data/sources.json` | v2 residue: a one-time seed for the `sources` table. Nothing reads it afterwards. |

## Briefs

Twenty-six Wizard-rebuild briefs (51–76) are in
[`../briefs/done/`](../briefs/done/) with an outcome note each, alongside the
thirteen v3 ones. **Nothing is open.** Each brief is self-contained: open only
the one directing your work.

Waves below are the **executed** order, which differs from the originally filed
one: file-ownership collisions the dependency graph alone did not show forced
several briefs apart. `core/src/types.ts` was claimed by both 51 and 52,
`core/src/index.ts` by 51, 53 and 58, `.env.example` by 55 and 56, and the
nav/sidebar by 58, 62 and 64.

```
51 → 52‖53 → 54‖55‖56‖60 → 57‖58‖61 → 59‖65 → 62 → 64 → 68‖71 → 70‖72 → 63
```

| Wave | # | Brief | Depends on |
|---|---|---|---|
| 1 | 51 | Strip the AI surface | — |
| 2 | 52 | SQLite schema for authored posts | — |
| 2 | 53 | Wizard parser, formatter, linter | — |
| 3 | 54 | Component library + compile to `TNode` | 53 |
| 3 | 55 | Single-account authentication | 52 |
| 3 | 56 | Image uploads + Sharp pipeline | 52 |
| 3 | 60 | Keyword RSS + article library | 52 |
| 4 | 57 | Render to JPEG + optimize on publish | 56 |
| 4 | 58 | Retire templates and `/builder` | 54 |
| 4 | 61 | Themes 2 and 3 | 54 |
| 5 | 59 | The split-screen editor | 53, 54, 58 |
| 5 | 65 | Finish the theme family — ramp, rename, guard | 61 |
| 6 | 62 | API surface and page map | 55, 59, 60 |
| 7 | 64 | Rebuild the app chrome as The Mechanical | 59, 62 |
| 7 | 66 | Fix the render typeface | — |
| 8 | 67 | The slide's font fallback stack | 66 |
| 8 | 69 | Two loose ends in `ui/` | 64 |
| 9 | 68 | `fmt` and `lint` cover what they claim | — |
| 9 | 71 | The typeface guard's control; escaping style values | 67 |
| 10 | 70 | Replace Astro with Vite + React | 68, 69 |
| 10 | 72 | The React effect findings 68 suppressed | 68 |
| 11 | 63 | Documentation pass | everything |

Three ordering constraints, recorded because they would have bitten: **58 could
not start before 54 landed** (until the component library rendered, the
templates were the only thing that rendered at all); **64 ran after 59 and 62**,
because the editor's structure is what the world had to clothe; and **63 ran
last**, when the code it describes existed — which also meant after **70**,
since documenting Astro immediately before removing it would have wasted the
pass.

The 13 v3 briefs are also archived in [`../briefs/done/`](../briefs/done/) —
historical, and written against a product that no longer exists.

## What is not done

- The branch is not merged and nothing has been pushed.
- Two things remain open: [open-questions.md](./open-questions.md).
- The strays above.
