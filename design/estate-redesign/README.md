# The redesign: "Contact sheet"

This folder is the design record of Newspapper's redesign. The estate redesign board, where it was drawn and approved, is a private canvas; this is a copy of the app's page on it plus the build behind that page. The owner approved it on 2026-11-13, and [brief 12](../../corpus/briefs/done/12-a-redesign-with-hallmark-on-the-estate-board.md) built it. The code is now the source of truth: where the app and these files differ, the app wins, and later work may have moved a screen on. Read this folder to see what was decided and why before reshaping a screen.

## The owner's decisions

The owner approved the whole board on 2026-11-13, with every question standing at what the board proposed unless they reopened it. The questions this app's page asked:

- **Ask:** 1. Reopened: retire the 9 px mono capitals (Field and Mark, design.md §3) for 12 px sentence-case Archivo labels, keeping mono only in the galley and the measured marks (1080 × 1080, 1 : 4, post.wzd). OK? 2. Reopened: may the blue grid leave the galley, the inspector and the Posts and Reader pages and stay only under the stage? OK? 3. Approve Contact sheet as Newspapper's direction: one slide at working size over a contact strip of every slide, instead of today's column of every slide at 1:4?
- **Open question:** Phone navigation: the four places move from a top tray to a 64 px bottom bar with the same labels, as a labelled bar is what the genre uses (research §3). Today the tray is the top navigation at every width (design.md, tray-cell). Keep the bottom bar?
- **Reopened:** Recorded (design.md §3): "Field (500, 9px mono, +0.17em, uppercase): inspector field labels, tray captions, dimension callouts. Mark (700, 9px mono, +0.14em, uppercase): stamps, state words." Proposed: one 12 px sentence-case Archivo label at 600, and a stroke icon where the em dash stood for state (check for Compiles, disk for Saved, alert for an error).
- **Reopened:** Recorded (decisions.md, 2026-08-27): "a 26px non-photo blue grid under everything". Proposed: the grid paints on the stage only, softer (32% in light, 14% in dark); Posts and Reader have no paste-up, so they sit on a plain deeper board.

Where the files below disagree, the later layer wins: the owner's decisions, then the controller's rulings, then the judges' rulings, then the directions file.

## What is here

| Path | What it holds |
|---|---|
| `directions/newspapper.md` | The director's brief: both directions (the winner is the one built), the shared fixture and the screens to draw. |
| `judge/newspapper/RESULT.md` | The blind judging against today and the rulings that came with the win. |
| `critiques/newspapper-controller.md`, `critiques/newspapper.md` | The design critic's review against today, and the controller's rulings over it. |
| `manifests/newspapper.tokens.css`, `manifests/newspapper.tokens-map.md` | The token hand-off in the app's own names, and the renamed, new and unused tokens. |
| `manifests/newspapper.board-notes.md` | What the board said beside the screens: the asks, decisions, reopened rules, open questions, the contrast table and the runner-up. |
| `work/newspapper/twins/*.html` | Each drawn screen as static HTML, light and dark: open one in a browser. |
| `work/newspapper/shots/` | The twins rendered at 1280 and 390, light and dark, WebP. `direction.webp` is the board's direction sheet. |
| `shots/newspapper/` | Today's screens as the board showed them before the redesign. |

People's names and data in the pictures come from seeded demo accounts or are invented.

## Not here

The sketches and the judges' images, the runner-up's build (its notes are in the board's notes), the build's scripts, and the screenshots taken while it was built. They stay in the estate build folder.
