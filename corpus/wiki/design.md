---
summary: The Mechanical, §1–§4 — the paste-up board's north star, the full colour palette with measured contrast, the Archivo/Spline type hierarchy, and the two shadows. Machine-readable tokens are in this page's frontmatter. §5–§9 continue in design-components.md.
updated: 2026-08-31
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

_Moved from the repo root into the corpus on 2026-08-31 and split in two to fit
the 200-body-line cap. **§5 Components · §6 Motion · §7 Browser surfaces ·
§8 Do's and Don'ts · §9 What the chrome does not yet carry** are in
[design-components.md](./design-components.md); the section numbers are
continuous, so a source comment citing "DESIGN.md §5" still resolves. What was
built against this spec is [chrome.md](./chrome.md); the separate design system
that paints the 1080² slides is [design-systems.md](./design-systems.md). The
frontmatter above is the machine-readable token sidecar this file has always
carried — it is data for design tooling, not corpus prose, and the two corpus
keys sit on top of it._

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

