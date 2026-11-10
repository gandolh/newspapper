# Task 07: Base UI 1.9.0

**Depends on:**

- In Newspapper: nothing. This brief runs first, so a visual or behavioural change in the later briefs is never blamed on the bump.
- In the owner's skills library: nothing is needed to build it. It is Newspapper's row of the brief *Every repo on Base UI 1.9.0*, and replaces it for this repo. That brief's step list (grep, pin, scripts, behaviour check, commit) is followed here.

**Runs before:** 08, 09, 10 and 11.

**Before you start:** run `brief-board guide` ([CLAUDE.md](../../../CLAUDE.md)).

## Context

On 2026-11-09 the owner decided that every web app they own runs `@base-ui/react` at the latest stable release, **1.9.0**, pinned exactly. On that day npm's `latest` tag was 1.9.0 and there was no `next` tag (`npm view @base-ui/react dist-tags`, 2026-11-10). Newspapper is on 1.5.0.

### The pin today (read 2026-11-10)

Every `package.json` in the repo, with its spec for `@base-ui/react`:

| File | Spec |
|---|---|
| `package.json` (root) | none |
| `core/package.json` | none |
| `api/package.json` | none |
| `docs/package.json` | none (the Docusaurus workspace) |
| `ui/package.json:13` | `"1.5.0"`, already exact |

Command: `grep -rn "base-ui" --include=package.json . | grep -v node_modules`.

The lockfile resolves one copy: `package-lock.json:2091-2092`, `node_modules/@base-ui/react` at 1.5.0, with `@base-ui/utils` 0.2.9 (`package-lock.json:2098`). So only `ui` changes, and the whole bump is one workspace. The rule "pin exactly" already holds; only the version is old.

### The two breaking changes do not touch this repo

1.9.0 renamed `OTPFieldPreview` to `OTPField` (`@base-ui/react/otp-field`) and `sanitizeValue()` to `normalizeValue()`. Command: `grep -rnE "OTPFieldPreview|otp-field|sanitizeValue" --include=*.ts --include=*.tsx --include=*.md --include=*.json . | grep -v node_modules | grep -v package-lock` printed nothing on 2026-11-10.

### Measured on a scratch copy, 2026-11-10

On a scratch copy of the repo (`npm ci --ignore-scripts`, then `npm install @base-ui/react@1.9.0 --save-exact -w @newspapper/ui --ignore-scripts`), npm 10.9.9:

- `ui/package.json` became `"@base-ui/react": "1.9.0"`. Nothing else in any `package.json` changed.
- **The lockfile nests the new copy.** It does not hoist it. `node_modules/@base-ui/react` is gone, and the copy now sits at `ui/node_modules/@base-ui/react`, with three nested dependencies under `ui/node_modules/@base-ui/react/node_modules/` (`@base-ui/utils`, `@floating-ui/react-dom`, `use-sync-external-store`). Another package in the tree holds the root copies of those names at other versions, which is why npm nests them. Any check that reads `node_modules/@base-ui/react` by that exact key finds nothing afterwards; the acceptance below walks the lockfile instead.
- Eight lockfile entries were replaced and none was added or dropped beyond that: package count 1,699 before and after. Versions after:

  | Package | Before | After |
  |---|---|---|
  | `@base-ui/react` | 1.5.0 | 1.9.0 |
  | `@base-ui/utils` | 0.2.9 | 0.5.0 |
  | `@floating-ui/react-dom` | 2.1.8 | 2.1.9 |
  | `@floating-ui/utils` | 0.2.11 | 0.2.12 |
  | `@floating-ui/core`, `@floating-ui/dom` | 1.7.5, 1.7.6 | 1.8.0, 1.8.0 |
  | `reselect` | 5.2.0 | 5.3.0 |
  | `use-sync-external-store` | 1.6.0 | 1.7.0 |

- `tsc -p ui --noEmit`: 0 errors before and after. The wrappers' prop usage compiles against 1.9.0's types.
- `vitest run ui`: 181 passed, 26 skipped, before and after.
- Peer dependencies: `react` `^17||^18||^19` (this repo is on 19.2.7); `date-fns`, `@date-fns/tz` and `@types/react` are optional peers in 1.9.0 (`npm view @base-ui/react@1.9.0 peerDependenciesMeta`).

**Not measured here, so step 1 measures it:**

- The 26 skipped tests are the Chromium ones (the galley's `SourcePane.wax.test.ts`, the sanitizer's real-page tests). The Playwright in this repo wants Chromium revision 1223 and only 1243 was installed, so they printed their "DID NOT RUN" banner. Under `CI=1` that banner is a failure, so a green gate cannot hide it.
- The full `npm run gate`, and `docker build` of `infrastructure/Dockerfile`.
- The 1.5.0 to 1.9.0 changelog. GitHub was not reachable from the session that wrote this brief.
- Behaviour in a browser.

### What Newspapper uses

Six wrappers in `ui/src/components/ui/`, one per primitive. They are the only importers (`grep -rn "@base-ui" --include=*.ts --include=*.tsx ui/src`):

| Wrapper | Import | What it uses |
|---|---|---|
| `Button.tsx:2` | `@base-ui/react/button` | `Button` with `disabled` and `className`; 50 `<Button>` uses in 15 files |
| `Input.tsx:2` | `@base-ui/react/input` | `Input`, `id`, `aria-describedby`, the rest of the input props spread |
| `Modal.tsx:2` | `@base-ui/react/dialog` | `Root` (`open`, `onOpenChange`), `Portal`, `Backdrop`, `Popup`, `Title`, `Close` |
| `Select.tsx:1` | `@base-ui/react/select` | `Root` (`items`, `value`, `defaultValue`, `onValueChange`, `name`, `disabled`), `Trigger`, `Value` with a render-function child, `Icon`, `Portal`, `Positioner` (`sideOffset`, `alignItemWithTrigger`), `Popup`, `Item`, `ItemText`, `ItemIndicator` |
| `Toggle.tsx:1` | `@base-ui/react/switch` | `Root` (`checked`, `defaultChecked`, `onCheckedChange`, `disabled`, `name`, aria props), `Thumb` |
| `Toast.tsx:2` | `@base-ui/react/toast` | `Provider`, `Viewport`, `Root`, `Title`, `Close`, `useToastManager` (`add` with `title`, `type`, `timeout`; the `toasts` list) |

## Owner decisions (defaults this brief builds)

1. **Pin 1.9.0 exactly.** Default: yes, through `npm install ... --save-exact`. No range.
2. **Nothing else moves.** Default: no general `npm update`, no other dependency. The lockfile diff is Base UI's own tree and nothing else.
3. **A visual change the bump causes** is logged in the outcome note and left. It is not restyled here; briefs 09 and 10 own the markup and the styling. Parity, where it is judged, means "close enough" (decided 2026-11-10, owner, Q19): no visible change to layout or colour at 1280 and 390 px; a few pixels of drift needn't be listed.
4. **Release flow** (decided 2026-11-10, owner, Q4 and Q31). The bump is one commit on `main`, pushed directly. No branch, no pull request.

## Files you OWN

- `ui/package.json` (the one line) and `package-lock.json`.
- A source file only if a breaking or behavioural change forces it. Expect none: the typecheck and the unit tests pass on the scratch copy.
- `corpus/wiki/dependencies.md`: the `@base-ui/react` row (line 39).
- `corpus/wiki/status.md` and `corpus/log.md`.

## Files you must NOT touch

- Styling: no `*.module.css` and no `global.css` edit.
- `api/`, `core/`, `docs/`, and every other dependency.
- The wrappers' props. A fix the bump forces keeps each wrapper's public API.

## What to do

One commit for the bump, `chore(deps): @base-ui/react 1.9.0`. The gate is green before it, and you record the baseline first.

1. **Baseline and changelog.**
   - Run `npx playwright install chromium`, then `CI=1 npm run gate` on the untouched tree. Record the result and the test count (908 tests in 76 files on 2026-11-04; [wiki/status.md](../../wiki/status.md)). If it fails before the bump, say which test, and treat that as the baseline.
   - Read the `@base-ui/react` release notes from v1.5.0 to v1.9.0 and write one line per wrapper in the outcome note: either "nothing in these notes touches what the wrapper uses", or the note and what you checked. Look at focus, dismissal, animation and positioning changes in `Dialog`, `Select`, `Switch` and `Toast` in particular.
2. **Re-run the grep** for `OTPFieldPreview`, `otp-field` and `sanitizeValue`. Expect no hits.
3. **Install.** `npm install @base-ui/react@1.9.0 --save-exact -w @newspapper/ui`. Then check that the lockfile resolves 1.9.0 and only the eight entries above changed:

   ```
   node -e "const p=require('./package-lock.json').packages;console.log(Object.entries(p).filter(([k])=>k.endsWith('/@base-ui/react')).map(([k,v])=>k+' '+v.version))"
   ```

4. **Scripts.** `CI=1 npm run gate` (build with `fmt:check`, tests, lint, corpus lint). Fix only what the bump broke.
5. **Behaviour in a browser.** Start `npm run dev` with a seeded account (`npm run seed --workspace=api`), then check each component at 1280 and 390 px wide, with the keyboard and with the pointer. Write down anything that differs from 1.5.0 (the baseline run of step 1 on a second checkout, or `git stash`, gives the comparison).

   | Component | Where to see it | Check |
   |---|---|---|
   | `Button` | any page; `loading` in the editor's Render button (`ui/src/components/editor/EditorIsland.tsx`) | the disabled and loading states take no press; focus ring on Tab |
   | `Input` | login (`ui/src/components/auth/LoginIsland.tsx`), Reader search (`ui/src/components/reader/views/SearchPanel.tsx`) | typing, the `aria-describedby` hint and error text, autofocus on `LoginIsland.tsx:75` |
   | `Dialog` (`Modal`) | Add source (`ui/src/components/reader/views/SourcesPanel.tsx:240`), Choose an image (`ui/src/components/editor/ImagePicker.tsx:83`), Keyboard shortcuts (`ui/src/components/reader/KeyLegend.tsx:10`), and the six `ConfirmDialog` callers | open, Esc closes it, a backdrop click closes it, Tab stays inside, focus returns to the opener, page scroll is locked behind it |
   | `Select` | the editor's theme select (`EditorIsland.tsx:593`), Posts' status filter (`PostsIsland.tsx:206`), Library source filter (`LibraryPanel.tsx:126`), Settings' default theme (`SettingsIsland.tsx:83`) | the trigger shows the chosen label, not the raw value; arrows and typeahead move the highlight; Enter chooses; the popup sits below the trigger (`alignItemWithTrigger={false}`) and does not clip at 390 px; it stays above an open dialog |
   | `Switch` (`Toggle`) | source rows in the Reader (`SourcesPanel.tsx:285, 505`) | Space toggles, the track shows checked and disabled, the label click toggles |
   | `Toast` | the editor's "Could not load the themes." error (`EditorIsland.tsx:390`), a save in Posts, and a failed Reader search | a toast shows for its 4 s, stacks, closes with the ✕, the live region reads it, and Esc and focus are untouched |

6. **Commit** with the message above, then update the `dependencies.md` row, [wiki/status.md](../../wiki/status.md) and [log.md](../../log.md) with a `done` entry in one corpus commit. Run `bash corpus/lint.sh`.

## Acceptance

- [ ] `ui/package.json` reads exactly `"@base-ui/react": "1.9.0"`: `node -p "require('./ui/package.json').dependencies['@base-ui/react']"` prints `1.9.0`.
- [ ] The lockfile resolves 1.9.0 and no other version: the step 3 command prints one line, ending `1.9.0`.
- [ ] `grep -rnE "OTPFieldPreview|otp-field|sanitizeValue" --include=*.ts --include=*.tsx . | grep -v node_modules` prints nothing.
- [ ] `git diff --stat HEAD~1` for the bump commit lists only `ui/package.json` and `package-lock.json`, unless a forced fix is named in the outcome note.
- [ ] `CI=1 npm run gate` passes, with the Chromium tests running (no "DID NOT RUN" banner in the output) and the test count no lower than the step 1 baseline.
- [ ] `docker build -f infrastructure/Dockerfile .` succeeds. The image's `npm ci` reads the nested `ui/node_modules` layout from the lockfile; the `COPY ui ./ui` that follows does not overwrite it, because `.dockerignore` drops `**/node_modules`.
- [ ] The outcome note has one changelog line per wrapper and the behaviour table's result, or "no difference found".
- [ ] `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 09 rebuilds `Modal` and `ConfirmDialog` and adds wrappers; it starts from a tree already on 1.9.0, so the `AlertDialog`, `Tabs`, `ToggleGroup` and `Toast.Portal` APIs it needs are the 1.9.0 ones.
- Brief 10 needs a Vite 6.4.5 check; it does not depend on this one, but it reads the lockfile this brief rewrites. Run them one at a time.
- Work happens on `main` and each commit is pushed straight to `main` (owner, 2026-11-10, Q4 and Q31): no branch, no pull request. The owner reviews `main`.
