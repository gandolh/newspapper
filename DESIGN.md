---
name: Newspapper
description: A paste-up board for setting a news carousel — the workstation, not the slides it renders.
colors:
  board: "#fbfbf9"
  paper: "#ffffff"
  graphite: "#2b2b2b"
  graphite-soft: "#6d6a62"
  graphite-tint: "#7a7a76"
  hairline: "#e2e2dd"
  rule: "#cfcfca"
  tick: "#c4c1b8"
  non-photo: "#7fb6e8"
  process-blue: "#1d63a8"
  rubylith: "#e8452e"
  rubylith-ink: "#c0331f"
  grease: "#c0331f"
  wax: "#f5d97a"
  wax-ink: "#3d3416"
  tissue: "#fcfaf2"
  tissue-edge: "#b9b6ac"
  tissue-ink: "#8d8a80"
typography:
  board-title:
    fontFamily: "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "23px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontVariationSettings: "'wdth' 112"
  brand:
    fontFamily: "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.05em"
    fontVariationSettings: "'wdth' 115"
  body:
    fontFamily: "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  label-block:
    fontFamily: "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.22
    letterSpacing: "-0.01em"
  galley:
    fontFamily: "'Spline Sans Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.86
    letterSpacing: "normal"
  field:
    fontFamily: "'Spline Sans Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "9px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.17em"
  mark:
    fontFamily: "'Spline Sans Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "9px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.14em"
rounded:
  all: "0"
spacing:
  hair: "6px"
  half: "13px"
  unit: "26px"
  double: "52px"
  grid: "26px"
components:
  board:
    backgroundColor: "{colors.board}"
    textColor: "{colors.graphite}"
    rounded: "0"
  waxed:
    backgroundColor: "{colors.paper}"
    boxShadow: "2px 3px 0 rgba(43,43,43,.14), 0 0 0 1px {colors.hairline}"
    rounded: "0"
    padding: "20px"
  tissue:
    backgroundColor: "rgba(252,250,242,.70)"
    borderLeft: "1.5px solid {colors.tissue-edge}"
    boxShadow: "-9px 0 22px rgba(43,43,43,.10)"
    backdropFilter: "blur(1.2px)"
    padding: "20px"
  tray-cell:
    backgroundColor: "transparent"
    borderRight: "1px solid {colors.rule}"
    textColor: "{colors.graphite}"
    height: "78px"
  scale-chip:
    backgroundColor: "transparent"
    border: "1px solid {colors.tick}"
    textColor: "{colors.graphite-soft}"
    rounded: "0"
    padding: "6px 0"
  scale-chip-on:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.board}"
  stamp:
    border: "2px solid {colors.rubylith}"
    textColor: "{colors.rubylith-ink}"
    rounded: "0"
    padding: "2px 7px"
    transform: "rotate(-7deg)"
  held-out:
    backgroundColor: "rgba(232,69,46,.34)"
---

# Design System: Newspapper

_Derived 2026-08-27 from the built comps of **The Mechanical**, the direction
chosen after two rounds. Every value below was measured off a rendered screen,
not proposed. **Re-derived 2026-08-31 from the shipped chrome** (brief 64):
five values the comps carried could not hold 4.5:1 once they were text on a
real surface, and they are corrected in place below — each correction says
what it measured and what replaced it. Nothing else moved._

## 1. Overview

**Creative North Star: "The Paste-Up Board"**

Newspapper is a mechanical on a layout artist's board. The slide is pasted down
inside crop marks with a register target at each corner; the markup is waxed on
beside it as a galley; the inspector lives on a **tissue overlay** hinged over
the board, carrying the notes that must never print. A non-photo blue grid is
printed under everything — the ink the process camera cannot see, which is
exactly the right colour for a lattice that governs alignment and must never
appear in output.

The register is a working surface, not a document. It is dense, flat, square-
cornered, and full of production marks that mean something. Depth comes from
two physical facts — a thing waxed to a board casts a hard short shadow, and a
hinged sheet casts a soft directional one — never from ambient decoration.

This world does one job the wizard-era system could not: it separates the
**workstation** from the **artwork**. The 1080² slide is the only place the
warm-industrial theme appears, and it appears inside crop marks, on paper, as
the thing being made. Everything around it is board, graphite, and marks.

**Key Characteristics:**
- Zero radius everywhere. Nothing on a board has a rounded corner.
- One 26px non-photo blue grid; every element snaps to it, and it never carries information.
- State is a **mark**, not a colour badge — rubylith, wax, stamp, grease pencil, tissue corner, hatch.
- Two shadows, both physical: waxed-down (hard, short) and hinged (soft, directional).

## 2. Colors

A board-white ground carrying graphite, with three inks that each own exactly
one job. The palette is small on purpose: a production surface earns its
legibility from marks and alignment, not from hue.

### Ground
- **Board** (`#fbfbf9`): the app background. Warm-neutral white board stock.
- **Paper** (`#ffffff`): anything waxed onto the board — the galley, a caption slip, a post card. Paper is always brighter than board, which is what makes it read as *on* the board.
- **Tissue** (`#fcfaf2` at 70%): the overlay surface. It must stay translucent enough that the blue grid reads through it; opaque tissue is a panel, and a panel is the wrong object.

### Ink
- **Graphite** (`#2b2b2b`): all primary text. Never pure black — a pencil on board isn't.
- **Graphite Soft** (`#6d6a62`): secondary text, field labels, dim values. **This is the floor for text** — 5.21:1 on board, 5.40:1 on paper, 5.17:1 on tissue. The lighter `graphite-tint` (`#7a7a76`) measures **4.16:1** on board (the comps said 4.0:1) and is therefore reserved for non-text use — dividers, tick marks, inactive rules. A decorative glyph is still text: an em-dash standing in for an icon takes `graphite-soft`.
- **Process Blue** (`#1d63a8`): prop values, hashtags, links — the things the markup itself names. 6.3:1 on paper.

### Marks
- **Non-Photo Blue** (`#7fb6e8` at 40%): the 26px grid, and nothing else, ever.
- **Rubylith** (`#e8452e`): the masking film. Held-out slides, disabled sorts, the published stamp. Applied as a 34% wash over the thing it masks, or as a 2px outline for the stamp. **The film is 3.81:1 on board and cannot carry a word** — not as ink (3.81:1), not inverted with graphite on it (3.59:1), not inverted with paper on it (3.95:1). It is a wash and a border, never a letter.
- **Rubylith Ink** (`#c0331f`): the darker draw of the same ink, and the only rubylith that may be text — 5.43:1 on board, 5.62:1 on paper, and 5.43:1 the other way round when a chip inverts to solid. Every rubylith *word* is set in it: the stamp, an error line, a destructive control. (It is the same value as `grease`; they are one ink used for two jobs, and both are named so a later change to one does not silently move the other.)
- **Grease** (`#c0331f`): grease-pencil findings on the tissue, and the leader line pointing at what the note is about.
- **Wax** (`#f5d97a`) with **Wax Ink** (`#3d3416`): the current selection in the galley. Wax is the one warm note in the system and it means exactly one thing.

### Rules and edges
- **Hairline** (`#e2e2dd`): the 1px outline on every waxed surface.
- **Rule** (`#cfcfca`): internal dividers, tray compartment walls.
- **Tick** (`#c4c1b8`): dimension lines, scale-chip borders, inactive edges.
- **Tissue Edge** (`#b9b6ac`) / **Tissue Ink** (`#8d8a80`): the overlay's hinge line and its tick marks. **Not its labels** — tissue ink measures 3.31:1 on the 70% tissue, so the sheet writes in `graphite-soft` (5.17:1) like everything else. The Ink Floor Rule has no exception for being on tissue.

### Named Rules

**The Non-Photo Rule.** The blue grid is the ink the camera cannot see. It may carry alignment and nothing else — no state, no meaning, no emphasis. Corollary: nothing that matters is rendered in `non-photo` on the board.

**The One Mark Rule.** A single vocabulary per idea. Rubylith is the *only* way the app says "held out", whether that is a slide excluded from the render, a component you cannot use yet, or a post that will not compile. Never invent a second treatment for the same state on a different screen.

**The Ink Floor Rule.** `graphite-soft` (`#6d6a62`) is the lightest colour any text may take on board or paper. Anything lighter is a mark, not a word.

## 3. Typography

**Chrome face:** Archivo (variable, `wdth` 62–125, `wght` 100–900), self-hosted.
**Galley face:** Spline Sans Mono (variable), self-hosted.
**Slide face:** Inter — *inside the 1080² artwork only*, never in the chrome.

Archivo's width axis is the reason it is here. A drawing sheet's title block is
set wide; a tray label is set narrow; a body line is normal. One family covers
the whole board because it can change proportion, which Inter cannot. Keeping
Inter out of the chrome is also what keeps the artwork visually separate from
the desk it sits on.

### Hierarchy
- **Board Title** (800, 23px, `wdth` 112, -0.02em): the selected node's name on the tissue, the page name in a title block. The heaviest type in the chrome.
- **Brand** (800, 14px, `wdth` 115, +0.05em, uppercase): the wordmark in the tray head. The only uppercase Archivo in the system.
- **Label Block** (700, 13px, -0.01em): post titles in the flat file, card headings.
- **Body** (500, 14px, 1.5): document titles, running interface text. Cap prose at 65–75ch.
- **Galley** (400, 12.5px mono, 1.86): the `.wzd` source. The generous line-height is not decoration — lint marks and wax highlights need room to sit on a line without touching its neighbours.
- **Field** (500, 9px mono, +0.17em, uppercase): inspector field labels, tray captions, dimension callouts.
- **Mark** (700, 9px mono, +0.14em, uppercase): stamps, state words, the "held out" legend.

### The Tray Showing

The component palette is a **specimen showing**, not a list of equal chips: each
component renders as the thing it produces. `Heading` is set at 17px/800,
`Text` at 12px/400, `Kicker` at 9px uppercase tracked, `Quote` in italic, `Stat`
as a heavy numeral. You choose a component by recognising its shape.

### Named Rules

**The Width-Not-Family Rule.** Contrast comes from Archivo's `wdth` and `wght` axes. Never pair a second chrome face, and never reach for Inter — Inter is the artwork's voice and borrowing it collapses the distinction the whole system is built on.

**The Showing Rule.** Anywhere the app offers a choice between typographic outcomes — a component, a size, an emphasis — render the outcome, not its name.

## 4. Elevation

Two shadows exist. Both describe a physical relationship, and neither is
decoration. Nothing else in the system casts one.

### Shadow Vocabulary
- **Waxed down** (`box-shadow: 2px 3px 0 rgba(43,43,43,.14), 0 0 0 1px #e2e2dd`): anything adhered to the board — the galley, a caption slip, a post card. Hard, short, offset down-right, zero blur, always paired with the 1px hairline. It is the shadow of a thing lying *on* something.
- **Hinged** (`box-shadow: -9px 0 22px rgba(43,43,43,.10)`, `backdrop-filter: blur(1.2px)`): the tissue overlay only. Soft and directional away from the hinge, because the sheet is lifted at one edge.

### Named Rules

**The Two Shadows Rule.** If an element is not waxed to the board and is not the tissue, it has no shadow. A modal, a toast, a dropdown — each has to decide which of the two it is, and take that one.

**The Flat Corner Rule.** `border-radius` is `0` throughout the chrome. Boards, slips, chips, inputs, buttons, stamps. A rounded corner is the single fastest way to make this world read as a generic dashboard wearing a costume.

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

`animejs` 4.5.0 is the engine — MIT, no dependencies, framework-agnostic, so one
import serves both an Astro `<script>` and a React island. See
[corpus/wiki/decisions-engineering.md](corpus/wiki/decisions-engineering.md) for
why motion-primitives and smoothui were rejected.

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

## 9. What the shipped chrome does not yet carry

Brief 64 built §1–§7 across every route. Four things described above have no
implementation yet, each because it needs a change to a structure another
brief owns rather than a change of clothing:

- **The scale-chip row for constrained props** (§5, Fields). The inspector
  still selects an enum through `Select`. The chip row is the right control
  and the vocabulary is already in the app — the keyword filter on `/posts`
  and the tab rows on `/articles` and the narrow editor are scale chips — but
  swapping the inspector's control changes the pane brief 59 owns.
- **The strip** (§5). There is no thumbnail strip in the editor to style; the
  preview is a single scrolling column of stages.
- **The flat file as a grid of boards** (§5). `/posts` is the list brief 62
  shipped, restyled as boards. Every mark in the table is on it — stamp,
  tissue corner, crop marks, mono rows — but the layout is a row, not a grid.
- **The wax half of the compile** (§6). The moment animates the stage frame
  re-setting. "The changed lines take the wax briefly" needs a line diff the
  editor does not keep; the wax still marks the selected run, continuously.

The tissue also hinges on **selection change** rather than on source focus:
selecting a node swings the sheet down with the notes already on it. Lifting
it off the board when the source takes focus would move a pane, and the
three-pane layout is brief 59's.
