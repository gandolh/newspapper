---
summary: The locked calls about the repo itself — workspaces and ESM (and why the Docusaurus docs workspace is the one non-ESM package), exact dependency pinning, the enforced formatter and the linter that once enabled no rules, typechecking the UI, no GitHub-hosted CI, and the API running built JavaScript under plain node (2026-11-04, revising "runs from source under tsx").
updated: 2026-11-04
---

# Decisions — tooling

How the repo builds, checks and pins itself. These are the calls that decide
whether a green command means anything.

Three of the four below exist because a tool was reporting success while
reaching nothing — the pattern [log.md](../log.md) calls **green because nothing
ran**, which has now been hit seven times in this project. That is the thread to
follow if you are tempted to relax one of them.

Runtime and library calls live in
[decisions-engineering.md](./decisions-engineering.md), the security posture in
[decisions-security.md](./decisions-security.md), product-shaping ones in
[decisions.md](./decisions.md). Same rule: don't reopen one without an explicit
revisit and a [log.md](../log.md) entry.

## The UI workspace is typechecked, not just bundled
_2026-08-31_ — `ui` has a `typecheck` script (`tsc --noEmit`) alongside its
bundler build, and the root `build` chain runs it. (The bundler was
`astro build` when this was decided; the move to Vite + React (2026-08-31) made it `vite build` days later,
and the `typecheck` step was the point either way.)
Found because the editor work (2026-08-31) left a dangling `import { EditorStep } from
'../editor/EditorStep'` in `ui/src/components/wizard/Wizard.tsx` and **every gate
stayed green.** `core` and `api` both built with `tsc --noEmit` (they also emit
`dist/` since 2026-11-04); `ui` built with
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

## The formatter and the linter are enforced, and configured to do something

_2026-08-31_ — Three tooling defects, found by running `npm run fmt`
on a clean tree during a verify gate and watching it rewrite 106 files.

There was **no Prettier config at all**, so `npm run fmt` used Prettier's
defaults — double quotes — against a single-quoted codebase. And
`eslint.config.js` **enabled zero rules**: parser and plugin registered, the
three rules it named turned off, no recommended set imported. `npm run lint` had
reported green for the project's entire history while linting nothing. Proved,
not assumed: a plain unused variable draws exit 0 and no output from it.

*Revisited 2026-11-11: the config is now the house format (width 120, double
quotes, semicolons; see "The house style, formatted and checked" below). The
enforcement stands; the measured minimum does not.* The config was
`{ singleQuote: true, printWidth: 100 }`, **derived by measuring**
— 12 options against all 158 committed files, scored by files already clean.
Prettier's defaults scored 1 of 158; this scores 88, at the minimum of the
changed-line curve. Rejected: picking a house style by preference, which makes
the diff a matter of taste rather than of fit.

`npm run build` now runs `format:check` **first** (it was `fmt:check` until 2026-11-11). Rejected: leaving the formatter
available but unenforced — precisely how 106 files drifted. Accepted cost: an
agent running `build` for type feedback mid-refactor hits a formatting failure
before any type error.

`.astro` was dropped from the `fmt` glob rather than adding a plugin, on the
reasoning that the move to Vite + React (2026-08-31) was about to delete
every `.astro` file. It did, days later, and the glob gained `ui/vite.config.ts`
and `ui/index.html` in the same pass — so the gap opened and closed as planned
rather than becoming permanent. Ten `react-hooks` findings were
suppressed at config level until the hook-rules fix later that day turned the
rules on; `rules-of-hooks` and `exhaustive-deps`, the two that catch
correctness bugs, were on and clean throughout.

## The house style, formatted and checked

_2026-11-11_ — The owner's call of 2026-11-09 (every repo enforces the researched
conventions) made the formatter and linter the estate's, not this repo's own
measurement. The configs are a vendored copy of the skills library's
`house-style` package at 1.0.0 (`vendor/house-style/`, refreshed by
`npm run house-style:sync`, never edited by hand). Rejected: a `github:` or
tarball dependency, which npm locks as a git URL and so needs `git` in the
image.

- **Format.** Width 120, double quotes, semicolons, trailing commas; Markdown
  and `docs/` stay out of Prettier. One reformat commit (8,675 lines deleted in
  248 files, against 7,912 in 234 measured at the start: the whole repo is now
  in scope, not five globs), proved a no-op by bundling every file before and
  after with esbuild. Rejected: keeping width 100, which the owner's single
  estate width overrules, though it would have cost 1,144 fewer lines.
- **Types.** `tsconfig.base.json` holds `strict`, the lineage flags,
  `verbatimModuleSyntax` and `erasableSyntaxOnly`, and it is Newspapper's own
  file, not an extension of the vendored base: the image copies the workspaces
  and this one file, and the vendored base would turn on
  `noUncheckedIndexedAccess`. That flag stays off (a later brief; counts in
  [status.md](./status.md)). `core` and `api` typecheck their tests;
  `tsconfig.build.json` leaves them out of `dist/`.
- **Lint.** The house ESLint config, typed through the workspace tsconfigs.
  Components, layouts, pages and route plugins use named exports. `console` is
  allowed in the seed CLI, the server entry, the Chromium test guard and the two
  loggers. `process.env` in `api/src` is a warning until the API reads its
  settings through one config module; `core` is a library and reads its own.
  Left as warnings: 120 non-null assertions in tests and 42 conditional skips of
  the Chromium tests.
- **The gate.** `npm run check` (typecheck, lint, `format:check`, knip,
  dependency-cruiser, the two house checkers `--warn-only`, tests with `CI=1`)
  and `npm run check:fast`. `gate` is `check`, `build` and the corpus lint.

## npm workspaces, three packages, ESM throughout
_2026-06-10_ — `core` / `api` / `ui`, all `"type": "module"` (the docs
workspace, added later, is the exception below).
Every runtime path must resolve from `import.meta.url`, **never**
`process.cwd()` — the app is started from several working directories and
`cwd()`-relative paths broke in wave 5 (see the path-resolution fixes in
`32af25e`). This is the single most repeated bug in the project's history.

## The docs workspace is the one package without `"type": "module"`
_2026-10-19_ — `docs/` (`@newspapper/docs-site`) moved from Astro
Starlight to Docusaurus 3.10 on the owner's call of 2026-10-18, and Docusaurus's
build fails when the site package is `"type": "module"`
(`TypeError: require.resolveWeak is not a function` during static generation,
reproduced 2026-10-18). So that package leaves the field out. Its own scripts
are `.mjs`, ESM by extension, and still resolve paths from `import.meta.url`;
`docusaurus.config.ts` and `sidebars.ts` are loaded by Docusaurus itself. `core`,
`api` and `ui` stay ESM. Rejected: keeping Starlight, which was the owner's
call, not a technical one.

## Dependency versions are pinned exactly
_2026-06-10_ (`5c7ca55`) — No `^` or `~` anywhere in a `package.json`; write the
exact installed version when adding a dependency.
Rejected: caret ranges. The reason is **reproducible installs** — the same
checkout resolves to the same tree on any machine and at any later date, without
a lockfile being the only thing standing between you and a silent upgrade.

## No GitHub-hosted CI: the gate is an npm script
_2026-10-04_ (owner) — No GitHub runners, workflows or other GitHub-specific
automation in the repo. The full gate is `npm run gate` (build, test, lint,
corpus lint, with `CI=1` so a missing Chromium fails instead of skipping), run
by hand or by the deploy. Rejected: `.github/workflows/ci.yml`, which the Chromium-guard work (2026-10-03)
added and this removed. The estate deploys through its own `vps-deploy`, and
the owner wants no GitHub machinery in the repos.

## The API runs built JavaScript, started by node
_2026-11-04_ (owner) — In production the API is `node api/dist/server.js`:
`core` and `api` compile with `tsc` into `dist/`, and the image holds no npm
process, no tsx and no dev dependencies. This **revisits** the call made when
the app was containerized, "runs from SOURCE under `tsx`", with dev dependencies
kept in the runtime image because there was no compile step. That call lived in
the Dockerfile's header and [commands.md](./commands.md#production-mode), never
on a decisions page. The reason is the box: 3.7 GiB of RAM shared by every app
in the estate, which the owner will not upgrade, so on 2026-11-04 the owner
decided its apps run built JavaScript and start with `node` directly. This
container was the second largest there (138 MB; its tsx process 127 MB plus
58 MB in swap). Measured locally on Docker Desktop with the Reader's loop off,
idle went from 175 MiB to 87 MiB, and the process tree from npm, sh, tsx, node
and esbuild to one node.

How: `core`'s `exports` keep their `.ts` source as the default, which tsx, Vite
and vitest read, and each entry gains a `newspapper-built` condition pointing at
`dist/`. The image sets `NODE_OPTIONS=--conditions=newspapper-built`, so an
env file that sets `NODE_OPTIONS` must keep that flag. Node is now PID 1, which
gets no default action for SIGTERM, so the server exits on it itself.
Rejected: **a bundler**, because `core` finds the repo root by counting `..`
from its own file (`util/paths.ts`, `render/fonts.ts`); a bundle moves that code
to another depth, where fonts, `ui/dist` and the seed list all miss, and tsc's
`dist/` sits at `src/`'s depth. **Re-pointing the exports at `dist/`** for
everyone, which the dead-config cleanup (2026-08-31) had already turned down:
tsx, vitest and the UI's Vite build would read stale output or need `core` built
first. **Node's own type stripping**, which is not built JavaScript and does not
map the source's `.js` import specifiers to `.ts` files.

## Base UI by the conventions (2026-11-11, brief 09)

The dialogs, the toast, the chip rows and the narrow editor's pane switcher follow the base-ui skill's rules 8, 12, 13 and 16. Structure and behaviour only; the styling stays on CSS modules until brief 10.

- **A filter is a `RadioGroup`, a picker that saves is a guarded `ToggleGroup`** (rule 16, Q41 and Q57). `ChipRow` takes a required `kind`. Where each writes decided it: the keyword chips on `/posts`, Unread and All in the Reader and the proof sheet's first row only change what a list shows; the inspector's `size`, `align` and `emphasis` write to the post on each choice. The guard drops an empty value, so one chip stays pressed, and arrow keys only move focus.
- **One behaviour went:** a second click on the chosen keyword no longer clears the filter (a `RadioGroup` does not fire on a repeat click). "All keywords" is the way back.
- **`ConfirmDialog` has no ✕.** It is an `AlertDialog`: Cancel has the focus, Esc and Cancel close it, an outside press does nothing, and while `loading` nothing closes it. Its six callers did not change.
- **A form dialog ignores an outside tap** (Q58): Add and Edit source pass `dismissOnBackdrop={false}`. `Modal` has the Escape guard and sends focus to `[data-autofocus]`, else the first field (a file input never counts), else the first button, else the dialog.
- **An error toast stays until dismissed**, whatever duration a caller passes, and is announced at once. The viewport is in a `Toast.Portal`.
- **`Tabs` activates on focus**, as the skill's rule 16 says; an inactive pane is not mounted, as before.
- The guard: `no-restricted-imports` on the `@base-ui/react` root in `eslint.config.js`, and `check-base-ui`. It runs strict since 2026-11-12 (brief 10 moved the 43 CSS files to Tailwind).
