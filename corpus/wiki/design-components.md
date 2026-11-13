---
summary: The Mechanical as the Contact sheet shipped it, §5–§9 — the component vocabulary (board, the paper band with its tray and bottom bar, the galley and its wax ink, stage and strip, the palette, the inspector sheet, marks, the post cards and the Reader), the two authored animations, browser surfaces (text selections in non-photo blue since 2026-11-06), the do/don't list, and what the shipped chrome does not yet carry. §1–§4 and the tokens are in design.md.
updated: 2026-11-13
---

# Design System: Newspapper — components, motion, rules

The second half of **The Mechanical**. [design.md](./design.md) carries §1–§4 —
the north star, the palette, the type hierarchy, the two shadows — and the
machine-readable token block in its frontmatter. Section numbers are continuous
across the two pages, so a source comment citing "DESIGN.md §5" lands here.

What was actually built against this spec is [chrome.md](./chrome.md).

## 5. Components

### The Board
The app ground, `#e9e8e3`, plain. Every zone sits on it as a card (paper, hairline, waxed shadow). The 26px non-photo blue lattice prints on the **stage only** (32% in light, 14% in dark); Posts and the Reader sit on the plain, deeper board, as no paste-up happens there. Pages cap at 1440px with a 28px gutter (16px on a phone).

### The Band (tray and document bar)
The tray and the document bar are **one paper band** with the waxed shadow. The tray is 56px: the wordmark and "paste-up board", the four places (an icon and its label each; the current one on board ground with a 2px graphite rule under it), then the session (account name, Sign out) and the API state (a pulse icon and `API up` or `API down` in grease). The document bar under it holds the page's title (26px, `wdth` 125, set on two lines before it is cut), its states, and its actions, with at most one solid action: Render in the editor, New post on Posts, the chosen pane where a switch is open. A page puts its bar there with `DocBar`; the tray stays mounted across navigation.

**On a phone (below 860px)** the tray thins to a 48px bar (wordmark, API state, Sign out) and the four places move to a **64px bottom bar** with the same labels, plus the gesture inset. The editor's status marks share a row with the slide theme select, Save and Render share a 48px row, and every control is 48px or taller (`--target`). The bottom bar is a decision of 2026-11-13: a labelled bar is what the genre uses, and a place is never reached by recognising a shape alone.

### Held out
One mark, three scales: the rubylith wash over a surface, and at control scale the **135° hatch** (7px clear, 1px `hairline`) with a dashed `graphite-tint` edge: a disabled button, a palette chip with nowhere to go, Export ZIP and Publish before a render, a disabled source.

### The Galley (source pane)
A paper card, top-aligned, with a graphite tab (44px, `post.wzd` in mono) and the state beside it (a blue check and `Sets clean`, or the errors in `grease` with an alert icon), and **Formatted** as a small outlined button. The bottom edge is a 10px diagonal hatch that says the copy continues. The galley is 13px mono on a 24px line; the textarea and its highlight layer share every metric, and the textarea shows an inset focus ring. Syntax colour follows **casing**: lowercase document tags in `graphite-soft`, capitalised components in graphite 700, prop values in `process-blue`. (The comps set the document tags in `#9d9d97`, which is 2.6:1 on paper — recede by weight and case, not by dropping below the ink floor.) The selected element is waxed (`#f5d97a`, bled 0.35em, about 4px, past the text on both sides, laid once per run and under the glyphs so it covers none of them); a lint-flagged line takes a 16% rubylith wash. (The comps said 20px. In a galley 7.5px to the character that is nearly three characters of yellow either side, which reads as selecting the neighbouring tokens; the wax-run fix (2026-10-19) settled on the shipped 0.35em.)

**On wax the galley writes in `wax-ink`.** Wax is a surface, and a surface has its own ink: every token on the selected run takes `#3d3416` (8.87:1 on wax), because the paper inks do not hold 4.5:1 on it — `graphite-soft` measures 3.88:1 and `process-blue` 4.43:1. The casing distinction survives the highlight in weight and slope, not in hue: components stay 700, comments stay italic. Hue pools, and the one hue that carried meaning — `process-blue` on prop values — pools for the one element the tissue is displaying in full while it is selected. The token colours are written at zero specificity (`:where()`) so the wax ink wins on merit rather than on which CSS module the bundler emitted last. A text selection is not wax (2026-11-06): it is `non-photo-select` (`#99c5ed`) under graphite (7.8:1), painted by the galley rather than by the textarea, exactly the selected characters wide and the text's height, no bleed. Inside the selected element it lies over the wax, so it shows where it starts and ends; components stay 700 and comments italic on it too ([chrome.md](./chrome.md)).

### The Stage and the Strip
The stage is one card: a 44px head (Preview, the scale `1 : 4` in mono, Add slide), the current slide's name with the **slide tools** as one segmented control (move up, move down, add after, delete), the **working slide**, and the **contact strip**.

The working slide takes the largest integer scale its frame holds (½, ¼, ⅛; a fractionally resampled preview is not a preview), centred, with 1px graphite crop marks, a `1080 × 1080` leader over it and register targets in the stage's corners (the targets go below 1280px). The artwork is untouched. The slide containing the selection is the working slide; with none selected it is the one last picked on the strip, and only the working slide takes drop targets.

The strip is the other half of the direction: every slide at **1:8**, 135px, in its own small crop marks, with a caption (`Slide 2`). The current slide has a 2px graphite frame and a filled caption tab; clicking a thumbnail selects its Slide node through the ordinary click-to-select. From a fourth slide it scrolls sideways (8px gaps and a 24px fade from 1100 to 1279). Thumbnails reuse `SlideCanvas` and take no gestures and no drop zones.

### The Right Column (palette and inspector)
From 1100px the galley (400px; 560px from 1400), the stage and the right column (300px) are cards sized to the viewport, so the page never scrolls; the right column scrolls alone, with a 16px fade at its foot and a thin `tick` thumb. Under 1100 the palette and inspector drop beneath the stage. Splitters sit in the 24px gaps and show a graphite rule when hovered or focused; the widths are the operator's once dragged.

The **palette** is a card: a hint, then four collapsible groups (Content open; Structure, Accents and Generated collapsed to their name and a row of working words). The **inspector** is a sheet, `rgba(251,249,241,.9)` with a 1px `tissue-edge` and the hinged shadow, headed by `Post` (Title as a two-line field, Description, Keywords, Date, Caption, Hashtags) and `Selection` after a dashed rule: the selected node's name at Head size, its path, the prop fields and the grease-pencil notes. Selecting a node still hinges the sheet down (a rotation about its top edge); the Floor's reduced-motion path is the end state.

### Fields (constrained props)
A field is paper with a 1px `field-edge` ring, Archivo 500 at 14px, 38px tall (48 on a phone), with its 12px label above. A **scale chip row** has equal chips with the same ring, 13px bold, 6px gutters; the active chip inverts to solid graphite on board. A masking value (`Hold out`) has no scale that uses it, so there is no chip for it. There is **no raw CSS field** and no "advanced" section; adding one is a regression.

### Marks (the state system)
State is carried by mark, never by a coloured badge:

| State | Mark |
|---|---|
| Selected (in source) | Wax highlight, bled past the text |
| Selected (node) | Lifts off the board with its waxed shadow |
| Draft | A pencil icon and the word, and the dog-ear over the card's top-right corner |
| Published | Rubylith rubber stamp, 2px `rubylith` outline, `rubylith-ink` word, rotated -7° |
| Held out / disabled / won't compile | Rubylith wash, or the 135° hatch at control scale |
| Finding | Grease-pencil note on the tissue **plus a leader line** to the node |
| Not rendered | A dashed-box icon and the word |
| Render frame | Crop marks |
| Alignment | Register targets |

**The API probe has two states, not
three — a check in flight renders as *up*, because a state that resolves in
milliseconds and cannot be acted on does not earn a form here. Above 640px it is
a pulse icon and a word in the session cell, on the phone's top bar too (the word is the state; the icon is
process-blue when up and grease when down).

### Notes and findings
A finding is a grease-pencil block on the tissue: a 12px label, the note in 13px `grease`, and a **2px leader line** running from the tissue's edge to the node it concerns, tipped with a small arrowhead. The note states the measurement — "Heading runs 3 characters past the measure at xl" — not a severity word.

### The Post Cards (`/posts`)
The band carries the title, the subtitle and **New post**, the one solid action (full width only under 600px). Status and Search sit on their own card with visible labels. Each post is its own card: the crop-marked 104px thumbnail beside the title (16px, 800, `wdth` 112, never clamped), the state marks (Draft with a pencil, or the Published stamp; Not rendered with a dashed box, or `N slides`) and the update date, then a hairline and the actions: Open, Render, Export ZIP and Publish (both hatched until rendered), and **Delete**, the only red, right-aligned on its own row (half width and 48px on a phone). Drafts keep the dog-ear. A list with no post says `No posts yet` or `Nothing matches` on a card of its own.

### The Reader
The band carries the title and **Refresh** on one row at every width. Feeds (264px), items (360px) and the reading pane are three cards, each scrolling on its own. The current feed is a tinted row with a 3px graphite bar; categories are 12px labels with their unread counts. Item titles are whole at about a 66px pitch (8 rows at 1280x800, 7 at 390x844, 6 at 360x800); in All an unread row carries a 6px graphite square and a read row drops to medium weight. Under 1100px one pane shows at a time, with a labelled `Feeds` back control and Unread / All beside it. Search, Library, Sources, the add-source dialog and the key legend sit in the same cards with the same tokens.

### Named Rules

**The Tissue Rule.** Notes live on an overlay that lifts. The canvas is never permanently occluded by an inspector.

**The Measured Note Rule.** A finding pins to its node on a leader line and states the number. "Warning" is not a note.

**The Fixed Scale Rule.** Every thumbnail in the strip renders at 1:8 on a shared baseline, and the working slide at an integer scale, so a slide is never resampled.

**The One Grid Rule.** 26px, everywhere, at every breakpoint. Elements snap to it; the grid never carries information. **Corollary — grid-conformance is not fitting.** A multiple of 26 is a legal size, never a proof that the size fits: a row of them can still be wider than the viewport. Anything sized in units along an axis that holds several of them is measured in a browser at the narrowest width it claims, or it is not measured.

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
text selection (graphite on `non-photo-select`, non-photo blue at 80% over
paper, `#99c5ed`: never wax, which marks the selected element), the caret
(graphite), scrollbars (board track,
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
- **Do** re-measure contrast in every state that moves a surface or an ink — on a highlight, selected, hover, focus-visible, disabled, held out, error — not once per element on its resting ground.

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

The chrome build (2026-08-31) built §1–§7 across every route and left four things described above
without an implementation, each blocked on changing a structure rather than
clothing. On 2026-09-01 they were split: two were built by the chrome's finish (2026-09-01), and **two are dropped** — not
pending.

**Built (74):**

- **The scale-chip row for constrained props** (§5, Fields) is
  `ui/src/components/ui/ChipRow.tsx`. The inspector's `size`, `align` and
  `emphasis` — the only three scales in the catalogue — pick themselves in a
  row of equal chips; content props (`Image.src`, `Quote.by`, `Stat.label`)
  keep their field. The row is also the keyword filter on `/posts` and the
  Unread / All switch on `/reader`, which import it rather than open-coding the
  CSS as `/posts` and `/articles` once did. **It is a row, and that is the constraint**: `size` at five
  steps is the longest scale the 282px tissue holds, and a scale past about six
  belongs back in a `Select`.
- **The flat file is a grid of boards** (§5). `/posts` lays its boards out
  `auto-fill` at a 13-unit minimum with a one-unit gutter — three across the
  1092px column, two around 900, one below ~700 — each board carrying the marks
  it carried as a row.

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

**Still not carried:**

- **The rubylith chip.** §5 gives a masking value (`Hold out`) a chip that
  inverts to solid rubylith. No scale in the Wizard catalogue has such a value,
  so `ChipRow` does not build the variant — an unused variant is one nobody has
  looked at. The line stands until a scale needs it.

**Carried since (75):** the tray below ~440px. Its compartments were a fixed
78px each, so at 390px `/posts`, `/articles` and `/settings` sat past the right
edge and at 320px none of the four was reachable at all. The strip now divides
into two courses below 640px and a compartment is a share of its course; every
route is reachable from 240px up, measured in a real Chromium viewport. The
galley's contrast on wax went the same way — both are written up in
[chrome.md](./chrome.md).

The tissue also hinges on **selection change** rather than on source focus:
selecting a node swings the sheet down with the notes already on it. Lifting it
off the board when the source takes focus would move a pane, and the three-pane
layout is the editor work's (2026-08-31).
