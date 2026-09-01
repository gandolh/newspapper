# Task 76 — The API health mark loses its word, and hue becomes its only signal

## Context

Found by brief 75 while sweeping the narrow tray, in a file that brief could not
touch. Same species as the two defects brief 75 fixed: a state nobody measured.

`ui/src/components/ApiHealthDot.module.css` hides `.label` at
`max-width: 768px`. Below that, an offline API is a **6px red tick and nothing
else** — the 320px tray renders `NEWSPAPPER … SIGN OUT –`. That contradicts §5's
*state is carried by mark, never by a coloured badge*, in the one place the
chrome breaks its own rule. The `aria-label` survives, so the loss is visual
only.

**The design was settled on 2026-09-01. This brief implements it — the open
questions are already closed, and are recorded in
[design-components.md §5](../../wiki/design-components.md#marks-the-state-system).**

## Facts established — do not re-derive

- **The tick is `--sp-hair` × 1px: a 6 × 1 pixel dash.** Hatching it, filling
  it, or changing its form is invisible. **Any hue-free distinction needs area,
  and hiding the word is what removed the probe's only content.** This is why
  the answer is not a shape variant.
- The component has **three** states today (`loading`, `online`, `offline`) but
  only **two** tones — `loading` and `online` both render `dim`. So the word is
  already the only thing distinguishing "checking" from "up", **at every
  width**, not just narrow.
- The label's `768px` breakpoint is **stale**. Brief 75 rebuilt the tray as two
  courses at `640px`; between 641 and 768 the word is hidden while the tray is
  still one roomy course, for no reason.
- The session cell holds `SessionMenu` + `ApiHealthDot`, `min-width` 6 × 26.

## What to build

1. **Two states, not three.** `loading` folds into `up` — the first paint says
   up, and the mark changes only if a check fails. A state that resolves in
   milliseconds and cannot be acted on does not earn a form in this system.
   Remove the third branch rather than styling it.
2. **Below 640px: render nothing when up; render the tick and `API DOWN` when
   down.** Full word, full contrast, `rubylith` tone. Above 640px behaviour is
   unchanged — tick and word, always visible.
3. **Move the label's breakpoint from 768px to 640px** so it matches the tray
   brief 75 actually built.

Keep `title` and `aria-label` populated in **every** state, including the state
that renders nothing visually — a screen reader must not lose the signal the
sighted narrow view is trading away.

## Files you OWN

- `ui/src/components/ApiHealthDot.tsx` + `ApiHealthDot.module.css`
- `corpus/wiki/chrome.md`

## Files you must NOT touch

- `corpus/wiki/design-components.md` — §5 already records this design; it is
  the spec you are implementing, not a page to edit
- `ui/src/components/Sidebar.module.css` and `Sidebar.tsx` — brief 75 just
  rebuilt the narrow tray as a two-course grid, measured from 240 to 1280
- `ui/src/components/ui/Marks.tsx` and `Marks.module.css` — no new variant is
  needed; that is the point of the settled design
- `ui/src/styles/global.css` — tokens are settled and contrast-measured
- `core/**`, `api/**`, `assets/**`, `ui/src/components/editor/**`,
  `ui/src/components/posts/**`
- The `fmt`/`lint`/`build` scripts, `.prettierrc.json`, `eslint.config.js`
- `corpus/log.md`, `corpus/wiki/status.md` — the controller updates these

## A constraint that already bit this component

The `useEffect` that polls carries `// eslint-disable-next-line
react-hooks/set-state-in-effect` with a reason above it — brief 72 judged this
the case the rule's own message sanctions (subscribing to an external system).
**Keep the suppression and its reason.** If your change makes it unnecessary,
delete both and say so; do not leave a suppression whose reason no longer holds.

## Acceptance

- At **320, 390, 640, 641 and 768px**, the API's state is distinguishable
  **without relying on hue**. Say how you verified each.
- The offline word measures ≥4.5:1 against its surface. Give the ratio.
- `aria-label` conveys the state at every width, including where nothing renders.
- The tray still fits at 320px with no document h-scroll and no unreachable
  route — brief 75's grid is measured and must stay that way.
- Nothing else changes appearance at 1280px.
- `npm run build`, `npm test`, `npm run lint` pass; `npx tsc -p ui --noEmit` at
  0; `bash corpus/lint.sh` clean.
- **State your measurement method exactly.** Brief 75 drove a real Chromium
  viewport with Playwright, already a dependency, and re-ran against the
  production bundle because dev and prod concatenate CSS differently. That is
  the bar.

---

## Outcome — 2026-09-01

Shipped. Gate verified by the controller: build ✓, **659 tests / 47 files** ✓,
lint ✓, `tsc -p ui` at 0 ✓, corpus lint ✓. `Sidebar`, `Marks`, `global.css`,
`core/`, `api/` and `assets/` untouched — checked, not asserted.

Two states. Above 640px, tick + word in both. **Below 640px the probe renders
nothing when up, and tick + `API DOWN` when down.** The up-state word is
**clipped, not removed** — `position: absolute; clip-path: inset(50%)` — so it
stays in the DOM and the accessibility tree at the width where the sighted view
gives it up. `display: none` would have taken it out of both.

**The proof of hue-independence is the best thing in this brief.** Each tray
strip was screenshotted in both states, converted to **greyscale**, and diffed
pixel by pixel. Before the change, the up and down trays differed by **6 grey
pixels at every narrow width** — literally the 6 × 1 tick, i.e. hue was carrying
the entire state. After: 628 differing pixels at 320/390/640, and 146 at
641/768/1280 where the states differ by glyphs rather than presence. A greyscale
diff is the right instrument here because it answers the actual rule — *is this
distinguishable without hue* — rather than the proxy question of whether a
colour changed.

Contrast, verified independently by the controller to three decimals:
**`--rubylith-ink` on board = 5.427:1** for the offline word, `--graphite-soft`
= 5.213:1 for the online one.

Measured in a **real Chromium viewport** against the **production bundle** —
`ui/dist` served over HTTP, `/api/health` forced 200/503 via route interception,
12 widths × 2 states = 24 loads — with the pre-change component built into its
own bundle for comparison: **0 differing subpixels at 1280px**, both states.
The accessibility tree was read through CDP `Accessibility.getFullAXTree`, not
inferred: exactly one node carries the name at every width in both states,
including the seven narrow up-state widths where the probe paints nothing, and
none was flagged `ignored`.

**The brief-72 eslint suppression was checked rather than assumed**, and the
check mattered: removing it still errors, so it stays — but its stated reason
had named `loading` as "the honest first paint", and `loading` no longer exists.
The reason was rewritten to match what ships. That is the instruction working as
intended: *never leave a suppression whose reason no longer holds.* Controller
re-ran the mutation and confirmed the error.

One observation outside its ownership, recorded in
[chrome.md](../../wiki/chrome.md) as accepted rather than filed: at **240px** in
the down state the widened session cell clips the wordmark to `NEWSPAP`. Below
the 320px floor, h-scroll still 0, every route still reachable. Worth knowing
why nobody saw it before — brief 75 measured the tray with the probe 6px wide,
so no sweep had seen the brand cell under a *wide* session cell until this brief
gave the probe a word to carry.
