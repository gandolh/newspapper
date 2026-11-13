---
summary: The Mechanical as the Contact sheet shipped it, §1–§4 — the paste-up board's north star, the colour palette with measured contrast in both themes, the Archivo/Spline type hierarchy (one 12px sentence-case label), and the two shadows. Machine-readable tokens are in this page's frontmatter. §5–§9 continue in design-components.md.
updated: 2026-11-13
name: Newspapper
description: A paste-up board for setting a news carousel — the workstation, not the slides it renders.
colors:
  board: "#e9e8e3"
  paper: "#ffffff"
  graphite: "#232322"
  graphite-soft: "#5c5952"
  graphite-tint: "#7a7a76"
  hairline: "#c8c7bf"
  rule: "#c6c5bd"
  tick: "#b5b2a9"
  field-edge: "#85827a"
  non-photo: "#7fb6e8"
  non-photo-select: "#99c5ed"
  process-blue: "#1a5c9e"
  rubylith: "#e8452e"
  rubylith-ink: "#b52f1d"
  grease: "#b52f1d"
  wax: "#f5d97a"
  wax-ink: "#3d3416"
  tissue: "#fbf9f1"
  tissue-edge: "#a29f95"
  tissue-ink: "#8d8a80"
typography:
  board-title:
    fontFamily: "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.154
    letterSpacing: "0"
    fontVariationSettings: "'wdth' 125"
  head:
    fontFamily: "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1.2
    fontVariationSettings: "'wdth' 112"
  section:
    fontFamily: "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    lineHeight: 1.25
    fontVariationSettings: "'wdth' 112"
  brand:
    fontFamily: "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.06em"
    fontVariationSettings: "'wdth' 115"
  body:
    fontFamily: "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.43
  hint:
    fontFamily: "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.385
  label:
    fontFamily: "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.333
  galley:
    fontFamily: "'Spline Sans Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.846
rounded:
  all: "0"
spacing:
  hair: "6px"
  half: "13px"
  unit: "26px"
  double: "52px"
  tight: "8px"
  snug: "12px"
  card: "16px"
  column: "24px"
  gutter: "28px"
  grid: "26px"
components:
  board:
    backgroundColor: "{colors.board}"
    textColor: "{colors.graphite}"
    rounded: "0"
  waxed:
    backgroundColor: "{colors.paper}"
    boxShadow: "2px 3px 0 rgba(35,35,34,.16), 0 0 0 1px {colors.hairline}"
    rounded: "0"
    padding: "20px"
  tissue:
    backgroundColor: "rgba(251,249,241,.90)"
    border: "1px solid {colors.tissue-edge}"
    boxShadow: "-9px 0 22px rgba(35,35,34,.12)"
    padding: "12px 16px"
  tray-cell:
    backgroundColor: "transparent"
    borderLeft: "1px solid {colors.hairline}"
    textColor: "{colors.graphite-soft}"
    height: "56px"
  scale-chip:
    backgroundColor: "transparent"
    border: "1px solid {colors.field-edge}"
    textColor: "{colors.graphite}"
    rounded: "0"
    padding: "0 12px"
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

_Redrawn 2026-11-13 as the **Contact sheet**, the direction the owner approved on the estate redesign board; this page records what shipped (brief 12) and the old lines of the reopened decisions are kept in [decisions.md](./decisions.md). The Mechanical stays the world; the Ink Floor Rule, zero radius and the slide themes stand._

_Derived 2026-08-27 from the built comps of **The Mechanical**, the direction
chosen after two rounds. Every value below was measured off a rendered screen,
not proposed. **Re-derived 2026-08-31 from the shipped chrome** (2026-08-31):
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
inside crop marks with a register target at each corner of the stage; the markup is
laid on beside it as a galley; the inspector lives on a **tissue sheet** over
the board, carrying the notes that must never print. A non-photo blue grid is
printed under the stage only — the ink the process camera cannot see, which is
exactly the right colour for a lattice that governs alignment and must never
appear in output. Posts and the Reader sit on a plain, deeper board.

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
- One 26px non-photo blue grid, under the stage only (32% in light, 14% in dark); it never carries information.
- State is a **mark**, not a colour badge — rubylith, wax, stamp, grease pencil, tissue corner, hatch.
- Two shadows, both physical: waxed-down (hard, short) and hinged (soft, directional).

## 2. Colors

A board-white ground carrying graphite, with three inks that each own exactly
one job. The palette is small on purpose: a production surface earns its
legibility from marks and alignment, not from hue.

### Ground
- **Board** (`#e9e8e3`): the app background, deeper than the cards so paper stands off it.
- **Paper** (`#ffffff`): the band, the galley, the palette, the strip, every post and Reader card. Paper is always brighter than board, which is what makes it read as *on* the board (1.23:1; the card edge adds the rest).
- **Tissue** (`#fbf9f1` at 90%): the inspector sheet. It reads as a sheet, not as glass; since 2026-11-13 the grid no longer prints under it.

### Ink
- **Graphite** (`#232322`): all primary text. Never pure black — a pencil on board isn't.
- **Graphite Soft** (`#5c5952`): secondary text, labels, hints, counts. **This is the floor for text** — 5.69:1 on board, 6.99:1 on paper, 6.52:1 on tissue. The lighter `graphite-tint` (`#7a7a76`) is for ticks and the hatch only. A decorative glyph is still text: it takes `graphite-soft`.
- **Process Blue** (`#1a5c9e`): prop values, links, the check and pulse icons, and the focus ring (6.84:1 on paper). (`#1d63a8`): prop values, hashtags, links — the things the markup itself names. 6.3:1 on paper.

### Marks
- **Non-Photo Blue** (`#7fb6e8` at 32%): the 26px grid, on the stage only. Since 2026-11-06 also, as **Non-Photo Select** (`#99c5ed`, the same blue at 80% over paper, solid), the ground of a text selection, with graphite on it (8.66:1 light, 6.10:1 dark). Nothing else.
- **Rubylith** (`#e8452e`): the masking film. Held-out slides, disabled sorts, the published stamp. Applied as a 34% wash over the thing it masks, or as a 2px outline for the stamp. **The film is 3.22:1 on the board and cannot carry a word** — not as ink (3.22:1 light), not inverted with graphite on it (3.99:1), not inverted with paper on it (3.95:1). It is a wash and a border, never a letter.
- **Rubylith Ink** (`#b52f1d`): the darker draw of the same ink, and the only rubylith that may be text — 5.05:1 on board, 6.20:1 on paper. Every rubylith *word* is set in it: the stamp, an error line, a destructive control. (It is the same value as `grease`; they are one ink used for two jobs, and both are named so a later change to one does not silently move the other.)
- **Grease** (`#b52f1d`): the one red of the chrome: Delete, error lines and alert icons, and the leader line pointing at what a note is about.
- **Wax** (`#f5d97a`) with **Wax Ink** (`#3d3416`): the current selection in the galley. Wax is the one warm note in the system and it means exactly one thing.

### Rules and edges
- **Hairline** (`#c8c7bf`): the 1px outline on every card (1.38:1 on board).
- **Rule** (`#c6c5bd`): dividers inside a card, the band's foot.
- **Tick** (`#b5b2a9`): dimension lines, inactive edges, the scrollbar thumb.
- **Field Edge** (`#85827a`): the 3:1 edge of every control — inputs, selects, outlined buttons, the segmented control (3.84:1 on paper).
- **Tissue Edge** (`#a29f95`): the sheet's edge (2.16:1 on board). **Tissue Ink** (`#8d8a80`) is no longer used by the design: the sheet writes in `graphite-soft` (6.52:1) like everything else. The Ink Floor Rule has no exception for being on tissue.

### Dark (the Light / Dark / System switch)
The chrome has a dark theme, chosen in Settings and kept on the device; light stays the default and the slide canvas
never follows it ([decisions-ui.md](./decisions-ui.md)). The token names above are Tailwind's, prefixed `--color-`
(`bg-board`, `text-graphite-soft`); `:root[data-theme="dark"]` in `ui/src/styles/index.css` overrides these. The values
below were re-tuned on 2026-11-13 with the Contact sheet.

| Token | Dark | Token | Dark |
|---|---|---|---|
| board | `#121315` | rubylith | `#ff6a52` |
| paper | `#232428` | rubylith-ink, grease | `#ff917d` |
| tissue | 90% `#2a2b30` | rubylith-wash / -soft | 30% / 16% rubylith |
| graphite | `#efeee9` | wax | `#5c4c14` |
| graphite-deep (primary hover) | `#fafaf7` | wax-ink | `#f5d97a` |
| graphite-soft (text floor) | `#adaaa2` | non-photo (the grid) | 14% `#7fb6e8` |
| graphite-tint (rules, ticks) | `#8d8c85` | non-photo-select | `#2f5b86` |
| process-blue | `#82b5e8` | hairline, rule, tick | `#3a3b41`, `#4a4b52`, `#5d5e64` |
| tissue-edge | `#66676e` | field-edge | `#7a7b82` |

Measured by `scripts/contrast.mjs` on the built tokens (30 pairs, 4.5:1 for text, 3:1 for UI parts, the lint error wash and the selection included; the lint wash pair that
fell short before, graphite-soft on it at 4.36:1, now measures 5.63:1): the text minimum is
5.05:1 in light and 5.30:1 in dark; UI parts and the focus ring 3.13:1 and 3.45:1. Paper on board is 1.23 and 1.20, so a
card's edge and its shadow do the separating. The slide canvas keeps `slide-paper` `#ffffff` and `slide-ink` `#2b2b2b`
in both themes.

### Named Rules

**The Non-Photo Rule.** The blue grid is the ink the camera cannot see. It may carry alignment and nothing else — no state, no meaning, no emphasis. Corollary: nothing that matters is rendered in `non-photo` on the board. One exception, decided 2026-11-06: a text selection's ground is `non-photo-select`. Paste-up artists marked in this blue because it never printed, and a selection never reaches the render either ([decisions.md](./decisions.md#the-workstation-is-redesigned-the-slide-theme-is-not)).

**The One Mark Rule.** A single vocabulary per idea. Rubylith is the *only* way the app says "held out", whether that is a slide excluded from the render, a component you cannot use yet, or a post that will not compile. Never invent a second treatment for the same state on a different screen.

**The Ink Floor Rule.** `graphite-soft` (`#5c5952`) is the lightest colour any text may take on board or paper. Anything lighter is a mark, not a word.

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
- **Board Title** (800, 26px, `wdth` 125, no tracking; 22px on a phone): the page's name in the band, never cut — it sets on two lines before it truncates.
- **Head** (800, 20px, `wdth` 112) and **Section** (800, 16px, `wdth` 112): empty-state heads and palette specimens; card and section heads (Post, Selection, a post's title, the Reader's list).
- **Brand** (800, 17px, `wdth` 115, +0.06em, uppercase): the wordmark. The only uppercase Archivo in the system.
- **Body** (500, 14px, 1.43): running interface text, buttons (700), field values. Cap prose at 65–75ch.
- **Hint** (500, 13px, 1.385): the palette hint, the inspector note, small buttons, rail counts.
- **Label** (600, 12px, 1.333, sentence case): every field label, state word and caption. It replaces the 9px mono Field and Mark capitals (reopened 2026-11-13).
- **Galley** (400, 13px mono, 1.846 = 24px): the `.wzd` source. The generous line height is not decoration: lint marks and wax highlights need room to sit on a line without touching its neighbours. Mono stays only here and on the measured marks (`1080 × 1080`, `1 : 4`, `post.wzd`).

State is an icon beside a word, not a dash: a check for Compiles, a disk for Saved, an alert in `grease` for an error, a pencil for Draft, a dashed box for Not rendered.

### The Palette Showing

The component palette is a **specimen showing**: each component renders as the thing it produces. `Heading` is set at 20px/800 (`wdth` 112), `Stat` as a heavy wide numeral, `Quote` in italic, the rest as plain chips. Four groups sit on the card: **Content** is open and the other three (Structure, Accents, Generated) are collapsed to their name and a row of working words, each of which adds, drags and underlines on hover like a chip. The open state is remembered in local storage.

### Named Rules

**The Width-Not-Family Rule.** Contrast comes from Archivo's `wdth` and `wght` axes. Never pair a second chrome face, and never reach for Inter — Inter is the artwork's voice and borrowing it collapses the distinction the whole system is built on.

**The Showing Rule.** Anywhere the app offers a choice between typographic outcomes — a component, a size, an emphasis — render the outcome, not its name.

## 4. Elevation

Two shadows exist. Both describe a physical relationship, and neither is
decoration. Nothing else in the system casts one.

### Shadow Vocabulary
- **Waxed down** (`box-shadow: 2px 3px 0 rgba(35,35,34,.16), 0 0 0 1px #c8c7bf`): anything adhered to the board — the band, every card, the strip. Hard, short, offset down-right, zero blur, always paired with the 1px hairline. It is the shadow of a thing lying *on* something.
- **Hinged** (`box-shadow: -9px 0 22px rgba(35,35,34,.12)`): the inspector sheet only. Soft and directional away from the hinge, because the sheet is lifted at one edge.

### Named Rules

**The Two Shadows Rule.** If an element is not waxed to the board and is not the tissue, it has no shadow. A modal, a toast, a dropdown — each has to decide which of the two it is, and take that one.

**The Flat Corner Rule.** `border-radius` is `0` throughout the chrome. Boards, slips, chips, inputs, buttons, stamps. A rounded corner is the single fastest way to make this world read as a generic dashboard wearing a costume.

