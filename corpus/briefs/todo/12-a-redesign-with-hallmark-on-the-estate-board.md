# Task 12: A redesign with Hallmark, on the estate board

**Depends on:**

- In Newspapper:
  - [brief 09](../done/09-base-ui-by-the-conventions.md), which settles the Base UI wrappers in `ui/src/components/ui/`;
  - [brief 10](10-the-ui-to-tailwind.md), which moves the whole UI to Tailwind with one token set in `ui/src/styles/index.css` and builds the Light / Dark / System switch. A redesign is then mostly a new token set and layout.
- In the owner's skills library:
  - brief 24, which vendors Hallmark as the design skill and adopts taste-skill 2.5's ideas (palettes and type dealt by trade, its copy layer);
  - the estate redesign board: one artifact with a page per app, owned by the skills library.
- The owner's answer of 2026-11-10 (Q39): no bake-off; Hallmark redesigns every web UI, keeping what is useful from taste-skill 2.5, and the owner approves each app on the board before any code changes.

**Runs before:** nothing. **Runs after:** 07 to 11, the redesign last. Brief 11 is server-only and does not block it.

**Before you start:** run `brief-board guide` ([CLAUDE.md](../../../CLAUDE.md)).

## Context

Newspapper is a paste-up board for setting a news carousel: an editor, a posts list, a Reader that gathers feed items, and settings. It is the workstation, not the slides it renders. One operator uses it, signed in through Ward.

**Two design systems live here, and only one is in scope.** The **app chrome** (the board, tray, panes, galley, controls) is what this brief redesigns. The **slide themes** (`warm-industrial-1`, `-2`, `-3`) are what the renderer paints into the 1080 px JPEG; they, the render's CSS in `core/` and the slide canvas in the preview stay untouched. See [wiki/design-systems.md](../../wiki/design-systems.md).

### The screens (read 2026-11-10, `ui/src/routes.tsx`)

| Screen | Route | File |
|---|---|---|
| Editor: source galley, palette, preview, inspector, the narrow-screen pane switcher, the image picker | `/` | `ui/src/components/editor/EditorIsland.tsx`, `SourcePane.tsx`, `PalettePane.tsx`, `PreviewPane.tsx`, `InspectorPane.tsx`, `ImagePicker.tsx`, `Splitter.tsx` |
| Posts: the flat list, keyword filter, publish and delete confirms | `/posts` | `ui/src/components/posts/PostsIsland.tsx` |
| Reader: rail, item list, reading pane, Clippings, Library, Search, Sources (with its add dialog), the key legend | `/reader` | `ui/src/components/reader/ReaderIsland.tsx`, `Rail.tsx`, `ItemList.tsx`, `ReadingPane.tsx`, `ItemBody.tsx`, `views/`, `KeyLegend.tsx` |
| Settings: default slide theme, Appearance (brief 10), account | `/settings` | `ui/src/components/settings/SettingsIsland.tsx`, `AccountSection.tsx` |
| Sign in (password and Ward) | `/login` | `ui/src/pages/Login.tsx`, `ui/src/components/auth/LoginIsland.tsx` |
| The shell: the tray, session menu, API health dot, toasts | every page but `/login` | `ui/src/components/Sidebar.tsx`, `ui/src/layouts/App.tsx`, `ui/src/components/auth/SessionMenu.tsx`, `ui/src/components/ApiHealthDot.tsx` |
| The shared parts | | `ui/src/components/ui/` (Button, Input, Modal, ConfirmDialog, Select, Toggle, ChipRow, Tabs, Toast, Marks, Card, EmptyState) |

The proof sheet at `/kitchen-sink` is dev-only and is updated with the parts, not designed.

### What the design docs fix today

- [DESIGN.md](../../../DESIGN.md) points at the shipped system: [wiki/design.md](../../wiki/design.md) (north star, colours with measured contrast, type, shadows, and the token block in its front matter) and [wiki/design-components.md](../../wiki/design-components.md) (components, motion, browser surfaces, the do and don't list). [PRODUCT.md](../../../PRODUCT.md) and [wiki/product.md](../../wiki/product.md) are the product truth and the design principles. [wiki/chrome.md](../../wiki/chrome.md) records how the chrome is built.
- [wiki/decisions.md](../../wiki/decisions.md), "The workstation is redesigned; the slide theme is not" (2026-08-27), locks **The Mechanical** as the world: the paste-up board, a 26 px non-photo blue grid under everything, crop marks and register targets, the markup waxed on as a galley, the inspector on a tissue overlay. It rejected polishing the incumbent chrome.
- [wiki/design.md](../../wiki/design.md) fixes the **Ink Floor Rule** (`graphite-soft` is the lightest text colour on board or paper), zero radius, a closed palette and two shadows; the galley's textarea and its `<pre>` share every metric ([wiki/design-components.md](../../wiki/design-components.md) section 5), guarded by `SourcePane.wax.test.ts`.
- The Light / Dark / System switch is the owner's call of 2026-11-10 (Q18): light on a first visit, `data-theme` through `@custom-variant`. Brief 10 builds it with a first set of dark values; this brief re-tunes them.

The redesign stays inside these decisions unless the owner reopens one on the board.

## Owner decisions

Answered 2026-11-10: Q39 (Hallmark, with taste-skill 2.5's useful parts; approval on the board first). Defaults: the proposal keeps The Mechanical as the world, the tray as the navigation and the one-operator scope. Navigation stays conventional: each tray showing is labelled, and a route is never reached by recognising a shape alone. Anything that moves The Mechanical, the Ink Floor Rule, or the slide themes is flagged on the board as a reopened decision.

## Files you OWN

- `ui/src/styles/index.css` (the tokens for both themes, radii, shadows, type, spacing) and the screens listed above, one commit each.
- `DESIGN.md` is a stub; the recorded design goes to [wiki/design.md](../../wiki/design.md) and [wiki/design-components.md](../../wiki/design-components.md), from the shipped result.
- Corpus: [wiki/decisions.md](../../wiki/decisions.md) (the world decision, if it changes), [wiki/status.md](../../wiki/status.md), [log.md](../../log.md).

## Files you must NOT touch

- `api/` and `core/`, which includes the render's CSS (`core/src/templates/interpreter.ts`) and the slide themes' tokens.
- The slide canvas and preview (`ui/src/components/editor/preview/`): they must match the render, not the app theme.
- The copy's meaning. No invented facts or numbers.
- The Base UI wrappers' behaviour (brief 09) and the theme switch's mechanism (brief 10): the redesign changes how they look.

## What to do

1. **Today.** Take Playwright screenshots of every screen above at 1280 and 390 px, in light and dark, kept out of git (the bring-up is in [docs/images/shots.md](../../../docs/images/shots.md)). Include each dialog and menu, a toast of each variant, the editor with a selection and a lint finding, the Reader's long article, and the narrow pane switcher.
2. **Propose.** With Hallmark (and taste-skill 2.5's trade palettes and copy layer where they help), make a proposal per screen, inside the recorded decisions. Check each against the Floor: contrast, a visible focus ring, a reduced-motion path, no invented facts, no broken phone layout.
3. **Board.** Put the proposals on this app's page of the estate board, beside today's screenshots at both widths.
4. **Approval.** The owner approves on the board. Nothing below starts before that, and the approval is recorded in `log.md` with its date.
5. **Build.** First as a token change in `ui/src/styles/index.css` (colours for both themes, radii, shadows, type, spacing), then one screen per commit, on `main`, pushed to `main` (no branch, no pull request). Keep the wrappers, the galley's metrics and the theme switch working.

## Acceptance

- [ ] The owner's approval is on the board and recorded in `log.md` with the date.
- [ ] Contrast: every text and icon pair in both themes clears 4.5:1 (3:1 for large text and UI parts), measured with a script over the built tokens and listed in the outcome note.
- [ ] A Playwright test tabs through each screen and asserts a visible focus ring on every stop.
- [ ] A Playwright test with `reducedMotion: "reduce"` asserts no running animation or transition on each screen.
- [ ] A Playwright test at 390 px asserts `document.documentElement.scrollWidth <= window.innerWidth` on each screen.
- [ ] Every figure and label shown comes from the data or the copy; the outcome note lists none invented.
- [ ] `SourcePane.wax.test.ts` and the preview-parity test pass in light and dark; the slide canvas, preview and render are unchanged.
- [ ] The theme spec from brief 10 passes for Light, Dark and System, and a first visit still shows light.
- [ ] `CI=1 npm run check` passes, and `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 10 owns the stylesheet, the tokens' names and the theme switch; this brief changes their values and the layout. Brief 09's wrappers are restyled through the tokens, not rewritten.
- Brief 08's formatter and lint run on every redesign commit.
- Brief 11 changes the API only. A redesign needs nothing from it.
