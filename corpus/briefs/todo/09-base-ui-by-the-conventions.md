# Task 09: Base UI by the conventions

**Depends on:**

- In Newspapper:
  - brief 07, for Base UI 1.9.0: `AlertDialog`, `Tabs`, `ToggleGroup`, `Toast.Portal` and the `initialFocus` signature are the 1.9.0 ones;
  - brief 08, for the gate, the formatter and `.claude/rules/web.md`.
- In the owner's skills library:
  - the brief *A base-ui skill, styled with Tailwind*: rules 1-13, the references and `check-base-ui.mjs`;
  - the brief *Enforce the base-ui and code-structure skills in every repo*: the checker runs `--warn-only` until brief 10 here is done.
- The owner's grilling of 2026-11-10: Q15 (Base UI only under `ui/`), Q16 (where native controls stay), and the new questions below.

**Runs before:** 10. This brief changes structure and behaviour. Brief 10 then changes only the styling, so its before and after screenshots compare like with like.

**Before you start:** run `brief-board guide` ([CLAUDE.md](../../../CLAUDE.md)).

## Context

The owner's call of 2026-11-09 is Base UI everywhere at 1.9.0, with the skill's conventions enforced in each repo. Newspapper is further along than most: `ui/src/components/ui/` already holds one wrapper per Base UI primitive, and nothing outside that folder imports Base UI. What is missing is the behaviour the conventions ask of a dialog, one portal, and three hand-built widgets. This brief closes those. It does not move styling to Tailwind; that is brief 10.

### The pin and the imports (verified 2026-11-10)

- `ui/package.json:13` pins `"@base-ui/react": "1.5.0"` exactly; brief 07 moves it to 1.9.0. This brief starts from 1.9.0.
- All 6 imports are subpaths, and all 6 sit under `ui/src/components/ui/`: `Button.tsx:2` (`/button`), `Input.tsx:2` (`/input`), `Modal.tsx:2` (`/dialog`), `Select.tsx:1` (`/select`), `Toast.tsx:2` (`/toast`), `Toggle.tsx:1` (`/switch`). Command: `grep -rn "@base-ui" --include=*.ts --include=*.tsx ui/src`.
- 1.9.0 ships every part this brief needs: `alert-dialog`, `tabs`, `toggle-group`, `toggle`, `tooltip`, `drawer` and `toast/portal` (listed from the installed 1.9.0 package on a scratch copy, 2026-11-10).

### The audit against rules 1-13 (2026-11-10)

| Rule | Violations | Where |
|---|---|---|
| 1. Exact pin | 1 | `ui/package.json:13` is exact but 1.5.0. **Brief 07's work.** |
| 2. Subpath imports, no root barrel | 0 | the 6 above |
| 3. Base UI only under a `ui/` folder | 0 | the 6 above are the only importers |
| 4. Tailwind on the parts, no class selector aimed at a part | all of the Base UI styling | `[data-popup-open]`, `[data-disabled]`, `[data-highlighted]`, `[data-selected]` in `ui/src/components/ui/Select.module.css:39, 43, 100, 105`; `[data-checked]`, `[data-disabled]` in `Toggle.module.css:43, 48, 53`. **Brief 10's work.** |
| 5-7. One stylesheet, semantic tokens, motion | 43 stylesheets | 42 `*.module.css` and `ui/src/styles/global.css`. **Brief 10's work.** |
| 8. Floating parts portalled, z from tokens | **1 portal**, and the z-indexes | `Dialog.Portal` (`Modal.tsx:27`) and `BaseSelect.Portal` (`Select.tsx:80`) are in place. **The toast is not portalled**: `Toast.Viewport` (`Toast.tsx:27`) renders in place, under whatever stacking context its provider sits in. The z-indexes are bare numbers, not tokens: `Modal.module.css:7` (1000) and `:20` (1001), `Select.module.css:68` (1100), `Toast.module.css:10` (2000), `Sidebar.module.css:10` (50), `EditorIsland.module.css:99` (60). Their tokens are brief 10's work. |
| 9. A trigger around a component uses `render` | 0 | no `*.Trigger` wraps a component: `BaseSelect.Trigger` (`Select.tsx:67`) holds text and an icon; `Dialog.Close` (`Modal.tsx:36`) holds a glyph |
| 10. `Select.Root` with `items` | 0 | `Select.tsx:60` passes `items={options}` |
| 11. No `window.confirm`, `alert` or `prompt` | 0 | `grep -rnE "window\.(confirm\|alert\|prompt)" ui/src` finds only strings inside `sanitize.test.ts` |
| 12. Dialogs | **4 on `Modal`, 1 on `ConfirmDialog`** | see below |
| 13. Base UI over hand-built widgets | **3** | see below |

**Rule 12, on `Modal` (`ui/src/components/ui/Modal.tsx`) and its seven callers:**

- Controlled `open` and `onOpenChange`: yes (`Modal.tsx:21-26`).
- **No Escape guard.** `onOpenChange` ignores its details (line 23). Esc, an outside press and the ✕ all call `onClose` with no check that a control inside already used the key. Today nothing inside a `Modal` uses Esc, so it is harmless, and the next list or menu inside one breaks it.
- **No `initialFocus`.** Focus lands on Base UI's first tabbable, which is the ✕ in the header (`Modal.tsx:36`), not the first field. `SourcesPanel.tsx:249` compensates with `autoFocus` on its Name input, which fights the focus manager's own move.
- **No `disablePointerDismissal` on a form people type into.** `SourcesPanel.tsx:240` (Add source and Edit source) is a form of four text fields and a switch (`Toggle` at line 285); a click on the backdrop discards the draft. `ImagePicker.tsx:83` (Choose an image) and `KeyLegend.tsx:10` hold no typed text.
- **`Title` is optional.** `title?: string` (line 8) and `{title && …}` (line 34) mean a `Modal` without one has no name. All 7 callers pass one today (`ImagePicker.tsx:83`, `SourcesPanel.tsx:240`, `KeyLegend.tsx:10`, `KitchenSinkIsland.tsx:213`, and `ConfirmDialog.tsx:29`'s own, through six callers), so making it required changes nothing in use.
- The close button's `aria-label` (`Modal.tsx:36`) and the toast's (`Toast.tsx:66`) are present. The icon-only controls in the editor have labels too (`PreviewPane.tsx:188, 197, 205, 214`, `InspectorPane.tsx:293`).

**Rule 12, on `ConfirmDialog` (`ui/src/components/ui/ConfirmDialog.tsx`):** it is a `Modal` with two buttons, not the skill's confirm pattern. While `loading` is true the two buttons are disabled (`ConfirmDialog.tsx:32, 35`), but **Esc, the ✕ and a backdrop click still close it** mid-request. Six callers: `PostsIsland.tsx:383` (publish), `:398` (delete), `SourcesPanel.tsx:556`, `LibraryPanel.tsx:226`, `ReaderIsland.tsx:665`, and the proof sheet at `KitchenSinkIsland.tsx:220`. Each passes `loading` from its own `busy` state, so a dialog that cannot be dismissed while `loading` fixes all six with no caller change.

**Rule 13's three hand-built widgets:**

1. **`ChipRow`** (`ui/src/components/ui/ChipRow.tsx`): a row of `aria-pressed` buttons in a `role="group"`, one chip chosen at a time, with a second variant, `behavior="tablist"` (lines 20, 97), that renders `role="tab"` with `aria-selected`. Base UI has `ToggleGroup` for the first and `Tabs` for the second. Five call sites use the default: `InspectorPane.tsx:275` (the `size`, `align` and `emphasis` scales), `PostsIsland.tsx:222` (the keyword filter), `ItemList.tsx:71` (Unread and All), and `KitchenSinkIsland.tsx:152, 160`. **No caller passes `behavior`** (`grep -rn "behavior=" ui/src` prints nothing), so the `tablist` variant is dead code today.
2. **The editor's narrow-screen pane switcher**, `ui/src/components/editor/EditorIsland.tsx:626-636`: a `<nav>` of three `Button`s (`source`, `preview`, `inspector`) that picks which pane is on screen, with no `role="tablist"`, no `aria-selected`, no arrow keys. It is a tab set built from buttons. It becomes `Tabs`.
3. **The `title` tooltips** on non-link elements: `ApiHealthDot.tsx:59`, `PalettePane.tsx:105` (each component's description), `SessionMenu.tsx:40` (the username). `Marks.tsx:80`'s `title` is on an `aria-hidden` element and `SourcePane.tsx:191` is a lint message on the galley's own tokens. These are optional, decision 4.

**Considered and left:**

- **Native, kept by the rule** (Q16): the `<input type="file">` at `ImagePicker.tsx:91` (hidden behind an `Upload an image` button), the `<textarea>`s (`Textarea.tsx:47`, and the galley's own at `SourcePane.tsx:242`, which has to stay a plain textarea under a `<pre>`), and the text, `url` and `password` inputs through `Input`. There is no `<select>`, checkbox or radio left in `ui/src`: `grep -rnE "<select|type=\"(checkbox|radio)\"" ui/src` finds only a comment (`Select.tsx:28`).
- **No Base UI equivalent:** `ui/src/components/editor/Splitter.tsx`, a draggable `role="separator"` with arrow keys.
- **Navigation, not a widget:** `Rail.tsx:87` (`<nav aria-label="Reader">` with `aria-current` links), `Sidebar.tsx:41` (the tray), `InspectorPane.tsx:191` (the breadcrumb).
- **`PalettePane.tsx:106`'s `onKeyDown`** on a `Button` repeats what a button does natively (Enter and Space); it also `preventDefault`s so the drag layer does not take the key. Left.
- **`useToast`'s callers:** `EditorIsland.tsx:115`, `PostsIsland.tsx:69`, `SearchPanel.tsx:27`, `SourcesPanel.tsx`, `KitchenSinkIsland.tsx:56`. Its signature, `addToast(message, variant, duration)`, stays.

**A styling class used as a behaviour hook:** none found. `grep -rnE "querySelector\(['\"]\." ui/src --include=*.tsx` (outside tests) finds no class selector.

## Owner decisions (defaults this brief builds)

1. **Base UI only under `ui/`** (Q15). Default: yes, which Newspapper already is. This brief adds the guard, `no-restricted-imports` on `@base-ui/react` (the root) and the checker's rule 3, so it stays that way.
2. **`ChipRow` on `ToggleGroup`, or `RadioGroup`?** Default: `ToggleGroup` in single mode, with the wrapper emitting the clicked option's value even when it was already pressed (today's `onValueChange(option.value)` fires on every click, and `PostsIsland.tsx:232`'s `v === keyword` relies on getting the repeat). It keeps `aria-pressed` and Tab through the chips, and changes the least. The alternative is `RadioGroup` for the three exclusive scales (`InspectorPane.tsx:275`, `ItemList.tsx:71`, the proof sheet), which announces "selected" and moves with arrows, at the cost of arrow keys that choose. *New question for the grilling:* one primitive for all five sites, or `RadioGroup` where "none" is not a state and `ToggleGroup` for the keyword filter.
3. **`ConfirmDialog` without the ✕.** Default: it becomes an `AlertDialog` with Cancel and the confirm button, and no header ✕ (an alert dialog is dismissed by an explicit choice, and Esc until `loading`). That removes a visible mark from six dialogs. *New question for the grilling:* keep the ✕, or accept its removal.
4. **The optional two** (Base UI `Tooltip` for the three `title`s, and Base UI `Button`'s `focusableWhenDisabled`). Default: neither here. A tooltip is a visual change and touch screens have no hover.
5. **The dead `behavior="tablist"` variant.** Default: delete it with the rewrite (no caller).
6. **Native controls** (Q16). Default: the file input and both textareas stay native, as listed.
7. **How tests run.** Default: mount with `react-dom/client` and `act`, as `ui/src/components/auth/LoginIsland.test.tsx` does, for markup and roles. Where happy-dom cannot decide (focus after open, the Escape guard's timing, pointer dismissal), run the case in real Chromium through the existing guard in `core/src/render/test-support/chromium.ts`, as `ui/src/components/editor/SourcePane.wax.test.ts` does. Under `CI=1` a missing Chromium fails.

## The wrapper set: `ui/src/components/ui/`

| File | What it becomes | From |
|---|---|---|
| `Modal.tsx` | Base UI `Dialog`; props `open`, `onClose`, `title` (**required**), `children`, `width`, plus `dismissOnBackdrop` (default `true`; `false` sets `disablePointerDismissal`); the Escape guard; `initialFocus` in the house order | `Modal.tsx`, changed |
| `ConfirmDialog.tsx` | Base UI `AlertDialog`; props unchanged (`open`, `onClose`, `onConfirm`, `title`, `message`, `confirmLabel`, `cancelLabel`, `variant`, `loading`); cannot be dismissed while `loading` | `ConfirmDialog.tsx`, rebuilt |
| `Toast.tsx` | `Toast.Portal` around the viewport; `useToast`, `ToastProvider` and the types unchanged | `Toast.tsx`, changed |
| `ChipRow.tsx` | Base UI `ToggleGroup` + `Toggle`; props unchanged but `behavior` removed | `ChipRow.tsx`, rebuilt |
| `Tabs.tsx` | Base UI `Tabs`: `value`, `onValueChange`, `tabs: { value, label }[]`, panels by render prop | new; the editor's narrow switcher uses it |
| `Select.tsx`, `Toggle.tsx`, `Button.tsx`, `Input.tsx` | unchanged | |

`Card`, `EmptyState`, `Marks`, `PageHeader`, `ProgressBar`, `Skeleton` and `Textarea` do not wrap Base UI and stay. Export the new wrapper from `ui/src/components/ui/index.ts` next to the others.

## Files you OWN

- `ui/src/components/ui/{Modal,ConfirmDialog,Toast,ChipRow}.tsx`, the new `Tabs.tsx`, and `ui/src/components/ui/index.ts`.
- `ui/src/components/editor/EditorIsland.tsx`: the pane switcher (lines 624-636) only.
- `ui/src/components/reader/views/SourcesPanel.tsx`: `dismissOnBackdrop={false}` on the form's `Modal`, and removing the `autoFocus` at line 249 in favour of the wrapper's `initialFocus`.
- The existing CSS rules for markup this brief changes. Rename or move a rule to the new part; do not restyle. Brief 10 turns them into utilities.
- Tests: new `ui/src/components/ui/Modal.test.tsx`, `ConfirmDialog.test.tsx`, `Toast.test.tsx`, `ChipRow.test.tsx` and `Tabs.test.tsx`; `ui/src/components/KitchenSinkIsland.tsx` gains the new wrappers' states so the proof sheet still shows every primitive.
- `eslint.config.js`: `no-restricted-imports` on `@base-ui/react`, only that block.
- `scripts/conventions.json`: any exception the checker needs (the `Splitter`).
- Corpus: [wiki/chrome.md](../../wiki/chrome.md) (the "Primitives" line, near line 62), [wiki/dependencies.md](../../wiki/dependencies.md) (the `@base-ui/react` row), [wiki/design-components.md](../../wiki/design-components.md) if a component's description changes, [wiki/decisions-tooling.md](../../wiki/decisions-tooling.md) (a "Base UI by the conventions" entry; if the page passes about 190 lines, put it on a new `decisions-ui.md` instead and run `bash corpus/lint.sh --index`), [wiki/status.md](../../wiki/status.md), [log.md](../../log.md).

## Files you must NOT touch

- `api/`, `core/`, and `ui/package.json` (every part needed ships in 1.9.0, so no new dependency).
- Styling beyond renaming a rule's selector. No Tailwind here.
- `ui/src/components/editor/Splitter.tsx`, `SourcePane.tsx` and the galley's `<textarea>`.
- Callers' props: `ConfirmDialog`, `Modal` and `useToast` keep their public API (apart from the required `title`, which every caller already passes), so no `PostsIsland`, `LibraryPanel` or `ReaderIsland` edit.
- The two Chromium-dependent behaviours the wrappers hold today (Base UI's focus trap, scroll lock). They move with the rebuilt wrappers unchanged.

## What to do

One commit per numbered step. After each, `npm run check` passes (brief 08), with `check-base-ui` `--warn-only`.

1. **Before.**
   - Run `check-base-ui` strict and record the counts by rule. Expect rule 1 to be clear after brief 07, rule 5 at 43, and rules 8, 12 and 13 at whatever the checker counts, not at the numbers above (the checker reads less than this audit does).
   - Take Playwright screenshots, at 1280 and 390 px, of: the Add source dialog; the Choose an image dialog; the Keyboard shortcuts dialog; the publish confirm and the delete confirm on `/posts`; a toast of each variant; the inspector's `size` chips; `/posts`' keyword chips; the Reader's Unread and All chips; the editor's three panes at 390 px; and the proof sheet at `/kitchen-sink` in dev. Brief 10's method has the bring-up (a scratch data folder, a seeded account, a frozen clock). Keep the images out of git.
2. **`Modal`.** Make `title` required; add the Escape guard (`details.reason === "escape-key" && details.event.defaultPrevented` keeps it open); add `initialFocus` as a function that returns, in order, the first `[data-autofocus]` in the popup, else the first form field, else the popup's first button that is not the close button; add `dismissOnBackdrop`. Then `SourcesPanel.tsx`: `dismissOnBackdrop={false}`, `data-autofocus` on the Name input instead of `autoFocus`.
3. **`Toast`.** Wrap the viewport in `Toast.Portal`. Keep: the 4 s default timeout, `type` carrying the variant, the Done, Failed and Note word in the mark face, ✕ labelled "Dismiss", and the stacking Base UI gives. Add `limit` only if today's behaviour is a single toast (check in step 1's screenshots).
4. **`ConfirmDialog` on `AlertDialog`.** Props unchanged. While `loading`, ignore every dismissal (Esc, outside press, Cancel) and keep the confirm button's "Working" mark. Cancel is a `Button variant="ghost"` inside `AlertDialog.Close`, as today.
5. **`ChipRow` on `ToggleGroup`.** Per decision 2: one chip pressed, the clicked value emitted on every click, `disabled` honoured per chip, `equal`, `wrap` and `pad` kept as class hooks, the label and the hint wired through `aria-labelledby` and `aria-describedby` as now. Delete `behavior`.
6. **`Tabs`, and the editor's switcher on it.** `EditorIsland.tsx:624-636`: three tabs, the active pane's content as the panel. Keep: only the active pane mounted (today `pane === 'source' && sourcePane` unmounts the others, which resets the galley's local state, so confirm what Base UI's `Tabs.Panel` does with an inactive panel and set `keepMounted` to match), the `pane` state and the narrow threshold (`NARROW_PX = 1180`, line 75). Arrow keys now move between tabs.
7. **The guard.** Add `no-restricted-imports` for the `@base-ui/react` root to `eslint.config.js`, add `scripts/conventions.json` if the checker needs the `Splitter` exception, and run `check-base-ui` strict: rules 1, 2, 3, 8, 9, 10, 11 and 12 report 0.
8. **Tests.** Per decision 7. The cases: `Modal` Esc closes it, and does not when a child calls `preventDefault` on the key; `initialFocus` lands on the `data-autofocus` field; a backdrop click does not close it with `dismissOnBackdrop={false}`; `ConfirmDialog` ignores Esc and Cancel while `loading` and closes after; a toast is in a portal outside the app root and has `role="status"` or the live region Base UI provides; `ChipRow` emits the clicked value on a repeat click and responds to Tab; `Tabs` arrow keys move the selected tab and the editor shows one pane.
9. **After.** Retake the screenshots; list every difference with its reason (expected: `ConfirmDialog`'s ✕ gone, the tab keys). Run `check-base-ui` strict again. Update the corpus pages and [log.md](../../log.md); run `bash corpus/lint.sh --index`, then `bash corpus/lint.sh`.

## Acceptance

- [ ] `grep -rn "@base-ui/react" ui/src --include=*.ts --include=*.tsx | grep -v "components/ui/"` prints nothing, and `grep -rnE "from '@base-ui/react'" ui/src` prints nothing (no root import).
- [ ] `check-base-ui` strict reports 0 for rules 1, 2, 3, 8, 9, 10, 11 and 12. Rules 4-7 are left for brief 10, and their counts are in the outcome note.
- [ ] `Modal`'s `title` is required: a `Modal` with none fails `npm run typecheck`.
- [ ] A test shows Esc does not close a `Modal` when a child handled it, and a second shows `initialFocus` on the `data-autofocus` field. Neither is a manual check.
- [ ] A test shows `ConfirmDialog` cannot be dismissed while `loading`: Esc, outside press and Cancel leave it open, and `PostsIsland.tsx`'s two dialogs are untouched.
- [ ] `useToast`'s signature is unchanged and no caller edits: `git diff --stat` for the brief shows no change in `PostsIsland.tsx`, `LibraryPanel.tsx`, `ReaderIsland.tsx`, `SearchPanel.tsx` or `EditorIsland.tsx` beyond the switcher.
- [ ] `grep -rn "behavior" ui/src/components/ui/ChipRow.tsx` prints nothing.
- [ ] At 390 px the editor's pane switcher has `role="tablist"` and arrow keys move the tab; at 1280 px the three panes show side by side as before. Those are tests.
- [ ] The before and after screenshots match, with any difference listed and explained.
- [ ] `CI=1 npm run check` passes, and `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 10 styles `ui/src/components/ui/` with Tailwind on the parts, replaces the bare z-indexes with tokens, and removes the CSS rules this brief renamed. The new wrappers are styled there like any other.
- Brief 08's `no-default-export` change touches the same files (the wrappers are default exports re-exported by `ui/src/components/ui/index.ts`); run 08 first.
- Brief 06 (a post as a video) adds an "Export as video" control and its progress; whoever builds it after this brief builds it on `Modal`, `ConfirmDialog` and `Toast` as rebuilt here.
