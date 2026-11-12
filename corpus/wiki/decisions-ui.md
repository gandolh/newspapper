---
summary: The UI's styling calls - Tailwind 4 over Base UI (what was rejected, the closed theme, no Preflight, the root size on body, breakpoints, feed HTML as one named block) and the Light / Dark / System switch (kept on the device, light on a first visit, the slide canvas never follows).
updated: 2026-11-12
---

# Decisions - UI styling

## The whole UI is Tailwind 4 over Base UI
_2026-11-12, brief 10; the owner's call of 2026-11-09 (Q17-Q20, Q44, Q62)._ `ui/` was the one app in the estate on
CSS Modules (43 stylesheets, 4,367 lines). It is now Tailwind 4.3.5 in one stylesheet, `ui/src/styles/index.css`, with
`clsx` and `tailwind-merge` behind `ui/src/lib/cn.ts`. The looks did not change: before and after screenshots at 1280
and 390 px match to the pixel but for the hover media query below.

- **A closed theme.** `@theme static` clears Tailwind's colour, text, radius, shadow, font, tracking, leading and spacing
  scales and defines only Newspapper's 56 tokens under their own names (`bg-paper`, `text-graphite-soft`, `p-unit`,
  `text-label`, `shadow-waxed`), plus `graphite-deep` (the primary chip's hover, was a literal), `shadow-lifted` and
  `slide-paper` / `slide-ink`. `--spacing-0` is the one numeric spacing, because `inset-0` and `p-0` need it.
  A test (`index.css.test.ts`) shows `bg-red-500`, `text-sm` and `rounded-md` produce no rule. `cn()` is told every
  custom name, or tailwind-merge reads `text-label` as a colour.
- **No Preflight.** `theme.css` and `utilities.css` only; the reset in `@layer base` is the render's own
  (`core/src/templates/interpreter.ts`), ported unchanged. Without Preflight a `border-dashed` gives the other sides a 3px
  default border: dash one side with `[border-top-style:dashed]`.
- **The root size is the browser's;** `body` carries 14px (a pixel size on `html` overrides the reader's setting).
- **Breakpoints are Tailwind's own:** `max-sm:` and `max-md:` (one-pixel edge accepted at 640 and 768, pinned by
  `Sidebar.chromium.test.ts`). The Reader's 1099px stage has no equivalent: `@custom-variant reader-narrow`.
- **Feed HTML** (sanitized, no classes) is one named `@layer components` block, `.item-prose`, not a typography plugin.
- **The galley is utilities,** with `SourcePane.wax.test.ts` as the oracle (a deliberately wrong z-index fails it five
  ways). One ink per token is chosen in code, where the CSS used zero-specificity `:where()` rules; the torn edge is one
  `@utility deckle`.
- **The proof sheet's utilities** reach the production CSS (Tailwind scans the tree, not the import graph): 183 bytes,
  43 gzipped. The JS guard stays.
- **Rejected:** a styled kit (shadcn-style: it brings its own look and a second source of tokens); keeping CSS Modules
  (two systems in one repo); Preflight (it adds nothing the app uses and could shift a native control).
- **The preview is guarded:** `previewParity.chromium.test.ts` compares the canvas with the render node for node, so a
  global rule reaching inside the 1080 square fails a test.

## Light, Dark and System for the chrome
_2026-11-12, brief 10; Q18 (owner, 2026-11-10)._ The chrome follows a Light / Dark / System choice in Settings
(Appearance, a `RadioGroup` of chips). `data-theme` on `<html>` holds `light` or `dark`; System resolves
`prefers-color-scheme` and follows a live change. **A first visit is light,** whatever the system asks. The choice is kept
on the device (`localStorage`, `newspapper-appearance`), because the settings table holds only the slide theme and a
per-user setting would be an `api/` change. An inline script in `ui/index.html` sets the attribute before first paint;
`appearance.test.ts` keeps it in step with `lib/appearance.ts`, and with the stylesheet's `--color-board` and the
`theme-color` meta. **The slide canvas, the preview and the render do not follow it:** the canvas has its own ground and
ink tokens, and a Chromium test shows every node computes the same in both themes. The dark values are a first
proposal (the board and paper go dark, graphite goes light, the marks keep their hue); [design.md](./design.md) lists
them, and brief 12 (the redesign) re-tunes them on the board.
