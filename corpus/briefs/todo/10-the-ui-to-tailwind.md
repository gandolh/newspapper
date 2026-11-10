# Task 10: The UI to Tailwind

**Depends on:**

- In Newspapper:
  - brief 07, for Base UI 1.9.0, so no visual change is blamed on the wrong brief;
  - brief 08, for the gate, the formatter and the `.claude/rules/web.md` this brief extends;
  - brief 09, which settles the wrappers' markup in `ui/src/components/ui/`, so this brief styles each part once, in its final place.
- In the owner's skills library:
  - the brief *A base-ui skill, styled with Tailwind*: rules 4-8, the `tailwind.md` reference and the method in `migrating-from-plain-css.md`;
  - the brief *A house style, and a quality harness that enforces it*: the `better-tailwindcss` lint;
  - the brief *Newspapper's UI to Tailwind*, the estate draft this brief replaces.
- The owner's grilling of 2026-11-10: Q17 (token names), Q18 (dark mode), Q19 (visual parity), Q20 (order of the migrations), and the new questions in the decisions below.

**Before you start:** run `brief-board guide` ([CLAUDE.md](../../../CLAUDE.md)).

## Context

The owner's call of 2026-11-09: Base UI is styled with Tailwind v4, and whole apps move to Tailwind. Newspapper's `ui/` is the only app in the estate on CSS Modules. This brief moves all of it to Tailwind 4.3.5 with the looks unchanged. Where it disagrees with the estate draft, this brief was measured against the code on 2026-11-10.

### Corrections to the estate draft

- **11 `@font-face` rules, not 12.** `grep -c "^@font-face" ui/src/styles/global.css` prints 11 (Archivo 3, Inter 6, Spline Sans Mono 2); the twelfth hit of a plain `grep` is a comment at `global.css:11`.
- **A decision does reject Tailwind.** The draft says none does. [wiki/decisions-engineering.md](../../wiki/decisions-engineering.md), "anime.js is the motion engine; Tailwind-bound kits are references only" (2026-08-27, lines 63-77), rejected motion-primitives and smoothui because they need Tailwind ("no Tailwind either way"), and says to "reimplement it in CSS Modules". [log.md](../../log.md) lines 184-185 repeat it. The animejs choice stands; the Tailwind half is revisited (step 7).
- **The preview trap is settled: the preview shares no CSS with the render.** `TNodeView` paints each node with core's `resolveStyle` as an inline style (`ui/src/components/editor/preview/TNodeView.tsx`, `resolve.ts:1-12`), the same function the Chromium render runs. The render's whole stylesheet is `core/src/templates/interpreter.ts:335` (the Inter `@font-face` lines) and `:361-362` (`*{margin:0;padding:0;box-sizing:border-box;}` and the `body` font). Slides contain only `<div>`s, a `<span>` for text, and `backgroundImage: url(...)` (`core/src/wizard/components/content.ts:149, 163`): no `<img>`, no border. So there is no CSS to share, and no `@layer components` block to name for it. The risk is the other direction: **anything global that reaches inside the 1080² canvas changes the preview and not the render.** Today the reset in `global.css:213-219` is exactly the render's reset, and `SlideCanvas.module.css`'s `.canvas` (lines 14-24) resets the inherited font, weight, spacing and line height. Tailwind's Preflight adds `html` line-height, a font stack, and `border: 0 solid` on every element. None of those changes a slide today (no borders, `.canvas` resets the text properties), but nothing would notice if one did, so step 1 adds the parity test.
- **The wax test finds its elements by hashed class names.** `ui/src/components/editor/SourcePane.wax.test.ts` selects `pre[class*="highlight"]` (lines 283, 436, 498, 559), `[class*="wax"]` (331), `[class*="waxRun"]` (451, 561) and `[class*="selectionGround"]` (420, 609). Those are CSS-Modules names. Under Tailwind they match nothing, and the absence checks (`selectionGround` count 0 at line 609) pass for the wrong reason. The test's own Vite build is `configFile: false` with no Tailwind plugin and imports `global.css` (line 65). Left alone, the migration turns this test into a green that reached nothing (see [wiki/green-because-nothing-ran.md](../../wiki/green-because-nothing-ran.md)). Step 2 gives the galley stable `data-` hooks first.

### The stylesheets today (2026-11-10)

43 files, **4,367 lines**, all under `ui/src/` (`find ui/src -name '*.css' | xargs wc -l`):

- 42 `*.module.css` files and `styles/global.css` (352 lines). Imported by 45 `import styles from '…module.css'` lines in 45 files; `global.css` only by `main.tsx:3` (and by `SourcePane.wax.test.ts:65`).
- 411 leading class selectors (304 distinct names). 397 `className=` attributes and 427 `styles.x` references; **0 literal class names**, every class comes from a module.
- 23 `styles[…]` dynamic lookups in 13 files: `PalettePane.tsx:97`, `SourcePane.tsx:188`, `Card.tsx:14`, `Input.tsx:13`, `ProgressBar.tsx:36`, `Select.tsx:47`, `Toast.tsx:60`, `Button.tsx:34-36`, `Textarea.tsx:36`, `ChipRow.tsx:70, 73, 74`, `Sidebar.tsx:42-98` (7), `layouts/App.tsx:26`, `pages/Login.tsx:16`. These become variant maps.
- **One class crosses files:** `HATCH` (`ui/src/components/ui/Marks.tsx:35`, `styles.hatched`), spread into `className` by 5 files (`Button.tsx`, `Toggle.tsx`, `PalettePane.tsx` and two more; `grep -rln HATCH ui/src --include=*.tsx`).
- 10 `@media` blocks, 4 `!important` (all in the reduced-motion rule), **0 keyframes, 0 container queries, 0 `rem`**, 16 `em`, 313 `px` literals (41 distinct values; `1px` ×70, `2px` ×29, `4px` ×28, `10px` ×25). 9 colour literals in the modules (`rgba(43, 43, 43, …)` ×6, `#171717` ×2, `rgba(245, 217, 122, 0.28)`).
- 66 pseudo-class uses (`:hover` 28, `:disabled` 14, `:not(` 11), 32 `::before`/`::after` in 5 files, 19 descendant or child selectors, 5 `[data-edge]`, 4 Base UI state attributes in `Select.module.css` and 3 in `Toggle.module.css`, 8 `[data-stage]` rules in `ReaderIsland.module.css:54-63`.

| Area | Files (lines) | What they style |
|---|---|---|
| Globals | `ui/src/styles/global.css` (352) | 11 `@font-face`; the 56 tokens on `:root`; reset, `html` at 14 px, `body` with the 26 px non-photo grid, form font inheritance, selection, focus ring, scrollbars, reduced motion |
| Primitives | `ui/src/components/ui/*.module.css`: `Marks` (340), `Select` (136), `Button` (120), `ChipRow` (101), `Toast` (77), `Textarea` (69), `Toggle` (69), `Input` (68), `Modal` (62), `ProgressBar` (56), `EmptyState` (43), `PageHeader` (40), `Card` (20), `Skeleton` (13), `ConfirmDialog` (13) | the marks (tissue corner, hatch, findings, `pseudo-element` leaders), every control, the overlays |
| Shell | `Sidebar` (203), `ApiHealthDot` (29), `layouts/App` (30), `pages/Login` (7), `auth/LoginIsland` (86), `auth/SessionMenu` (49) | the tray, the sheet, sign-in |
| Reader | `Rail` (207), `ItemList` (187), `Clippings` (149), `SourcesPanel` (129), `ItemBody` (124), `ReadingPane` (108), `ReaderIsland` (66), `KeyLegend` (56), `BackControl` (30) | three panes, the views, the article |
| Posts and settings | `PostsIsland` (161), `SettingsIsland` (106) | the flat file, the form |
| Editor | `SourcePane` (304), `PalettePane` (146), `PreviewPane` (132), `InspectorPane` (117), `EditorIsland` (110), `ImagePicker` (73), `SlideCanvas` (58), `TNodeView` (32), `Splitter` (18) | the galley, specimens, stage, tissue, preview chrome |
| Proof | `KitchenSinkIsland` (71) | the dev-only proof sheet |

### The token mapping plan

`global.css:127-209` defines **56** custom properties, all in `:root`, and 911 `var(--…)` reads in the modules. Values stay exactly; names go into Tailwind's namespaces (Q17 default: Newspapper's own names).

| Group (`global.css` lines) | Count | Today | In `@theme` | Utility example |
|---|---|---|---|---|
| Ground, ink (127-136) | 7 | `--board`, `--paper`, `--tissue`, `--graphite`, `--graphite-soft`, `--graphite-tint`, `--process-blue` | `--color-<same>` | `bg-board`, `text-graphite-soft` |
| Marks (139-154) | 9 | `--non-photo`, `--non-photo-select`, `--rubylith`, `--rubylith-wash`, `--rubylith-wash-soft`, `--rubylith-ink`, `--grease`, `--wax`, `--wax-ink` | `--color-<same>` | `bg-wax`, `text-rubylith-ink` |
| Hatch (155) | 1 | `--hatch`, a gradient | stays a plain variable, used through `bg-(image:--hatch)`, or an `@utility hatched` | |
| Rules and edges (158-162) | 5 | `--hairline`, `--rule`, `--tick`, `--tissue-edge`, `--tissue-ink` | `--color-<same>` | `border-hairline` |
| Shadows (165-166) | 2 | `--shadow-waxed`, `--shadow-hinged` | `--shadow-waxed`, `--shadow-hinged` | `shadow-waxed` |
| Spacing (169-173) | 5 | `--sp-hair` 6, `--sp-half` 13, `--sp-unit` 26, `--sp-double` 52, `--grid` 26 | `--spacing-hair`, `-half`, `-unit`, `-double`; `--grid` stays a variable (the lattice) | `p-half`, `gap-unit` |
| Fonts (176-179) | 3 | `--font-chrome`, `--font-galley`, `--font-slide` | `--font-chrome`, `--font-galley`, `--font-slide` | `font-galley` |
| Width axis (181-183) | 3 | `--wdth-title` 112, `--wdth-brand` 115, `--wdth-narrow` 92 | plain variables; 12 uses of `font-variation-settings: 'wdth' var(--wdth-…)` become one `@utility` per axis | |
| Type size (185-192) | 8 | `--fs-board-title` 23, `-brand` 14, `-body` 14, `-label` 13, `-galley` 12.5, `-field` 9, `-mark` 9, `-caption` 11 | `--text-board-title`, … with the paired `--text-<n>--line-height` from the five `--lh-*` (194-198) | `text-label` |
| Tracking (200-204) | 5 | `--ls-board-title`, `-brand`, `-label`, `-field`, `-mark` | `--tracking-<same suffix>` | `tracking-field` |
| Layout (207-209) | 3 | `--tray-h` 78, `--content-max` 1092, `--content-narrow` 728 | `--height-tray`, `--container-content`, `--container-narrow` | `h-tray`, `max-w-content` |

Tailwind's default colour, text, radius, shadow, font and breakpoint scales are cleared (`--color-*: initial` and so on) so only Newspapper's tokens exist: the design has zero radius and a closed palette, and `rounded-md` or `text-sm` producing CSS would be a lapse. Gotchas this app brings:

- **The 14 px root.** `global.css:221-226` sets `html { font-size: var(--fs-body) }` (14 px) and no rule uses `rem`. Tailwind's numeric spacing and any `rem` default would come out at 14/16 of their size. Decision 5.
- **tailwind-merge** does not know the custom names. Unconfigured, `cn("text-label", "text-graphite")` treats both as colours and drops one. `ui/src/lib/cn.ts` uses `extendTailwindMerge` with the `text`, `tracking`, `shadow` and spacing names, with a test for exactly that.
- **Breakpoints are inclusive `max-width`.** The CSS uses `(max-width: 768px)` (4 files: `SessionMenu.module.css:45`, `PostsIsland.module.css:153`, `Sidebar.module.css:120`, `layouts/App.module.css:26`), `(max-width: 1099px)` (3: `ReadingPane.module.css:93`, `BackControl.module.css:26`, `ReaderIsland.module.css:38`) and `(max-width: 640px)` (2: `ApiHealthDot.module.css:18`, `Sidebar.module.css:143`). Tailwind v4's `max-md:` and `max-[768px]:` compile to `width < …`, which drops the exact boundary pixel. Each width becomes an `@custom-variant` written as `@media (max-width: …)`, named for what it means (the Reader's narrow stage, the tray folding), not for the number. Two JS thresholds must stay in step: `NARROW_PX = 1180` (`EditorIsland.tsx:75`, `:504`) and `NARROW_QUERY = '(max-width: 1099px)'` (`ReaderIsland.tsx:65`).
- **`hover:` is hover-capable only** in v4 (`@media (hover: hover)`). A tap on a phone no longer leaves the hover state on. 28 `:hover` rules; the difference is expected and listed.
- **Source scanning.** Tailwind scans the source tree, not the import graph. The proof sheet's classes (`ui/src/components/KitchenSinkIsland.tsx`, `ui/src/proof/KitchenSink.tsx`) would land in the production CSS even though its JS never ships (`ui/vite.config.ts:20-55`, whose comment says it "contributes no JS and no CSS"). Decision 6.
- **Sanitized feed HTML cannot take utilities.** `ItemBody.module.css` (124 lines, one class, `.prose`) styles descendants of `dangerouslySetInnerHTML` markup: `h3`, `ul`, `ol`, `li`, `dt`, `dd`, `blockquote`, `pre`, `code`, `hr`, `figure`, `img`, `figcaption`, `a` (lines 36-117). Decision 7.

### Inline styles

9 `style={…}` props (`grep -rn "style={" ui/src --include=*.tsx`): computed geometry stays inline (`EditorIsland.tsx:648, 667` pane widths, `SlideCanvas.tsx:124, 129, 149` scale and zone boxes, `ProgressBar.tsx:37`, `Skeleton.tsx:22`, `Modal.tsx:31`). One is data, not geometry: `SettingsIsland.tsx:95`, `background` from the chosen slide theme's `primary` colour. It becomes a `--swatch` variable read with `bg-(--swatch)` and gets an exception in `scripts/conventions.json`.

### What a migration pass cannot be checked by

No test asserts a class name (`grep -rnE "toHaveClass|classList" ui/src` prints nothing); the only CSS-aware test is the wax test above. So the screenshots and the two new tests (galley hooks, preview parity) are the whole safety net.

## Owner decisions (defaults this brief builds)

1. **Token names** (Q17). Default: Newspapper's own names in Tailwind's namespaces, as the table. No estate vocabulary.
2. **Dark mode** (Q18). Default: none. `color-scheme: light` stays (`global.css:124`) and there is no `dark:` variant.
3. **Visual parity** (Q19). Default: before and after screenshots at 1280 and 390 px, plus 1100 and 1099 (the Reader's stage), 1181 and 1179 (the editor's threshold) and 769 and 768 (the tray), every difference fixed or listed with its reason.
4. **Preflight.** Default: **no Preflight.** Import Tailwind's `theme.css` and `utilities.css` and keep `global.css`'s reset, ported into `@layer base` unchanged, because it is already identical to the render's reset (`interpreter.ts:361`) and Preflight adds nothing the app uses. The fallback, if a screenshot shows a native control shifting: add Preflight and keep the canvas's resets.
5. **The 14 px root and the scale.** Default: named spacing only (`--spacing-hair` and the others), the numeric default scale cleared, and the 14 px root kept. The alternative, moving the 14 px from `html` to `body` and keeping rem defaults, changes nothing visible (no `rem` in use) but leaves defaults usable. *New question for the grilling*: the same choice faces any estate app with a non-16 px root.
6. **The proof sheet's utilities in the production CSS.** Default: accept the few bytes, keep the JS guard, and record the measured size (step 1 and 5); update the comment in `ui/vite.config.ts` that says "no CSS". The alternative is a second stylesheet for the proof sheet, an exception to one-stylesheet. *New question for the grilling.*
7. **Feed HTML.** Default: keep the `.prose` rules as one named `@layer components` block in `index.css` (`.item-prose`), with a comment that the markup is foreign. The alternative, `@tailwindcss/typography`, adds a dependency and a second look. *New question for the grilling.*
8. **The galley.** Default: migrate it to utilities with the wax test as the oracle (decision-free, since the test asserts glyph ink). If the test cannot pass with the same property values, the stacking rules stay as a named `@layer components` block.
9. **Motion** (rule 7). Default: parity. There are no keyframes today and two authored motion moments run in anime.js; nothing new, nothing removed.
10. **Where Newspapper falls in the estate's order** (Q20). Default: last, after the small apps. This brief does not depend on any other app's migration. Vite stays at 6.4.5: `@tailwindcss/vite` 4.3.5's peer range is `^5.2||^6||^7||^8` (`npm view @tailwindcss/vite@4.3.5 peerDependencies`, 2026-11-10).

## Files you OWN

- `ui/src/**/*.css`: all 43 go; `ui/src/styles/index.css` and `ui/src/lib/cn.ts` (and its test) are new. `ui/src/css-modules.d.ts` goes.
- The `className` values and `styles.x` uses in 45 `.tsx` files; `ui/src/main.tsx:3`.
- `ui/src/components/editor/SourcePane.tsx`: the `data-` hooks (step 2).
- `ui/src/components/editor/SourcePane.wax.test.ts`: the selectors and the bundle config. New: a preview-parity test beside `ui/src/components/editor/preview/`.
- `ui/package.json` (`tailwindcss` 4.3.5 and `@tailwindcss/vite` 4.3.5 as devDependencies, `clsx` 2.1.1 and `tailwind-merge` 3.7.0 as dependencies, all exact) and `package-lock.json`. The root devDependency `eslint-plugin-better-tailwindcss` 4.10.0 (peer `tailwindcss ^3.3.0||^4.1.17`, ESLint ^9 ok).
- `ui/vite.config.ts`: the plugin, and the proof-sheet comment.
- `eslint.config.js`: the `better-tailwindcss` block only, `entryPoint: "ui/src/styles/index.css"`.
- `scripts/conventions.json`: the `--swatch` exception.
- `.claude/rules/web.md`: the Tailwind lines.
- `DESIGN.md` and the token block in `corpus/wiki/design.md` (its YAML front matter names the colours): the Tailwind names.
- Corpus: [wiki/decisions-engineering.md](../../wiki/decisions-engineering.md) (revisit; it is at 193 lines, so the new entry goes on [wiki/decisions-tooling.md](../../wiki/decisions-tooling.md) or `decisions-ui.md`), [wiki/chrome.md](../../wiki/chrome.md), [wiki/design.md](../../wiki/design.md), [wiki/design-components.md](../../wiki/design-components.md), [wiki/dependencies.md](../../wiki/dependencies.md), [wiki/status.md](../../wiki/status.md), [log.md](../../log.md).

## Files you must NOT touch

- `api/`, `core/`: the render's CSS (`core/src/templates/interpreter.ts`) is not this brief's; the preview is made to match it, not the reverse.
- Behaviour: handlers, the reader's keyboard handling (`ui/src/components/reader/keys.ts` and the `onKeyDown`s), routes, anime.js, the `useDrag` gestures. A change that looks necessary for styling is a finding for the outcome note.
- `ui/src/components/ui/`'s props (brief 09 settled them) and the Base UI wrappers' logic.
- `ui/public/fonts/` and `assets/fonts/`.

## What to do

Follow the skill's `migrating-from-plain-css.md`. One commit per numbered step; after each, `CI=1 npm run check` and `npm run build` pass.

1. **Before.**
   - Bring the app up as [docs/images/shots.md](../../../docs/images/shots.md) does ("Demo data": scratch `NEWSPAPPER_DB_PATH`, `OUTPUT_DIR`, `UPLOADS_DIR`, `READER_REFRESH_MINUTES=0`, a tester account from `npm run seed --workspace=api`, post 1 to 3). Freeze the clock with Playwright's `page.clock`, and copy the scratch folder so the after pass starts from the same rows. For the Reader, insert feed items straight into the scratch database, since the refresh is off.
   - Screenshots, at 1280 × 800 and 390 × 844 (and the boundary widths in decision 3 for the Reader, the editor and the tray): login (plain, failed, and "Sign in with Ward" with a dummy `WARD_OIDC_ISSUER`); the editor (source, inspector, palette, preview, image picker, a selection, a lint finding, the narrow pane switcher); posts (grid, filtered, publish and delete confirms); the Reader (rail, item list, reading pane with a long article, Clippings, Sources with its add dialog, the key legend); settings; the proof sheet at `/kitchen-sink` in dev; each toast variant and each modal. Keep the images out of git.
   - Record the built CSS size of `ui/dist/_bundle/*.css`, raw and gzip, and `ui/dist` file count.
   - **The preview-parity test (new, before any CSS moves).** In real Chromium behind the existing guard (`core/src/render/test-support/chromium.ts`), take a sample post from `core/src/wizard/samples.ts`, compile it, and render the same slide two ways in one page: the interpreter's HTML (`renderTemplate`, the render's own) and the app's `SlideCanvas` at `scale={1}`, bundled as the wax test bundles `SourcePane`. Compare, node for node in DOM order, `getBoundingClientRect` and the computed `font-family`, `font-weight`, `line-height`, `letter-spacing`, `box-sizing`, `margin`, `padding`. It passes on CSS Modules today. Then run a control: add `line-height: 1.5` to `.canvas`'s ancestor and watch it fail. A parity test that has never failed has not been shown to reach anything.
2. **Galley hooks.** In `SourcePane.tsx`, add `data-galley="highlight"`, `data-galley="wax-run"` and `data-galley="selection-ground"` (and the others the test selects) on the elements that carry those classes, and switch the nine selectors in `SourcePane.wax.test.ts` to them, keeping `[class*=…]` out. The test passes on CSS Modules, unchanged in what it asserts. Add one positive control per absence check (each `count === 0` assertion first shows a count above 0 in the state before it).
3. **Set up.**
   - Add the dependencies and the plugin: `plugins: [react(), tailwindcss(), proofSheet()]`.
   - Check that the lockfile holds the platform builds of `@tailwindcss/oxide` the image and the owner's machines need: `node -e "console.log(Object.keys(require('./package-lock.json').packages).filter(k=>/oxide-(linux-x64-gnu|win32-x64-msvc)/.test(k)))"` prints both (measured on a scratch copy, 2026-11-10: the install writes all 12 platform variants).
   - Write `ui/src/styles/index.css`: the layer order, `@import "tailwindcss/theme.css" layer(theme)` and `utilities.css` (decision 4), `@theme` with the default namespaces cleared and the 56 tokens mapped, `@custom-variant` per breakpoint, the 11 `@font-face` rules moved verbatim (URLs stay `/fonts/…`, which Vite rewrites with `NEWSPAPPER_BASE`), and `global.css`'s reset, `body`, selection, focus, scrollbar and reduced-motion rules in `@layer base`.
   - Keep `global.css`'s `:root` as **aliases only** (`--graphite: var(--color-graphite)`) so unmigrated modules keep working; `main.tsx` imports `index.css` and `global.css` until the end.
   - Add `ui/src/lib/cn.ts` with `extendTailwindMerge`, and its test.
   - Update `SourcePane.wax.test.ts`'s Vite build: add `@tailwindcss/vite`, import `index.css` instead of `global.css`, and add probes that fail loudly if no utilities were generated: `getComputedStyle(pre).position`, `fontFamily` of the textarea includes `Spline Sans Mono`.
4. **Migrate one stylesheet at a time**, deleting each when empty, in this order:
   1. `ui/src/components/ui/*`: the primitives. `Button`, `Card`, `Input`, `Textarea`, `Select`, `Toggle`, `ChipRow`, `Modal`, `ConfirmDialog`, `Toast` with state variants (`data-popup-open:`, `data-highlighted:`, `data-checked:`, `data-disabled:`, `data-pressed:`) and `origin-(--transform-origin)` on positioners; variant maps replace the 14 `styles[…]` lookups in this folder; `Marks` last, with `HATCH` becoming an exported class string or an `@utility`. z-indexes (1000, 1001, 1100, 2000) become `--z-index-*` tokens.
   2. `ApiHealthDot`, `Sidebar`, `layouts/App`, `pages/Login`, `auth/*`.
   3. `reader/*` (`ItemBody` per decision 7; `ReaderIsland`'s `data-stage` rules become `data-[stage=…]:` variants).
   4. `posts/PostsIsland`, `settings/SettingsIsland`, `KitchenSinkIsland`.
   5. `editor/*` last: `Splitter`, `ImagePicker`, `InspectorPane`, `PalettePane`, `PreviewPane`, `EditorIsland`, then `preview/TNodeView` and `SlideCanvas` (the canvas keeps its self-reset as utilities on the one element), then `SourcePane`.
   6. `global.css`: delete it once `grep -rn "var(--" ui/src` shows only `--color-*`-style names and the intended plain variables.
   Run the preview-parity test and the wax test after each editor step.
5. **Lint.** Turn on `better-tailwindcss`' correctness rules and class order as errors, and fix what they find. Add `no-restricted-syntax` against `className` strings that name a colour literal.
6. **Screenshots after.** Same states, same data folder and clock. Compare pairs with Playwright's comparison or pixelmatch. Fix every difference or list it with its reason. Expected: hover not sticking after a tap on a phone. Record the CSS size and the proof-sheet leak (the number of bytes in `ui/dist` CSS that only `KitchenSinkIsland.tsx` and `ui/src/proof/KitchenSink.tsx` use).
7. **Corpus.**
   - [wiki/decisions-engineering.md](../../wiki/decisions-engineering.md): revisit "anime.js is the motion engine; Tailwind-bound kits are references only", each with a dated line and a `log.md` entry: the Tailwind half no longer applies (the UI is Tailwind, by the owner's call of 2026-11-09), and the choice stands on its other half (animejs, framework-agnostic, one authored moment per surface). Rewrite "reimplement it in CSS Modules".
   - Add the Tailwind decision with what was rejected (a styled kit, CSS Modules kept, Preflight) on [wiki/decisions-tooling.md](../../wiki/decisions-tooling.md) or `decisions-ui.md`.
   - Update [wiki/chrome.md](../../wiki/chrome.md), [wiki/design.md](../../wiki/design.md) (token names), `DESIGN.md`, [wiki/dependencies.md](../../wiki/dependencies.md), [wiki/status.md](../../wiki/status.md) and [log.md](../../log.md); add the Tailwind lines to `.claude/rules/web.md` (tokens only from `@theme`; no arbitrary colours; the canvas takes no global; the galley hooks; `data-` not class names in tests).
   - Run `bash corpus/lint.sh --index`, then `bash corpus/lint.sh`.
8. **The gate.** Drop `check-base-ui`'s `--warn-only` from `check:conventions`.

## Acceptance

- [ ] `find ui/src -name '*.css'` prints only `ui/src/styles/index.css`, and `grep -rn "module.css" ui/src` prints nothing.
- [ ] `check-base-ui` passes strict, with only the `--swatch` exception and brief 09's `Splitter` one in `scripts/conventions.json`.
- [ ] `grep -rnE "(bg|text|border|fill|stroke|ring|outline|shadow)-\[(#|rgb|hsl)" ui/src` prints nothing.
- [ ] `@theme` defines exactly the mapped tokens: a component using `bg-red-500`, `text-sm` or `rounded-md` produces no CSS (a build with each probe class shows no rule).
- [ ] A `cn` test proves `cn("text-label", "text-graphite")` keeps both classes.
- [ ] `SourcePane.wax.test.ts` passes under `CI=1` on the Tailwind build, selects by `data-galley`, has no `[class*=` selector, and its control (a deliberately wrong z-index) fails.
- [ ] The preview-parity test passes, and its control failed before the migration started (recorded in the outcome note).
- [ ] The screenshot pairs match, with every difference listed and explained, and the before and after CSS sizes and the proof-sheet leak are in the outcome note.
- [ ] `npm run build` writes no `virtual:proof-sheet` code in `ui/dist` (`grep -rl "KitchenSink" ui/dist` prints nothing).
- [ ] `CI=1 npm run check` and `npm run build` pass; `bash corpus/lint.sh` ends clean.
- [ ] The decisions-engineering revisit has a dated line and a `log.md` entry.

## Interplay

- Brief 08's reformat already touched the 18 CSS files that held quotes (69 lines); they are deleted here.
- Brief 09's renamed rules for `Modal`, `ConfirmDialog`, `Toast`, `ChipRow` and `Tabs` are migrated here like any other.
- Brief 11 does not touch `ui/`. Both change `package-lock.json`, so run them one at a time.
- Brief 06 (a post as a video) builds UI after this one lands, in Tailwind.
