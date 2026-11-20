fix

# Newspapper redesign (B, Contact sheet), the critic's findings (2026-11-12)

I looked at the screens before reading the manifest. The direction holds, and the editor is clearly better than today. It has one paper band, every zone on its own card, the strip, a title that's never cut, and 48 px phone targets. What's owed is Reader density plus a handful of phone and mid-width details. I don't raise the slide artwork here, because the controller has ruled on it.

Rig notes, not findings. The numbered pins 1-5 are the board's callout stage. `first-light/dark` is a fixed 390 frame (`.np` is 390 wide), so its 360 render clips on the right, and measure.json's `ruling1-first-*-360` (bar top 780 in an 800 viewport) means nothing. Take the real 360 numbers from `editor-*-360`, where the slide ends at 719 and the bar starts at 736.

## First-screen density, measured

I read today's numbers off its PNGs by pixel row and measured the build's twins in headless Chrome. Today has no 360 shots, and a viewport shot can't show whether today's page scrolls.

| Screen | Today | Build | Verdict |
|---|---|---|---|
| Editor 1280x800, galley | 23 of 23 lines (to 726) | 23 of 23 (to 748) | equal |
| Editor 1280, slides | slide 1 whole, slide 2's head | slide 1 whole, all 3 thumbnails whole (587-762) | gain |
| Editor 1280, inspector | Title with its value cut ("…nigh"), Description, the Keywords label only | Title, Description and Keywords whole (to 773) | gain |
| Editor 1280, palette | 14 of 14 drawn as specimens | 7 as specimens, 7 as words in collapsed rows | loss, from ruling 2 (R3) |
| Editor 1280, page | can't tell from the shot | the page scrolls 31 px (docH 831) | small loss |
| Editor 390x844 | title cut by an ellipsis; slide 1 whole (380-655); slide 2's head at 746 | title whole on 2 lines; slide 1 whole (443-719); 35 px of strip above the bar at 780 | gain, weaker next-slide hint |
| Editor 360x800 | no shot | slide 1 whole (to 719), bar at 736, strip 0 px | strip invisible |
| Posts 1280 | 3 cards whole, ending at 553 | 3 cards whole, ending at 503 | gain of 50 px |
| Posts 390 | card 1 whole (to 670 of 844) | card 1 whole (to 716, bar at 780) | equal |
| Posts 360 | no shot | card 1 whole (385-716, bar at 736) | fits |
| Reader 1280 | 9 items whole at a 60 px pitch (202-745); Keyboard shortcuts inside the rail | 6 whole at an 82 px pitch (254-746); page scrolls (docH 950); Keyboard shortcuts at about 838 | **loss of 3 items, 33%** |
| Reader 390 | 10 whole (227-776) | 5 whole (370-780) | **loss of 5 items, 50%** |
| Reader 360 | no shot | 4 whole | loss |

## Regressions against today

1. **The Reader item list, at every width.** Today you scan 9 or 10 headlines and the build shows 4 to 6. Each `.item` has 12 px padding above and below a 14/20 two-line title and a 12/16 source line, so the pitch is 82 px against today's 60. At 390 the list also starts 149 px lower. The full-width Refresh row costs 62 px, the Feeds row 64 and the two-row card head 130. Fix it without clamping any title:
   - Rows go to 6 px padding, a title line-height of 18, and today's 1 px `hairline` between rows. That's a 67 px pitch.
   - On the phone, Refresh joins the band's title row, right-aligned, 48 px tall, with its icon and its word (saves 62 px). The Unread/All segment moves up into the Feeds row, beside `← Feeds` (saves about 22 px). The list head's h2 stays visible, because it names the rail's selection ("Unread" or the feed's name), and on the phone it's the only cue for which feed you're reading.
   - The builder should measure the list starting near 285 at 390, giving 7 whole items, and 6 at 360. Today shows 10. The rest of the gap is the 64 px bottom bar and the 48 px targets that ruling 5 keeps.
   - At 1280 the 67 px pitch gives 8 whole items against today's 9. Rail rows go from 32 to 28 px and group gaps from 16 to 12. The rail and list cards fill the viewport and scroll on their own, like the editor's right column, so Keyboard shortcuts is back above 800.
2. **The Reader unread marker is gone.** Today every unread row carries a 7 px graphite square. In the build's All view, only the text's weight and colour tell read from unread. Put a 6 px `graphite` square back on unread rows in All, 8 px left of the title. Unread can stay without it.
3. **Pick-by-shape now covers half the palette.** This clashes with ruling 2; I'm flagging it, not overruling. Collapsed Structure, Accents and Generated show `Kicker, Divider, Spacer, Source` as plain words. Opening Accents by default costs about 40 px and pushes Keywords (735-773) past the column's 789, which breaks ruling 2. The fix that fits the ruling is to make every word in a collapsed summary act like its chip, with click-to-add and drag. Set them as 12/16 600 text buttons that get a 1 px `field-edge` underline on hover. Then placing a Kicker doesn't need a group opened first.
4. **The phone hint that more slides follow.** At 390 today, slide 2's head row sits at 746, under slide 1. The build gives the strip 35 px at 390, which is the thumbnails' crop-mark tops with no caption, and 0 px at 360. Keep slide 1 whole with its 48 px tools and take 32 px from the chrome. The Preview head drops from 56 to 48 px (Add slide stays 48 tall), and the stage's margin above the leader and below the crop marks drops from 14 + 26 to 8 + 8. The strip then shows about 67 px at 390 and 23 px at 360.

The grid's removal from Posts and Reader costs no function, because the grid never aligned or measured anything there. Filters, counts, actions and the selected feed all carry over, and the paper cards now stand off a deeper board. What goes is identity. Posts keeps the crop-marked thumbnails and the dog-ear. Reader keeps nothing of the paste-up beyond the wordmark, and at 1280 about 295 px of empty board sits under the Posts cards. That's for the open ask sticky (question 2) to settle, not a fix.

The phone Source and Inspector panes aren't drawn. R3's collapse matters most in the Inspector pane (today's is `after-390-editor-narrow-palette.png`), so the fix round should draw it.

## Priority issues, ranked by cost to the user

1. **Reader density** (R1 and R2). The biggest daily cost.
2. **Delete is the strongest thing on a Posts card at 390 and 768.** It's a full-width 48 px red outline, the widest target on the card and the nearest to the thumb. Today it's a small red outline after Publish. Under 1100, make Delete half width and right-aligned on its own row, as it is at 1280, and keep it 48 px tall. Open and Render stay half width on row 1. At 768, New post shouldn't span 736 px either. Right-align it at its 1280 size and keep it full width only under 600.
3. **The phone strip is hard to see** (R4).
4. **The stage at 1100 to 1279.** At 1100 the stage is 296 px wide. The register targets at its corners (x 475 and 725, y 262 and 548) land on the crop corners (459-741). The second thumbnail is clipped by about 16 px and the third is hidden, so the strip doesn't read as scrollable. Under 1280, drop the corner targets and keep the crop marks and the leader. Start-align the strip with 8 px gaps and add a 24 px fade on its right edge.
5. **The 1280 editor has two scrolls.** The right column scrolls on its own (991 px inside 640), and the page scrolls another 31 px. The Date label is cut at 789 and nothing shows that the column scrolls. Size the three cards to `100dvh` minus the band minus 16 px so the page never scrolls. Give the column a 16 px fade to `paper` at the bottom and a visible 6 px scrollbar thumb in `tick`.
6. **The One Mark Rule breaks in the galley head.** On the Direction sheet's states, the `1 finding` alert icon is process blue beside grease text. Draw the icon in `grease` (#b52f1d light, #ff917d dark).
7. **Invented copy.** The Reader band's "19 unread across 3 categories" is a new derived string, and it counts Uncategorized as a category. Ask the owner, or drop it and let the rail's counts speak.

One note, not ranked. The hatched Export ZIP and Publish labels read at 4.1:1 against the hatch lines, which is the detector's 6 hits on posts-light. They're disabled, and the hatch is the recorded material for something you can't use here (today's strength 5, the same as the palette's Item chip), so WCAG exempts them. If the owner wants them easier to read, a `paper` pad behind each label (2 px by 6 px) gives 6.99:1. If you add it, add it to the Item chip too.

## Strengths to keep

- One paper band holds the title, state, slide theme, Save and the one solid Render, and every zone sits on its own card. That's the structure the owner asked for, and it holds in dark: paper #232428 on board #121315, Render inverted to a light fill, and the selected rail row still distinct.
- The contact strip at 1280 shows all three slides whole above the fold. The current one has a 2 px graphite frame and a filled index tab, and the working slide sits at 1:4 in crop marks under the leader.
- The phone editor sets the title whole at 22/26, puts the state on the select's row, makes Save, Render and the pane switch 48 px, and keeps slide 1 whole above the 64 px bar at both 390 and 360.
- Labels are 12/16 sentence-case Archivo, with stroke icons for Compiles, Saved, Draft and Not rendered. Mono stays in the galley and the measured marks only.

## Heuristic scores (0-4) and the detector

1. Visibility of system status, 3. The state icons, Sets clean, API up and the strip's chosen tab work, but the column scroll can't be seen (P5).
2. Match to the real world, 4. Crop marks, register leader, 1:4, the galley.
3. User control and freedom, 3. The pane switch and Feeds back are clear. Delete outweighs everything on the phone (P2).
4. Consistency and standards, 3. Every page gets the same band. The blue alert icon breaks the One Mark Rule (P6).
5. Error prevention, 3. Actions are hatched while Not rendered, but Delete is the biggest phone target.
6. Recognition rather than recall, 3. Half the palette is reduced to words (R3).
7. Flexibility and efficiency, 3. The j and ? keys and the strip help. Reader scanning drops 33-50%.
8. Aesthetic and minimalist design, 3. Calm and structured, with an empty board under the Posts cards at 1280.
9. Error recovery, 3. Failed at slide 2, Last good set, Dismiss.
10. Help and documentation, 2. The palette hint and the shortcuts row exist, but at 1280 the row sits below the fold.
Total 30/40.

I ran `detect.mjs --json` on 8 twins with the parsers from presentation-sites' node_modules. A NODE_PATH run comes back degraded, because the script's ESM imports ignore NODE_PATH. Nothing it found is a design fault to fix:
- `low-contrast` ×6 on posts-light, and once on the Direction sheet. These are the hatched disabled labels, exempt (see the note above).
- `cramped-padding` is dismissed. It flags the tray, card, ghead, stage-head, seg, items and the sheet's menus, which are flush toolbars and bands, the expected false positive.
- `codex-grid-background` is dismissed, because the stage grid is the recorded signature.
- `repeating-stripes-gradient` is dismissed, because the hatch is the recorded material.
- `gpt-thin-border-wide-shadow` is dismissed, because it's the recorded waxed or hinged shadow.
- `overused-font` is dismissed. It's Inter in the slide artwork, which is out of scope.
- `clipped-overflow-container` is dismissed. html and body clip the absolutely placed callout pins (`.co`), which belong to the rig.
- `em-dash-overuse` on the Direction sheet is dismissed. The file has no em dashes, and the hits are the `--color-*` token names.

While fixing density, keep the one paper band, the cards on a deeper board, the strip's chosen tab and the whole title on the phone. Take the pixels from padding and duplicated chrome, never from content.
