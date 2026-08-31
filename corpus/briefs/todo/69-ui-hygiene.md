# Task 69 — Two loose ends in `ui/`: the orphaned sources island and the kitchen sink

## Context

Both found by brief 64 while rebuilding the chrome, and correctly left alone —
neither is clothing, and fixing them mid-rebuild would have mixed concerns.

**1. `ui/src/components/sources/SourcesIsland.tsx` is orphaned.** There is no
`/sources` page any more — brief 60 folded feed management into `/articles`, and
this component is now reachable only as a tab rendered inside `ArticlesIsland`.
It is 616 lines, and it was the only file in `ui/` still styling itself with
inline `style={{}}` objects instead of a CSS module. Brief 64 retokenised those
inline colours so nothing dangles, but the file wants a real decision: give it a
module, or merge it into `articles/` as the tab it actually is.

**2. `ui/src/pages/kitchen-sink.astro` is unlinked but ships.** It renders every
primitive and every mark, which makes it genuinely useful as a proof surface —
brief 64 used it as one. But it is a **public route in the production build**
(`ui/dist/kitchen-sink/index.html` exists), reachable by anyone who guesses the
path, and it is not behind the nav or, being a static page, behind anything
else.

## Files you OWN

- `ui/src/components/sources/**`
- `ui/src/components/articles/**` — only as far as the merge requires
- `ui/src/pages/kitchen-sink.astro`, and the build config if you gate it

## Files you must NOT touch

- `core/**`, `api/**`, `assets/**`
- The design system. Brief 64 shipped the chrome; this brief does not restyle
  anything, it relocates and gates. If a merge tempts you to redesign the tab,
  stop.

## What to do

1. **Decide what `SourcesIsland` is** and make the code say it. If it is a tab
   of `/articles`, it belongs in `articles/` with a CSS module like everything
   else. If it is genuinely separate, it needs a reason. Whichever you pick,
   the inline `style={{}}` objects go.
2. **Decide whether the kitchen sink ships.** The options are: keep it and
   accept a public route; exclude it from the production build so it exists only
   in dev; or delete it and lose the proof surface. Recommend one, implement it,
   and record the reasoning — this is a small call but it is a real one, and a
   later reader should not have to re-derive it.
3. If the kitchen sink stays in any form, it must stay **current**: it is the
   only place every primitive and every mark is rendered together, and its value
   is entirely in being complete.

## Acceptance

- No file in `ui/src` styles itself with inline `style={{}}` colour objects.
- The kitchen-sink decision is implemented and recorded, and if it was excluded
  from the build, `ui/dist/kitchen-sink/` no longer exists after `npm run build`.
- Every route still loads and looks exactly as brief 64 left it — this brief
  changes no pixels it does not have to.
- `npm run build`, `npm test`, `npm run lint` pass; `npx tsc -p ui --noEmit`
  stays at 0.
