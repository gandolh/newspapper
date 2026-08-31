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

---

## Outcome — 2026-08-31

Both loose ends closed. Gate verified by the controller: build ✓, **650 tests /
46 files** ✓, lint ✓, `tsc -p ui` at 0 ✓, corpus lint ✓. (The single core
failure this brief's agent reported was mid-flight interference — brief 67 was
editing `interpreter.ts` in the same tree at the time. The suite is clean now.)

**`SourcesIsland` is a panel of `/articles`, and the code now says so.** Moved
by `git mv` to `ui/src/components/articles/SourcesPanel.tsx` with a real CSS
module; `ui/src/components/sources/` is gone. All 22 inline `style={{}}` objects
became module rules — where a literal already equalled a token it took the token
(6 → `--sp-hair`, 13 → `--sp-half`), and every other literal was kept exactly as
written, because this brief relocated styling rather than re-picking it.

Two things found in the move that were worth more than the move: a **nested
`ToastProvider`** was mounting a second Base UI provider and a second fixed
viewport inside `ArticlesIsland`'s own (both at the same position, so nothing
moved — it was invisible), and **90 lines of dead code** (`SourceRow` /
`SourceRowProps`) that nothing rendered, because the table inlined its own cells.
`PingBadge` → `PingMark`: it was already a mark, and its name referenced the
`Badge` primitive brief 64 deleted.

**The kitchen sink is gated to dev, not deleted and not shipped.** It moved to
`ui/src/proof/kitchen-sink.astro` and is injected as a route only when the Astro
command is `dev`. Verified: after a clean rebuild `ui/dist/kitchen-sink/` does
not exist and the island is in no chunk.

The reasoning, which is the part worth keeping: it is the one page in the app
that renders with **no session at all** — it calls no API, so the client-side 401
redirect that sends every other route to `/login` never fires. That was measured,
not assumed: `/kitchen-sink` rendered the full proof sheet with the tray reading
"SIGN IN". Harmless on loopback, but
[decisions-security.md](../../wiki/decisions-security.md) opens by naming the
loopback assumption as the first thing to revisit if this is ever exposed, so
"fine on localhost" is an argument with a known expiry date. Deleting it was
rejected for the opposite reason — it is the only surface where every primitive
and every mark render together, which is what brief 64 used it for.

**No route's appearance changed, and it was measured rather than eyeballed.**
The kitchen sink is byte-identical before and after the move (same md5). For the
sources tab the agent built a harness holding two identical DOM trees under the
real tokens — one with the original inline styles, one with the new classes —
and diffed `getComputedStyle` across every property: **10,051 properties on 19
elements, zero differences.**

**One finding was fixed by the controller rather than filed**, being one line
against an invisible label: `.tab:hover` is specificity (0,1,1) and out-ranked
`.tabActive` at (0,1,0), so hovering the active tab painted graphite on graphite
— **1:1, the word gone** — a regression from brief 64 that this brief's
measurement caught. `.tabActive:hover` at (0,2,0) now wins.

The one surviving inline colour, `SettingsIsland.tsx:99`, is the theme swatch
read from design-system JSON at runtime. It cannot become a static rule and was
correctly left alone.

Noted for later, not acted on: the RSS-URL cell still uses a bare `monospace`
stack rather than the chrome's `--font-galley`. Changing it would have moved
pixels, which this brief was forbidden to do.
