---
summary: The locked engineering calls — workspaces and ESM, pinned dependencies, SQLite, the UI's type copy, and where project knowledge lives.
updated: 2026-08-31
---

# Decisions — engineering

How the repo and the stack are put together. Product-shaping calls live in
[decisions.md](./decisions.md), and the security posture — authentication,
lockout, what is guarded and what is deliberately public — in
[decisions-security.md](./decisions-security.md). The same rules apply to all
three: don't reopen one without an explicit revisit and a
[log.md](../log.md) entry.

Reasons marked _(reconstructed)_ were recovered from `log.md` and the git
history rather than recorded at the time.

## Templates are JSON documents, not code
**Status: superseded** by [The template system is removed](./decisions.md#the-template-system-is-removed) (2026-08-27). Kept for the reasoning.

_2026-06-10_ — Each slide variant is a `TemplateDoc` JSON file in
`assets/templates/warm-industrial/`, interpreted at runtime by
`@newspapper/core`.
Rejected: React components (v2) and Handlebars (v1). _(reconstructed)_ A visual
builder has to **read and write** templates, which rules out anything that is
only executable. This is what makes `/builder` possible at all.
See [design-systems.md](./design-systems.md), [data.md](./data.md).

## The builder preview is strict, and says so
_2026-08-27_ — An unknown theme token in the builder surfaces as a visible
warning on the offending node. It neither throws (which would make a
half-finished template uneditable) nor silently renders the literal string
(which is what it did until now).
Rejected: matching core's `resolveStyle`, which throws; and the previous silent
fallback. The failure this closes: the builder would happily preview a template
that the renderer refuses, so you could design something un-renderable and only
find out at export.

## The UI workspace is typechecked, not just bundled
_2026-08-31_ — `ui` has a `typecheck` script (`tsc --noEmit`) alongside its
`astro build`, and the root `build` chain runs it.
Found because brief 59 left a dangling `import { EditorStep } from
'../editor/EditorStep'` in `ui/src/components/wizard/Wizard.tsx` and **every gate
stayed green.** `core` and `api` both build with `tsc --noEmit`; `ui` built with
`astro build` alone, which bundles from the page entry points and tree-shakes —
nothing imports `Wizard`, so the file was never reached, never typechecked, and
never complained.

Two things had to be fixed before the script could pass at all, and both were
hiding the same way: `ui/tsconfig.json` set the deprecated `baseUrl`, which
raised a **config-level** error that aborted the run before any file was
checked — so even running `tsc -p ui` by hand caught nothing; and `types` was
unset, so the eight UI test files importing `node:fs`/`node:url` could not
resolve them.

Same family as the `.gitignore` and vitest-include incidents: **green because
nothing ran.** A tool that is not reaching a file cannot report on it, and a
passing command is not evidence of coverage.

## use-gesture handles pointer interaction; anime.js handles motion
_2026-08-27_ — `@use-gesture/react` 10.3.1 (MIT, one dependency, peer dep React
≥16.8) normalizes the editor's pointer interactions: dragging a component from
the palette into a slot, and the resizable pane dividers.
Rejected: **native HTML5 drag-and-drop**, which gives a poor drag image,
awkward drop-target math, and no pointer/touch parity; and **hand-rolled
mousedown/mousemove/mouseup**, which means re-implementing pointer capture and
cleanup badly.

The two libraries do not overlap and neither is a substitute for the other:
use-gesture turns pointer events into coordinates and deltas, anime.js turns
values into animation over time. Nothing about this reopens
[the motion decision](#animejs-is-the-motion-engine-tailwind-bound-kits-are-references-only).

It also passes the test that **motion-primitives and smoothui failed**, and for
the same reason those were rejected: use-gesture ships no styles, no components
and no rendering opinions, so it brings no second styling system with it. A
library that only reads input is cheap in a way a component kit is not.

Constraint it does not relax: drops are still **slots between existing
children**, never free positions. The gesture changes how the drop is captured,
not the drop model — layout is flow, and
[absolute positioning is ruled out](./decisions.md#flow-layout-with-stacks--never-absolute-positioning).

## anime.js is the motion engine; Tailwind-bound kits are references only
_2026-08-27_ — Animation is `animejs` 4.5.0 (MIT, no dependencies,
framework-agnostic ESM). It animates DOM nodes, so one import serves both an
Astro `<script>` and a React island, and it has no opinion about how anything is
styled.
Rejected: **motion-primitives** and **smoothui**. Both are shadcn-style
copy-paste React kits that require **Tailwind CSS** (v4 for smoothui) plus
**Motion**, and this UI is Astro islands + CSS Modules + Base UI with no Tailwind
anywhere. Adopting either means importing a second styling system to obtain
animations, which is the wrong trade for a fixed component set. They stay useful
as **pattern references** — read the interaction, reimplement it in CSS Modules.
Standing rules: one authored motion moment per surface rather than scattered
hover effects, everything gated behind `prefers-reduced-motion`, and **no motion
inside the slide canvas** — the preview must never move in a way the renderer
cannot reproduce.

## The renderer serves its own fonts from disk, not over HTTP

Chromium rendered every slide in a serif fallback while the preview of the same
document showed Inter. The cause was **not** a timing race, which is what it
looked like: `page.setContent` leaves the document on an **opaque origin**, so
the `@font-face` fetch goes out with `Origin: null`. Font fetches are always
CORS-mode, the API's allowlist is the two UI origins, and the response came back
with no `Access-Control-Allow-Origin` — 200, all 407 kB, then discarded. That is
why the font looked served and the bug looked like a render bug.

`document.fonts.ready` alone fixes nothing here, and was measured not to: with
the CORS failure in place `document.fonts.status` was *already* `'loaded'`,
because a face that errors is a settled face. The render with the wait was
byte-identical to the one without.

So `core/src/render/fonts.ts` intercepts `**/assets/fonts/*` on the render
context and fulfils it from disk. **Rejected: inlining the TTFs as `data:`
URIs** — the interpreter injects all six Inter weights into every slide, ~547 kB
each as base64, so a self-contained slide would carry ~3.3 MB for a document
that measurably uses two or three faces (a face loads lazily). Interception has
the same properties — zero network, no CORS, no live API — with the HTML at
1.4 kB, and leaves `interpreter.ts`, shared with the preview, untouched. Cost:
**+26 ms per slide** (median 583 → 609 ms), which is Chromium rasterising Inter,
work it previously skipped by failing the fetch.

The guard, `core/src/render/fonts.test.ts`, compares a render against the same
slide with Inter renamed out of existence. Without Chromium it reports
**skipped**, not passed, banners to real stderr, and fails outright under `CI` —
see the log's "green because nothing ran".

## npm workspaces, three packages, ESM throughout
_2026-06-10_ — `core` / `api` / `ui`, all `"type": "module"`.
Every runtime path must resolve from `import.meta.url`, **never**
`process.cwd()` — the app is started from several working directories and
`cwd()`-relative paths broke in wave 5 (see the path-resolution fixes in
`32af25e`). This is the single most repeated bug in the project's history.

## Dependency versions are pinned exactly
_2026-06-10_ (`5c7ca55`) — No `^` or `~` anywhere in a `package.json`; write the
exact installed version when adding a dependency.
Rejected: caret ranges. The reason is **reproducible installs** — the same
checkout resolves to the same tree on any machine and at any later date, without
a lockfile being the only thing standing between you and a silent upgrade.

## The UI keeps its own copy of the shared types
_2026-08-27_ — `ui/src/lib/types.ts` is a hand-maintained copy of
`core/src/types.ts`, minus the Node-side types (`Theme`,
`RenderTemplateOptions`).
Rejected: importing `@newspapper/core/templates` (which is genuinely
browser-safe and exports these types). `core` ships raw `.ts` with no build step
(`tsc --noEmit`), and while Vite resolves that through the `exports` field in
dev, the types fight the Astro production build. The copy is the cheaper side of
that trade.

**Correction, 2026-08-27.** This entry claimed "a guard test keeps it that way
rather than trust". There is no such test — grep for one and nothing comes back.
The copy held for 2.5 months on discipline alone, and then brief 52 changed
`Article` and added seven interfaces, at which point the mirror silently drifted.
Brief 58 owns `ui/src/lib/types.ts` and must both re-sync it and add the guard
test this entry always claimed existed.

## The default database path is overridable, and tests must override it
_2026-08-27_ — `getDb()` with no argument resolves `NEWSPAPPER_DB_PATH` first,
and only falls back to `repo_root/data/newspapper.db` when it is unset.
Found the expensive way. `api/src/server.test.ts` had set that env var since it
was written, and `defaultDbPath()` never read it — it resolved from
`import.meta.url` unconditionally. Every `npm test` run was therefore opening and
migrating the developer's real database while the test file's own comment
claimed "the DB is ephemeral". Harmless until brief 52 landed a v2→v3 migration
that drops `posts` and `articles`, at which point one test run destroyed the dev
database's contents. A regression test now asserts the override is honoured.

The general lesson is worth more than the fix: a test harness that *sets* an
environment variable is not evidence that anything *reads* it.

## SQLite (better-sqlite3) is the only datastore
_2026-06-10_ — `data/newspapper.db` holds the post history and settings; it is
auto-created and migrated on boot.
_(reconstructed)_ A single-user local app should not require a server process,
and the durable state is small.

## Knowledge lives in `corpus/`, not `docs/` <!-- lint-ok -->
_2026-08-27_ — The project wiki, brief archive, and change log moved to
`corpus/`, as a curated wiki: per-page `summary:`/`updated:`
frontmatter, a generated catalog, and a retrieval budget.
Rejected: keeping the flat `docs/` tree. That layout had no way to distinguish <!-- lint-ok -->
standing synthesis from work specs, and no frontmatter for an agent to triage
on — so every question cost a full-page read. See [../log.md](../log.md).
