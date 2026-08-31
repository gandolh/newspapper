---
summary: The locked calls about the repo itself — workspaces and ESM, exact dependency pinning, the enforced formatter and the linter that once enabled no rules, and typechecking the UI.
updated: 2026-08-31
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
`astro build` when this was decided; brief 70 made it `vite build` days later,
and the `typecheck` step was the point either way.)
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

## The formatter and the linter are enforced, and configured to do something

_2026-08-31 (brief 68)_ — Three tooling defects, found by running `npm run fmt`
on a clean tree during a verify gate and watching it rewrite 106 files.

There was **no Prettier config at all**, so `npm run fmt` used Prettier's
defaults — double quotes — against a single-quoted codebase. And
`eslint.config.js` **enabled zero rules**: parser and plugin registered, the
three rules it named turned off, no recommended set imported. `npm run lint` had
reported green for the project's entire history while linting nothing. Proved,
not assumed: a plain unused variable draws exit 0 and no output from it.

The config is `{ singleQuote: true, printWidth: 100 }`, **derived by measuring**
— 12 options against all 158 committed files, scored by files already clean.
Prettier's defaults scored 1 of 158; this scores 88, at the minimum of the
changed-line curve. Rejected: picking a house style by preference, which makes
the diff a matter of taste rather than of fit.

`npm run build` now runs `fmt:check` **first**. Rejected: leaving the formatter
available but unenforced — precisely how 106 files drifted. Accepted cost: an
agent running `build` for type feedback mid-refactor hits a formatting failure
before any type error.

`.astro` was dropped from the `fmt` glob rather than adding a plugin, on the
reasoning that [brief 70](../briefs/done/70-vite-react.md) was about to delete
every `.astro` file. It did, days later, and the glob gained `ui/vite.config.ts`
and `ui/index.html` in the same pass — so the gap opened and closed as planned
rather than becoming permanent. Ten `react-hooks` findings are
suppressed at config level pending brief 72; `rules-of-hooks` and
`exhaustive-deps`, the two that catch correctness bugs, are on and clean.

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
