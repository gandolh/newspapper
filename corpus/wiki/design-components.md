---
summary: The Mechanical, §5–§9 — the component vocabulary (board, tray, galley, stage, tissue, marks), the two authored animations, browser surfaces, the do/don't list, and what the shipped chrome does not yet carry. §1–§4 and the tokens are in design.md.
updated: 2026-09-01
---

# Design System: Newspapper — components, motion, rules

The second half of **The Mechanical**. [design.md](./design.md) carries §1–§4 —
the north star, the palette, the type hierarchy, the two shadows — and the
machine-readable token block in its frontmatter. Section numbers are continuous
across the two pages, so a source comment citing "DESIGN.md §5" lands here.

What was actually built against this spec is [chrome.md](./chrome.md).

## 5. Components

### The Board
The app ground. `#fbfbf9` under a 26px non-photo blue lattice drawn as two `repeating-linear-gradient`s at 40% alpha. Every region, slip, thumbnail and galley aligns to that pitch at every breakpoint.

### The Tray (component palette / nav)
A full-width strip at the top of the board, 78px, closed by a 1.5px graphite rule. Compartments divided by 1px `rule`, each holding one component as a **showing** plus a 8.5px mono caption. An unavailable compartment takes a 45° hatch (`repeating-linear-gradient(45deg, transparent 0 5px, rgba(43,43,43,.07) 5px 10px)`) — the same "held out" idea as rubylith, at tray scale. The comps also dropped it to 42% opacity; that puts a 9px caption at ~3.1:1, so the ink stays full and the hatch carries the state on its own.

### The Galley (source pane)
A **waxed** paper strip, 372px, top-aligned, with a graphite tab carrying the filename. The bottom edge is torn, not cut — a clip-path deckle that says the copy continues. Syntax colour follows **casing**: lowercase document tags in `graphite-soft`, capitalised components in graphite 700, prop values in `process-blue`. (The comps set the document tags in `#9d9d97`, which is 2.6:1 on paper — recede by weight and case, not by dropping below the ink floor.) The selected line is waxed (`#f5d97a`, bled 20px past the text on both sides); a lint-flagged line takes a 16% rubylith wash.

### The Stage (canvas)
The 1080² slide inside 30px of clearance, with **crop marks** — 1px L-ticks at each corner — and a **register target** (a 22px crosshair inside a circle) at each of the four corners. A dimension line across the top states the real size. The slide itself is warm-industrial and untouched by this system.

The preview scales by **integer factors only** (½, ¼). A fractionally resampled preview is not a preview.

### The Strip (slide thumbnails)
52px squares at one **fixed scale on a shared baseline**, ordinals bottom-right in 8px mono. The current slide takes a 2px graphite outline at 2px offset. A held-out slide takes the rubylith wash. Two slides can be laid over each other in a **registered overlay** to check they read as siblings.

### The Tissue (inspector)
282px, hinged from the top with a dashed hinge line, `rgba(252,250,242,.70)` over the board so the grid reads through. It carries: the selected node's name at Board Title size, its path in 9.5px mono, the prop fields, and the grease-pencil notes.

**It lifts.** Focus the source and the tissue hinges up off the board, uncovering the whole stage; select a node and it drops back with the notes already on it.

### Fields (constrained props)
A **scale chip row** — equal chips, 1px `tick` border, 9.5px mono, zero radius, 4px gutters. The active chip inverts to solid graphite on board. A destructive or masking value (`Hold out`) inverts to solid rubylith instead. There is **no raw CSS field** and no "advanced" section; adding one is a regression.

### Marks (the state system)
State is carried by mark, never by a coloured badge:

| State | Mark |
|---|---|
| Selected (in source) | Wax highlight, bled past the text |
| Selected (node) | Lifts off the board with its waxed shadow |
| Draft | Tissue corner folded over the board's top-right |
| Published | Rubylith rubber stamp, 2px `rubylith` outline, `rubylith-ink` word, rotated -7° |
| Held out / disabled / won't compile | Rubylith wash, or 45° hatch at tray scale |
| Finding | Grease-pencil note on the tissue **plus a leader line** to the node |
| Render frame | Crop marks |
| Alignment | Register targets |

### Notes and findings
A finding is a grease-pencil block on the tissue: a 9px mono heading, the note in 10px mono `grease`, and a **2px leader line** running from the tissue's edge to the node it concerns, tipped with a small arrowhead. The note states the measurement — "Heading runs 3 characters past the measure at xl" — not a severity word.

### The Flat File (`/posts`)
Boards in a grid, each a waxed card: crop marks around the slide thumbnail, then **one rigid label block, identical on every board** — title (2 lines, clamped), then two mono rows of theme / slide count and date / state. Drafts keep their tissue corner; published boards carry the stamp; a board that will not compile wears the same rubylith the editor uses. No board is styled differently from another; the marks do all the differentiating.

### Named Rules

**The Tissue Rule.** Notes live on an overlay that lifts. The canvas is never permanently occluded by an inspector.

**The Measured Note Rule.** A finding pins to its node on a leader line and states the number. "Warning" is not a note.

**The Fixed Scale Rule.** Every slide thumbnail in a set renders at one scale on a shared baseline, so the strip and the flat file are true comparisons.

**The One Grid Rule.** 26px, everywhere, at every breakpoint. Elements snap to it; the grid never carries information.

## 6. Motion

`animejs` 4.5.0 is the engine — MIT, no dependencies, framework-agnostic. It was
picked while the UI was still Astro, where one import had to serve both an
Astro `<script>` and a React island; the SPA kept it because the reasons that
ruled out the alternatives did not change. See
[decisions-engineering.md](./decisions-engineering.md#animejs-is-the-motion-engine-tailwind-bound-kits-are-references-only)
for why motion-primitives and smoothui were rejected.

**One authored moment per surface.** On the editor it is **the compile**: typing
settles, the changed lines take the wax briefly, and the stage re-sets. On the
tissue it is **the hinge** — a real rotation about the top edge, not a fade.

Everything else is instant. In particular:

- **The canvas never moves.** The preview must not animate in a way the renderer cannot reproduce.
- Every animation is gated behind `prefers-reduced-motion`; the reduced path is the end state, immediately.
- No scattered hover effects, no entrance animation on every panel, no scroll reveals.

## 7. Browser surfaces

The parts nobody draws still belong to the system. Theme all of them:
text selection (wax on wax-ink), the caret (graphite), scrollbars (board track,
`tick` thumb, zero radius), focus rings (2px `process-blue`, 2px offset, square),
underline offset, and `font-variant-numeric: tabular-nums` on every column of
digits — slide counts, dates, dimensions, ordinals.

## 8. Do's and Don'ts

### Do:
- **Do** snap everything to the 26px grid, at every breakpoint (The One Grid Rule).
- **Do** use a mark for state — rubylith, wax, stamp, tissue corner, hatch — and keep one mark per idea (The One Mark Rule).
- **Do** render the outcome when offering a typographic choice (The Showing Rule).
- **Do** keep `graphite-soft` as the lightest text colour anywhere (The Ink Floor Rule).
- **Do** give findings a leader line and a number (The Measured Note Rule).
- **Do** scale the preview by integer factors only.
- **Do** give every interactive element its full state set: default, hover, focus-visible, active, disabled, loading — and design the empty and error states before the happy path.

### Don't:
- **Don't** round a corner. Anywhere. (The Flat Corner Rule.)
- **Don't** put anything meaningful in non-photo blue, and don't let the grid encode state (The Non-Photo Rule).
- **Don't** add a third shadow, or apply either of the two as decoration on a resting element (The Two Shadows Rule).
- **Don't** use Inter in the chrome — it is the artwork's voice, and the separation is the point (The Width-Not-Family Rule).
- **Don't** add a raw CSS field, a `style` prop, or an "advanced" escape hatch to the inspector.
- **Don't** animate the canvas, and don't scatter hover effects in place of the one authored moment.
- **Don't** invent a second treatment for a state that already has a mark.
- **Don't** reintroduce the wizard-era vocabulary: the stepper, the terracotta accent as *chrome*, the rounded card, the eyebrow label above a section.

## 9. What the shipped chrome does not carry

Brief 64 built §1–§7 across every route. Four things described above had no
implementation, each blocked on changing a structure rather than clothing. On
2026-09-01 they were split: two are [brief
74](../briefs/todo/74-finish-the-chrome.md), and **two are dropped** — not
pending.

**Briefed (74):**

- **The scale-chip row for constrained props** (§5, Fields). The inspector still
  selects an enum through `Select`. The vocabulary is already in the app — the
  keyword filter on `/posts` and the tab rows on `/articles` and the narrow
  editor are scale chips — so this is using an existing control in the one pane
  that lacks it.
- **The flat file as a grid of boards** (§5). `/posts` carries every mark
  already — stamp, tissue corner, crop marks, mono rows — but lays them out as a
  row where the spec calls for a grid.

**Dropped, deliberately:**

- **The strip** (§5). There is no thumbnail strip in the editor; the preview is
  a single scrolling column of stages. Building one means inventing a structure
  to serve a decoration.
- **The wax half of the compile** (§6). "The changed lines take the wax briefly"
  needs the editor to retain a line diff it does not keep — making the editor
  hold state purely so something can flash. The moment still animates the stage
  re-setting, and the wax still marks the selected run, continuously.

The shared reason: a decoration that requires new structure is the point where
the spec is asking for more than it is worth. Recording that here so their
absence reads as a decision rather than unfinished work.

The tissue also hinges on **selection change** rather than on source focus:
selecting a node swings the sheet down with the notes already on it. Lifting it
off the board when the source takes focus would move a pane, and the three-pane
layout is brief 59's.
