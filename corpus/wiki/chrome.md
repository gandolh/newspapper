---
summary: The Mechanical — the app chrome as shipped: tokens, the mark set, the tray, the two authored animations, and why it shares nothing with the slide themes.
updated: 2026-08-31
---

# The app chrome — The Mechanical

A paste-up board, chosen by the owner on 2026-08-27 after two direction rounds
and built in brief 64. It shares no token, colour or typeface with the
[slide themes](./design-systems.md), and that is the point: the 1080² artwork
appears in exactly one place in the app — on paper, inside crop marks, as the
thing being made — and everything around it is board, graphite and production
marks.

Canonical reference: **[design.md](./design.md)** (§1–§4, plus the token block)
and **[design-components.md](./design-components.md)** (§5–§9), re-derived from
the shipped chrome on 2026-08-31 and moved out of the repo-root `DESIGN.md` by
brief 63. §2 records the five comp values that could not hold 4.5:1 as real
text; §9 records what the chrome does not yet carry.

- **Tokens** — `:root` in `ui/src/styles/global.css`. Board `#fbfbf9` under a
  26px non-photo blue lattice, paper for anything waxed onto it, 70% tissue
  for the inspector; graphite `#2b2b2b` text with `graphite-soft` `#6d6a62`
  the floor and `graphite-tint` `#7a7a76` for rules and ticks only. **No
  radius scale** — deleted, and nothing in `ui/` sets `border-radius`. Two
  shadows, `--shadow-waxed` and `--shadow-hinged`, both physical.
- **Typefaces** — Archivo (variable `wdth`/`wght`) and Spline Sans Mono,
  self-hosted in `ui/public/fonts/`, served from Vite's public dir at
  `/fonts/*`. Inter is
  declared for one consumer only, the preview canvas, which must set the type
  Chromium will; `assets/fonts/` (API, `/assets/fonts/*`) is the renderer's
  separate copy.
- **State is a mark, never a badge.** `Badge`, `Stepper` and `Spinner` are
  gone; `ui/src/components/ui/Marks.tsx` draws each mark once — `Mark`,
  `Stamp` (published), `TissueCorner` (draft), `HeldOut`/`HATCH` (held out,
  disabled, won't compile — the *only* way the app says that), `WAX`,
  `CropMarks`, `RegisterTargets`, `Finding`.
- **Two animations, no more** — `ui/src/lib/motion.ts`, on
  [anime.js](./decisions-engineering.md#animejs-is-the-motion-engine-tailwind-bound-kits-are-references-only)
  4.5.0: *the compile* (the stage frame re-sets; never the canvas) and *the
  hinge* (the tissue rotates about its top edge on a selection change). Both
  jump to the end state under `prefers-reduced-motion` — asserted by
  `ui/src/lib/motion.test.ts`.
- **The tray** is `ui/src/components/Sidebar.tsx`: a full-width 78px strip of *showings* —
  each compartment renders what its route produces, not a label — pointing at
  `/`, `/posts`, `/articles`, `/settings`, and `/login` via `SessionMenu`.
- **Primitives** in `ui/src/components/ui/` still sit on Base UI with
  unchanged wrapper APIs (`Select`'s `onValueChange`, `Toggle`'s
  `onCheckedChange`); keep raw `<input>`/`<button>`/dialog elements out of
  feature components. `/kitchen-sink` is the proof surface — every
  primitive and mark on one board — and it exists **only under `vite dev`**,
  via the `proofSheet` plugin in `ui/vite.config.ts`. Keep it current.
