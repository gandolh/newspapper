# Task 72 — The ten React Compiler findings brief 68 had to suppress

## Context

Brief 68 turned ESLint on for `ui/` for the first time — and discovered that
`eslint.config.js` had enabled **zero rules** for the project's entire history,
so nothing in any workspace had ever been linted. With
`eslint-plugin-react-hooks` now real, ten findings appeared that brief 68 was
forbidden to fix, because every fix restructures an effect and that brief was
tooling-only.

They are suppressed at the config level, not at the call sites, so they are
invisible while you work. That is the point of this brief.

**`react-hooks/set-state-in-effect` — 8 sites:**
`ApiHealthDot` · `ArticlesIsland` · `SourcesPanel` (×2) · `EditorIsland` ·
`ImagePicker` · `InspectorPane` · `SettingsIsland`

**`react-hooks/refs` — 2 sites:** `EditorIsland.tsx:142` and `:144` — refs read
during render.

Turn each rule back on in `eslint.config.js` to see the current list with exact
lines; do not work from the list above, it will have drifted.

## What these rules are actually telling you

`set-state-in-effect` fires where a component renders, then immediately sets
state in an effect, causing a second render. Usually the state either belongs in
the render (derived, not stored), belongs above (lifted), or belongs to an event
rather than to a lifecycle. **Sometimes the effect is right** — data fetched on
mount genuinely arrives later.

So this is **not** a mechanical cleanup, and a blanket rewrite would be worse
than the suppression. Judge each site. Some will be real double-renders worth
removing; some will be correct as written and should get a call-site
`eslint-disable-next-line` **with the reason on the line above it**, which is
strictly better than the config-level blanket that hides them all today.

`refs` fires on reading a ref during render, which is not safe under concurrent
rendering. These two are in `EditorIsland`, which brief 59 built and which is the
most intricate component in the app — read it before you change it.

## Files you OWN

- `ui/src/components/**` — only the files the rules actually flag
- `eslint.config.js` — only to re-enable the two rules

## Files you must NOT touch

- `core/**`, `api/**`, `assets/**`
- `ui/src/styles/global.css` and `ui/src/components/ui/**` — brief 64's chrome
  was measured; **this brief changes no pixels**
- The Prettier config, the `fmt`/`lint`/`build` scripts — brief 68 settled those,
  and `npm run build` runs `fmt:check` first. Keep it.

## What to do

1. Re-enable both rules and get the real list.
2. **Fix what should be fixed; suppress at the call site, with a reason, what
   should not.** A config-level blanket is not an acceptable end state for either
   rule — that is what this brief exists to undo.
3. Neither rule may end up `'off'` globally when you are done.
4. Every behaviour-changing fix needs a test, or an explanation of why the
   existing tests already cover it.

## A caution specific to this brief

You are changing effects in the editor, which is where the app's state actually
lives. A double render is a performance smell; a **broken** effect is a
corrupted document. If a site is not clearly improvable, suppressing it with an
honest reason is the correct outcome, not a failure. Say which you did for each
of the ten.

## Acceptance

- `react-hooks/set-state-in-effect` and `react-hooks/refs` are both enabled in
  `eslint.config.js`, and `npm run lint` passes.
- Every remaining suppression is at a call site and carries a reason.
- The editor still works: open a post, type, watch the preview update, reorder a
  slide, select a node, change a prop. Say that you did this.
- `npm run build`, `npm test`, `npm run lint` pass; `npx tsc -p ui --noEmit` at 0.
