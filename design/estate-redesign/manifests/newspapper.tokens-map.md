# Newspapper tokens: board role to app token

Mechanism: the app's own, kept. `@theme static` holds the light values; dark is `:root[data-theme="dark"]` overriding the plain variables. The board's roles already use the app's names (The Mechanical's names stay), so almost nothing is renamed; the values move. `newspapper.tokens.css` replaces the colour, shadow, type, leading and tracking groups of `ui/src/styles/index.css` and adds the NEW names.

## Renamed or remapped (board role to app token)
- board `on-graphite` (text on the solid graphite: Render, the post.wzd tab, the chosen pane, the current caption) -> `board` (no new token; `text-board` on `bg-graphite`)
- board `card edge` -> `hairline` (the 1 px ring inside `shadow-waxed`); board `band foot rule` -> `rule`; board `galley hatch` -> `tick` / `graphite-tint`
- board `surface` / `ground` / `ink` / `muted` -> `paper` / `board` / `graphite` / `graphite-soft` (same roles as today, new values: board #fbfbf9 to #e9e8e3, graphite-soft #6d6a62 to #5c5952, hairline #e2e2dd to #c8c7bf, tissue-edge #b9b6ac to #a29f95)
- `non-photo` (the 26 px grid): alpha 0.4 to 0.32 light, 0.16 to 0.14 dark, and it now paints on the stage only (the body's `background-image` lattice moves from `body` to the stage component)
- `tissue`: alpha 0.7 to 0.9 in both themes (the inspector reads as a sheet, not as glass)
- shadows: board "waxed down" -> `shadow-waxed` (colour from rgba(43,43,43,.14) to rgba(35,35,34,.16); dark unchanged), "hinged" -> `shadow-hinged` (.10 to .12 light, .40 to .45 dark); `shadow-lifted` follows waxed's colour. Cards, the band and the strip all take `shadow-waxed`; only the inspector takes `shadow-hinged`. No blur recipes beyond these two.
- type: `text-label` 13 to 12 (600, sentence case, tracking 0); `text-galley` 12.5 to 13 (leading 24 px); `text-board-title` 23 to 26 (22 on a phone via a max-md variant), tracking -0.02em to 0; `text-brand` 14 to 17, tracking 0.05em to 0.06em; `leading-body` 1.5 to 1.43; `--wdth-title` 112 to 125 (plain variable)
- `--tray-h` 78 to 56; `--container-content` 1092 (42 x 26) to 1440 (pages cap there, 28 px gutter)

## New tokens (component that needs them)
- `field-edge` (colour): inputs, selects, the outlined buttons (Save, Add slide, Formatted), the segmented control and the slide-tools control (3.84:1 on paper in light, 3.68 in dark; today's `tick` was 1.80)
- `text-head` 20/1.2 and `text-section` 16/1.25: empty-state heads, the palette's Heading and Stat specimens; card and section heads (Post, Selection, Unread, post titles)
- `text-hint` 13/1.385: the palette hint, the inspector note, small buttons, rail counts
- `spacing-tight` 8, `spacing-snug` 12, `spacing-card` 16, `spacing-column` 24, `spacing-gutter` 28: card padding and gaps, the editor's column gap, the page gutter (the 26 px names stay for the stage grid and the artwork's constants)
- plain variables `--bottom-bar-h` 64 (the phone's bottom bar, plus the gesture inset), `--target` 48, `--wdth-head` 112, and `--hatch` re-cut to 135 degrees, 7/8 px (palette Item, disabled Export ZIP and Publish, Nothing open)
- not tokens, board-only: `slide-accent` #bb3220 (the artwork's bullet; the app's canvas reads it from its design-system JSON), `shadow` helper colours

## App tokens the design no longer uses (keep or drop is the code brief's call)
- `text-field` 9 px and `text-mark` 9 px with `tracking-field` 0.17em, `tracking-mark` 0.14em, `leading-field`: the 9 px tracked capitals are replaced by `text-label`
- `text-caption` 11 px: strip captions and every small label use `text-label` 12 px
- `tissue-ink`: no text or mark in the proposal sits on the tissue in that colour (labels there use `graphite-soft`)
- `rubylith-wash`, `rubylith-wash-soft` and `non-photo-select`: kept as they are; the editor's selection and hover washes are code-side behaviour the board does not draw
- `container-narrow`, the z-index scale, `spacing-hair|half|unit|double`, `--grid`, `--wdth-brand`, `--wdth-narrow`: unchanged
