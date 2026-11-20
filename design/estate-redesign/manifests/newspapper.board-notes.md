# The board's notes: Newspapper

The estate redesign board is a private canvas. This file copies what its page for this app said beside the screens: the owner's asks, the decisions, the rules the design reopened, the open questions and the Floor. The owner's answers are in [README.md](../README.md#the-owners-decisions).

## Asks to the owner

- 1. Reopened: retire the 9 px mono capitals (Field and Mark, design.md §3) for 12 px sentence-case Archivo labels, keeping mono only in the galley and the measured marks (1080 × 1080, 1 : 4, post.wzd). OK? 2. Reopened: may the blue grid leave the galley, the inspector and the Posts and Reader pages and stay only under the stage? OK? 3. Approve Contact sheet as Newspapper's direction: one slide at working size over a contact strip of every slide, instead of today's column of every slide at 1:4? (beside `newspapper-direction`)

## Decisions

- The tray and the document bar are one paper band, with a foot rule and the waxed shadow; the page's title, state, slide theme, Save and the one solid Render live on it. The slide theme select now has a visible label. (beside `newspapper-proposed-editor-1280`)
- The working slide stays at the integer scale 1:4 and the stage's spare width goes to the paste-up: register targets sit at the stage's own corners, the 1080 × 1080 leader runs over the slide, and the slide is centred. (beside `newspapper-proposed-editor-1280`)
- The contact strip reads as navigation: the current slide has a 2 px graphite frame and a filled index tab for its caption; thumbnails are 135 px, the largest three the column holds at 1:8. From a fourth slide the strip scrolls sideways. Clicking one selects its Slide node through the preview's existing click-to-select. (beside `newspapper-proposed-editor-1280`)
- Palette groups collapse. Drawn open: Content. Drawn collapsed: Structure, Accents and Generated; each specimen name in a collapsed group is a working text chip (click to add, drag like an open specimen, a field-edge underline on hover), so pick-by-shape lives in the open group and pick-by-name in the collapsed ones, and all 14 stay one action away. Which groups open by default, and whether the state is remembered, is the code brief's call. (beside `newspapper-proposed-editor-1280`)
- The right column is sticky under the band and scrolls on its own, with a fade at its foot and a visible scrollbar thumb, so the inspector is reachable without moving the page. The galley, stage and column are 635 px tall, which fits the viewport under the band. Its fields are never cut: Title is a two-line field, the select shows warm-industrial-1 whole. (beside `newspapper-proposed-editor-1280`)
- At 1400 and wider the galley grows to 560 px so its longest line shows whole; below that it keeps wrap off and scrolls sideways, as recorded. At 1100 to 1280 the stage takes the slack, and under 1100 the palette and inspector drop beneath the galley and stage. (beside `newspapper-proposed-editor-1280`)
- On the phone the status marks sit on one row with the slide theme select, and Save and Render share a row, which is what lets slide 1 sit whole above the bar. The pane switch (Source, Preview, Inspector) stays; Preview shows the current slide at 1:4 with 48 px tools, then the strip at 1:8 with the next thumbnail peeking. (beside `newspapper-proposed-editor-390`)
- Posts takes the same paper band: the title and its sentence on the left, New post as the one solid action on the right. Draft status gets a pencil icon and Not rendered a dashed-box icon in place of today's em dashes. (beside `newspapper-proposed-posts-1280`)
- Status and Search sit on their own card with visible labels, separated from the post cards under them. Search shows its placeholder whole. (beside `newspapper-proposed-posts-1280`)
- Each post stays its own card with its crop-marked thumbnail (Not set) and the dog-eared corner for a draft. The thumbnail moves beside the title so a card is shorter; Export ZIP and Publish are hatched while Not rendered, as today they are muted; Delete is the only red. (beside `newspapper-proposed-posts-1280`)
- Reader gets the band too; Refresh moves from the rail's head to the band, on the title row at every width. No sentence under the title: the rail's counts speak. (beside `newspapper-proposed-reader-1280`)
- Feeds, items and the reading pane are three cards. The current feed is a board-tinted row with a 3 px graphite bar and heavier weight; counts stay right-aligned; the Views and Keyboard shortcuts rows keep their hints. (beside `newspapper-proposed-reader-1280`)
- Item titles set whole, narrow (wdth 92), at a 66 px pitch. In the Unread view every row is unread, so no marker; in All, unread rows carry a 6 px graphite square 8 px left of the title and read rows drop to medium weight in graphite-soft (drawn on the direction sheet). (beside `newspapper-proposed-reader-1280`)
- Under 1100 the Reader shows one pane, as the app already does (its narrow query): the list, with a labelled Feeds back control and the Unread/All switch on one 48 px row. The rail is the previous pane. (beside `newspapper-proposed-reader-390`)
- Posts actions: Delete is half width and right-aligned on its own row at every width and 48 px tall on a phone, so it is never the widest target on the card; New post keeps its desktop size from 600 px up and is full width only under 600. Under 1280 the stage drops the corner register targets and keeps crop marks and the leader; the strip starts at the left with 8 px gaps and a 24 px fade where it scrolls. (beside `newspapper-proposed-posts-1280`)

## Reopened rules

- Recorded (design.md §3): "Field (500, 9px mono, +0.17em, uppercase): inspector field labels, tray captions, dimension callouts. Mark (700, 9px mono, +0.14em, uppercase): stamps, state words." Proposed: one 12 px sentence-case Archivo label at 600, and a stroke icon where the em dash stood for state (check for Compiles, disk for Saved, alert for an error). (beside `newspapper-direction`)
- Recorded (decisions.md, 2026-08-27): "a 26px non-photo blue grid under everything". Proposed: the grid paints on the stage only, softer (32% in light, 14% in dark); Posts and Reader have no paste-up, so they sit on a plain deeper board. (beside `newspapper-direction`)

## Open questions

- Phone navigation: the four places move from a top tray to a 64 px bottom bar with the same labels, as a labelled bar is what the genre uses (research §3). Today the tray is the top navigation at every width (design.md, tray-cell). Keep the bottom bar? (beside `newspapper-proposed-editor-390`)

## The Floor

- Contrast is scripted over 23 pairs: text min 5.05 light and 6.04 dark, UI parts and the focus ring 3.13 and 3.45 or more, paper on board 1.23 and 1.20, tissue on board 1.14 and 1.28 with its edge at 2.16 and 3.30, the card hairline 1.38 and 1.67. No page overflow at 1280, 1100, 1024, 768, 390 or 360 in either theme, and every control, chip, select and field fits its own box (0 offenders, selects and placeholders measured by text width). Phone targets are 48 px or more. Sloplint --scope app --render gives 0 FAIL on all six lint twins; 7b (surface: absolute declared), 24b, 39b and 72 are waived with reasons. The lint twins carry the slide artwork without its tracked Kicker and h2 elements (see the note on the artwork); warnings left are a straight apostrophe in the fixture's own title, five weights, and the palette the phone's pane switch hides. The direction sheet draws the states for all three screens. (beside `newspapper-direction`)
- Ruling 1, measured at 390 × 844, scrollY 0, light and dark: the whole 270 px slide box, bottom crop marks included, ends at 705 and the bottom bar starts at 780 (75 px clear), with the strip showing 65 px (the thumbnails' tops and captions begin). At 360 × 800 it ends at 705 against a bar at 736 (31 px clear) and the strip shows 21 px. The title sets on two lines at 22/26, never cut. Save and Render are 48 px tall. The Preview head is 48 px and the stage margins are 4 and 8 px, which won the 32 px. (beside `newspapper-proposed-editor-first-screen-390`)
- Ruling 2, measured at 1280 × 800, window scrollY 0: the band ends at 133, the three cards run 149 to 784, and the page height is 800, so the page never scrolls. Title (565 to 623), Description (648 to 706) and Keywords (731 to 769) are above the fold with Content open and Structure, Accents and Generated collapsed. The right column scrolls alone (975 inside 635 px), with a 16 px fade at its foot and a 6 px scrollbar thumb in tick; scrolled to its end, Hashtags sits at 600 to 638. (beside `newspapper-proposed-editor-1280`)
- Reader density, measured: 8 items whole at 1280 × 800 (today 9), 7 at 390 × 844 and 6 at 360 × 800 (today 10 at 390). The pitch is 66 px (today 60), the rail and list scroll inside their cards and Keyboard shortcuts ends at 747. Page height at 1280 is 800. (beside `newspapper-proposed-reader-1280`)

## Other notes

- The slide artwork is drawn exactly as today (Inter, white paper, #2b2b2b ink, the tracked capital Kicker, h2 headings). Sloplint gates 54 and 67 are Floor gates that judge it as chrome and cannot be waived, so the lint twins are scoped: they carry the same slide with the Kicker in sentence case and untracked and the headings as plain blocks. Every other check runs on the real artwork.
- Phone: the Inspector pane is drawn too (palette with collapsed groups, then the Post fields), with 48 px targets. Strings from the app: Failed, That post no longer exists., Failed at slide 2, Last good set, No slides yet, No posts yet, Nothing matches, Nothing open, Failed to load sources. Proposals, not today's strings: the empty-preview hint, Dismiss, the retry line and the Title error.
- Handoff: manifests/newspapper.tokens.css and newspapper.tokens-map.md carry the tokens in the app's own names (the same @theme static and :root[data-theme="dark"] mechanism). Only field-edge is a new colour.

## Contrast, as measured

| Pair | Light | Dark | Needs |
|---|---|---|---|
| graphite on paper (galley, body) | 15.73 | 13.35 | 4.5 |
| graphite on board (leader, slide name) | 12.82 | 16 | 4.5 |
| graphite on tissue (inspector) | 14.67 | 12.51 | 4.5 |
| graphite-deep on paper (titles, wordmark) | 17.4 | 14.83 | 4.5 |
| graphite-soft on board (labels on the stage) | 5.69 | 8.01 | 4.5 |
| graphite-soft on paper (labels, hints, counts, placeholders) | 6.99 | 6.68 | 4.5 |
| graphite-soft on tissue (inspector labels) | 6.52 | 6.26 | 4.5 |
| process-blue on paper (prop values, check icons) | 6.84 | 7.18 | 4.5 |
| grease on paper (Delete, errors, lint) | 6.2 | 7.09 | 4.5 |
| grease on board (error under a field on board) | 5.05 | 8.5 | 4.5 |
| wax-ink on wax (galley selection) | 8.87 | 6.04 | 4.5 |
| board on graphite (Render, post.wzd tab, current caption, chosen pane) | 12.82 | 16 | 4.5 |
| field-edge on paper (input, select, Save edge) | 3.84 | 3.68 | 3 |
| field-edge on tissue (inspector fields) | 3.58 | 3.45 | 3 |
| field-edge on board (outlined button on the stage) | 3.13 | 4.41 | 3 |
| focus ring (graphite) on board | 12.82 | 16 | 3 |
| focus ring (graphite) on paper | 15.73 | 13.35 | 3 |
| focus ring (graphite) on tissue | 14.67 | 12.51 | 3 |
| graphite-tint on paper (ticks, hatch; UI part) | 4.31 | 4.59 | 3 |
| tissue-edge on board (the inspector edge; needs 1.3) | 2.16 | 3.3 | 1.3 |
| paper on board (card against the page; needs 1.09 or an edge) | 1.23 | 1.2 | 1.09 |
| tissue on board (needs 1.09 or an edge) | 1.14 | 1.28 | 1.09 |
| hairline on board (the card's 1px edge; needs 1.3) | 1.38 | 1.67 | 1.3 |

## The runner-up

**Runner-up: A, The board, re-inked (sketch only, not built)**

Note: how this direction was picked. Two directions were sketched (A evolve today, B the contact sheet) and two judges compared every pair against today, in both orders, at 1280 light and 390 dark. All 12 verdicts agreed: B won 4 of 4, A 2, today 0 (today's tiny mono caps and the toolbar and preview on one grid sheet lost on legibility and structure). A lost to B on grouping: B gives every zone its own card and shows the whole post as a strip of slides. Say so here if you'd rather keep today's column of every slide at 1:4 (A).

## The artboards on the board

- Direction · Contact sheet
- Editor · 1280 · light · today
- Editor · 390 · light · today
- Posts · 1280 · light · today
- Posts · 390 · light · today
- Reader · 1280 · light · today
- Reader · 390 · light · today
- Editor · 1280 · light · proposed
- Editor · 390 · dark · proposed
- Posts · 1280 · light · proposed
- Posts · 390 · dark · proposed
- Reader · 1280 · light · proposed
- Reader · 390 · dark · proposed
- Editor · 390 · dark · first screen, scrollY 0 · proposed (fixed 390 x 844 frame, not a fluid page)
- Editor · 390 · dark · Inspector pane · proposed
- Runner-up A, The board, re-inked · light 1280 (sketch)
- Runner-up A, The board, re-inked · dark 390 (sketch)
