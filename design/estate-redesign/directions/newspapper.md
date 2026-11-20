# newspapper: two directions

Written 2026-11-12 by the art director. Repo: newspapper, brief 12. Both directions stay inside **The Mechanical** (decisions.md, 2026-08-27) and the rules in `corpus/wiki/design.md`: zero radius, exactly two shadows (waxed down, hinged), the One Mark Rule (rubylith = held out, wax = galley selection, process blue = what the markup names), the Ink Floor Rule, Archivo plus Spline Sans Mono and no other chrome face (Width-Not-Family), and integer preview scales only (1:2, 1:4, 1:8). The token names stay (`board`, `paper`, `tissue`, `graphite`, `graphite-soft`, `graphite-tint`, `graphite-deep`, `hairline`, `rule`, `tick`, `non-photo`, `non-photo-select`, `process-blue`, `rubylith`, `rubylith-ink`, `grease`, `wax`, `wax-ink`, `tissue-edge`, `tissue-ink`); one is added, `field-edge`. **Out of scope and drawn exactly as today:** the slide artwork inside the crop marks (warm-industrial-1, Inter, `slide-paper` `#ffffff`, `slide-ink` `#2b2b2b`, the same in dark). The faces and inks are today's, so the registry allows them (Archivo is also atrium's body face; newspapper uses it today).

## 1. Today's strengths (keep all of them)

1. Three working surfaces side by side at 1280: the galley on waxed paper, the slide on the board inside crop marks, and the palette and inspector on the right. The artwork reads as the thing being made, apart from the desk around it.
2. One document bar: the post title set large, its state (`Compiles`, `Saved`), the slide theme select, `Save` outlined and `Render` as the one solid graphite button. The primary action is never in doubt.
3. The palette is a specimen showing, grouped under Structure, Content, Accents and Generated. `Heading` is set big, `Stat` heavy, `Quote` in italic, so you pick by shape, and a word labels every chip.
4. The tray is labelled navigation, an icon over a word for each place, the current one raised. The account and the API state sit at its right end.
5. State is a mark beside the thing it describes: `Sets clean` on the galley, `1 : 4` on the preview, the hatched `Item` that can't be used here, the slide's own controls above each slide.
6. At 390 a three-way switch (`Source`, `Preview`, `Inspector`) shows one pane at a time and keeps the title and `Render` on top.

Fix these in both directions:
- Every label is 9 px Spline Sans Mono in tracked capitals (`STRUCTURE`, `POST.WZD`, `COMPILES`, the tray captions). That fails Hallmark Floor 9 and research's 12 px label floor.
- Status words carry a leading em dash in place of an icon (`— COMPILES`, `— SAVED`, `— SETS CLEAN`). Draw a stroke icon instead.
- Paper on board is 1.04:1 and the hairline 1.25:1, so the surfaces lean on the waxed shadow alone. Tissue on board is 1.01. In dark, paper on board is 1.14 (under 1.15).
- Field and select edges (`tick` `#c4c1b8`) are 1.80:1 on paper, 2.31 in dark. They need 3:1.
- The inspector's Title field cuts its value at 1280. (The galley's long lines run past its edge on purpose: `wrap="off"`, it scrolls sideways, and soft wrap would touch the wax test's oracle. Keep that.)
- The palette and the inspector share one column, so the Selection section starts below the fold.
- At 390: the title is cut with an ellipsis, slide controls are about 32 px, tray captions are 9 px, and `API up` is gone.
- The grid at 40% is the loudest thing on screen in the empty parts of the stage.

## 2. The main screen

The editor with its shell, route `/`, a saved post open and nothing selected. Shots in `board/shots-existing/newspapper-10/`: **1280** `after-1280-editor.png`, **390** `after-390-editor.png` (Preview pane). Dark: `after-dark-1280-editor.png`, `after-dark-390-editor.png`. The 390 Inspector pane: `after-390-editor-narrow-palette.png`. States reference: `after-1280-editor-missing.png` (the `Failed` toast, a new post).

## 3. The content fixture (word for word, from the shot and the capture's seed)

- **Tray.** Wordmark `Newspapper` with `paste-up board` under it. Places `Editor` (current), `Posts`, `Reader`, `Settings`. Right end: `tester`, `Sign out` (a link), `API up`.
- **Document bar.** Title `Sample City's trams will run all night` (draw it whole, never cut). State `Compiles`, `Saved`. Select showing `warm-industrial-1` (the options are `warm-industrial-1`, `-2`, `-3`). Buttons `Save`, `Render`.
- **Galley.** Tab `post.wzd`, mark `Sets clean`, button `Formatted`. These 23 lines (one blank), with two-space indents, tag names bold, prop values in process blue:
  `<head>` · `<title>Sample City's trams will run all night</title>` · `<caption>Sample City's trams will run all night.</caption>` · `</head>` · (blank) · `<body>` · `<Slide>` · `<Kicker>Transport</Kicker>` · `<Heading size="xl">Trams run all night</Heading>` · `</Slide>` · `<Slide>` · `<Heading>What changes</Heading>` · `<List size="lg">` · `<Item>Night trams every 20 minutes</Item>` · `<Item emphasis="strong">Fares stay the same</Item>` · `<Item>Three new stops</Item>` · `</List>` · `</Slide>` · `<Slide>` · `<Quote size="lg" by="The Mayor">The city never sleeps.</Quote>` · `<Source emphasis="muted">Council statement</Source>` · `</Slide>` · `</body>`
- **Preview.** Head `Preview`, mark `1 : 4`, button `Add slide`. Three slides, each headed `Slide 1` / `2` / `3` with four icon buttons named `Move slide 1 earlier`, `Move slide 1 later`, `Add a slide after slide 1`, `Delete slide 1` (and so on). The leader `1080 × 1080` on each frame. Slide 1: kicker `Transport`, heading `Trams run all night`. Slide 2: `What changes`, then the list. Slide 3: the quote and its source. No selection, no lint finding.
- **Palette.** Hint `Drag into a slot, or click to add to the selection.` Structure: `Stack`, `Row`. Content: `Heading`, `Text`, `List`, `Item` (hatched: not usable here), `Quote`, `Stat`, `Image`. Accents: `Kicker`, `Divider`, `Spacer`, `Source`. Generated: `PageCounter`. That's 14 specimens.
- **Inspector (tissue).** Section `Post`, note `The <head> block. Title, description and keywords also drive the saved post's index columns.` Fields `Title` (`Sample City's trams will run all night`), `Description` (empty, multiline), `Keywords` (empty), `Date` (empty), `Caption` (`Sample City's trams will run all night.`, multiline), `Hashtags` (empty). Section `Selection`: `Nothing selected`, hint `Click a node in the preview, or put the cursor inside one in the source.`
- **States strip, for the Direction sheet only:** the toast `Failed` / `That post no longer exists.`; a lint finding as a grease mark in the galley; the empty preview `No slides yet`; `Last good set` on the preview while the markup doesn't compile.

## 4. Directions

Both directions set labels the same way: Archivo 12/16 at 600, sentence case, untracked, `graphite-soft`. Spline Sans Mono stays only where it is the material: the galley, the leader `1080 × 1080`, the scale `1 : 4` and the tab `post.wzd`. The wordmark keeps its uppercase Archivo at `wdth` 115 as a logotype, not a label. Status words get a 16 px stroke icon (a check for `Compiles`, a disk for `Saved`, an alert for errors) in place of the em dash.

### A. The board, re-inked (Evolve today)
- **Idea:** today's paste-up board with type that reads at a glance, surfaces that clearly lie on the board, and a phone layout that fits its title.
- **Skeleton.**
  - **1280.** The tray is a 64 px bar on `paper`, edged by a `rule` line. It holds the wordmark, four 96 px compartments (a 20 px icon over a 12 px caption), and the account block at the right. The current compartment is `board` with a 2 px `graphite` foot rule. Under it, the document bar sits on the grid, closed by today's 1 px graphite rule. Then three columns with 26 px gaps: the galley at 420 px (a little wider than today's 390), waxed `paper`; the stage on the grid, slides at 1:4 in crop marks, scrolling as today; the right column at 320 px, holding the palette on a waxed `paper` card and below it the inspector on `tissue`, which keeps its hinged shadow and its edge.
  - **390.** Today's order. A 48 px top bar holds the wordmark, `API up` and `Sign out`. The tray's four compartments follow, 56 px tall with 12 px captions. Then the title over at most two lines, the state marks and the select at full width, `Save` and `Render` at 48 px, half width each. Then the 48 px pane switcher and the Preview at 1:4. The slide controls get 48 px targets.
- **Type.** Archivo: title 24/28 at 800, `wdth` 112; body 14/20 at 500; post-field values 14/20; palette specimens at today's specimen sizes. Spline Sans Mono: galley 13/24 at 400 (today 12.5/1.86; the textarea and the `<pre>` keep sharing every metric), leaders 11/16.
- **Palette** (light / dark):
  - Ground and surfaces: board `#f3f2ee` / `#18191c`; paper `#ffffff` / `#26272c`; tissue `#fbf9f1` at 86% / `#2d2e33` at 88%; tissue-edge `#a9a69c` / `#686970`.
  - Ink: graphite `#2b2b2b` / `#ecebe6`; graphite-soft `#64615a` / `#aaa79f`; graphite-deep `#1a1a1a` / `#fafaf7`.
  - Edges: hairline `#d3d2cb` / `#3c3d43`; rule `#c6c5bd` / `#4a4b52`; tick `#bdbab1` / `#5d5e64`; field-edge (new: inputs, selects, the outlined button) `#8b887f` / `#7c7d84`.
  - Inks: process-blue `#1d63a8` / `#7db1e6`; rubylith `#e8452e` / `#ff6a52`; rubylith-ink and grease `#bb3220` / `#ff8e7a`; wax `#f5d97a` / `#5c4c14`; wax-ink `#3d3416` / `#f5d97a`; non-photo `#7fb6e8` at 28% / at 14%; non-photo-select today's.
  - Pre-checked, light / dark: paper on board 1.12 / 1.18; tissue on board 1.05 / 1.24, so light relies on tissue-edge at 2.17 and the hinged shadow; hairline on board 1.35 / 1.62; field-edge on paper 3.54 / 3.64; graphite-soft on board 5.51 / 7.31, on paper 6.18 / 6.20, on tissue 5.81 / 5.88; process-blue on paper 6.17 / 6.60; rubylith-ink on board 5.22 / 7.87; wax-ink on wax 8.87 / 6.04; `Render` (board on graphite) 12.64 / 14.73. Re-run with the pilot's `contrast.mjs`.
- **Signature:** the paste-up stage. Each slide sits inside crop marks with a register target at each corner, and the measured leader `1080 × 1080` runs across its head. A real number on a production mark.
- **Reference:** `ibm` (Carbon), for square corners, dense productive panes and strict grid discipline. Nothing of its palette or type.

### B. Contact sheet
- **Idea:** the post is a sequence, so the stage shows the whole carousel at once: one slide at working size over a contact strip of every slide, with the grid only where the paste-up happens.
- **Skeleton.**
  - **1280.** The tray is a 56 px bar on `paper`, edged by a `rule` line: the wordmark, then four compartments with a 20 px icon beside a 14 px caption, then the account block. The current compartment is `board` with a 2 px `graphite` foot rule. The document bar sits on `paper` as well, under the tray, so the chrome reads as one raised band. Three columns follow, on a deeper `board`:
    1. the galley at 400 px, waxed `paper`;
    2. the stage (about 476 px), the only area that carries the blue grid. The Preview head stays as today (`Preview`, `1 : 4`, `Add slide`). Then the current slide at 1:4 inside crop marks, with today's head row above it (`Slide 1` and its four controls). Under it, the contact strip: every slide at 1:8, each in its own small crop marks, captioned `Slide 1`, `2`, `3`, the current one framed in 2 px `graphite`. Three thumbnails fit (about 437 px); from the fourth the strip scrolls sideways;
    3. the right column at 300 px: the palette card, then the inspector tissue, as in A.
    The current slide is the one holding the selection, or slide 1 when nothing is selected. Clicking a thumbnail selects its `<Slide>` node through the preview's existing click-to-select. Nothing new is stored. At 1440 and wider, the stage has room for 1:2, and the preview's existing rule already picks the largest factor that fits.
  - **390.** A 48 px top bar holds the wordmark, `API up` and `Sign out`. The four places move to a bottom bar, 64 px plus the gesture inset, each an icon over a 12 px label, the current one in `graphite` with a foot rule. Then the document bar (title over two lines, state, the select, `Save` and `Render` at 48 px), then the switcher `Source`, `Preview`, `Inspector`. Preview shows the current slide at 1:4, with its head row of four controls at 48 px above it, then the strip at 1:8, scrolling sideways with the next thumbnail peeking. Pad the content by the bar's height.
  - **Not a rail.** B takes no left rail (satchel, atrium B and almanac B hold those). The tray stays a top bar at desktop width.
- **Type.** The same faces with more contrast in width. Archivo title 26/30 at 800, `wdth` 125. Tray captions 14/20 at 600, `wdth` 100. Strip captions 12/16 at 600 with tabular figures. Body 14/20, galley 13/24 as in A.
- **Palette** (light / dark). Same inks as A; the ground sits a step deeper so the paper chrome and panes stand off it, and the grid leaves the side columns.
  - Ground and surfaces: board `#e9e8e3` / `#121315`; paper `#ffffff` / `#232428`; tissue `#fbf9f1` at 90% / `#2a2b30` at 90%; tissue-edge `#a29f95` / `#66676e`.
  - Ink: graphite `#232322` / `#efeee9`; graphite-soft `#5c5952` / `#adaaa2`.
  - Edges: hairline `#c8c7bf` / `#3a3b41`; field-edge `#85827a` / `#7a7b82`; tick `#b5b2a9` / `#5d5e64`.
  - Inks: process-blue `#1a5c9e` / `#82b5e8`; rubylith-ink and grease `#b52f1d` / `#ff917d`; rubylith, wax, wax-ink as in A; non-photo at 32% on the stage only / 14%.
  - Pre-checked, light / dark: paper on board 1.23 / 1.20; tissue on board 1.14 / 1.28 (light keeps the edge, 2.16); hairline on board 1.38 / 1.67; field-edge on paper 3.84 / 3.68; graphite-soft on board 5.69 / 8.01, on paper 6.99 / 6.68; process-blue on paper 6.84 / 7.18; rubylith-ink on board 5.05 / 8.50; `Render` 12.82 / 16.00.
- **Signature:** the contact strip. Every slide of the post at 1:8 in its own crop marks, in swipe order, the current one framed. Reordering stays on the current slide's buttons, never only a drag.
- **Reference:** `figma`, for a canvas in the middle and raised panels at its sides. Nothing of its palette or type.

## 5. Reopened decisions and owner questions

Sketchers flag these on the board as reopened:
- **Both:** design.md §3's `field`, `mark` and `brand` roles go, replaced by the Archivo label above. The em dash that stands in for an icon (design.md §2) gives way to stroke icons. design.md §2's light ground and field-edge values move, and its first dark proposal is re-tuned, as brief 12 asks.
- **B:** "a 26 px non-photo blue grid under everything" (decisions.md, 2026-08-27, and design.md §1) becomes the grid on the stage only. The tray moves to a bottom bar at 390 (it stays labelled). The preview's scroll of slides at 1:4 becomes one current slide plus a 1:8 strip.

Owner questions, irreversible first:
1. Retire the 9 px mono capitals for 12 px sentence-case Archivo labels in both directions, keeping mono only in the galley and the measured marks?
2. In B, may the blue grid leave the galley and the inspector and stay only under the stage?
3. In B, one slide at working size plus a contact strip, instead of today's column of every slide at 1:4?

## 6. Registry lines

| newspapper (A) | The board, re-inked | Archivo, `wdth` 112 (today's) | Archivo + Spline Sans Mono for the galley (today's) | graphite action; process blue for markup names; rubylith, wax marks (today's) | 64 px labelled tray bar; document bar; waxed galley, crop-marked stage on the grid, a palette card over the inspector tissue; phone: top tray and pane switcher |
| newspapper (B) | Contact sheet | Archivo, `wdth` 125 (today's) | Archivo + Spline Sans Mono (today's) | the same inks (today's), on a deeper board | 56 px tray bar and document bar as one paper band; galley, a stage with one slide over a contact strip of every slide (grid on the stage only), palette and tissue; phone: bottom bar of four places and pane switcher |
