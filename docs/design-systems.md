# Design Systems

One theme ships: **warm-industrial**. The `digital-broadsheet` theme was removed in v2.

## warm-industrial

Source of truth: `design-systems/warm-industrial.yaml`. The renderer reads tokens from this file at startup.

### Vibe

Soft brutalism. Rounded corners (8px default), bold display sans-serif (Epilogue 700/800), grounded sans for body (Manrope 400/700), terracotta accent (`#a2391a`) on a warm off-white surface (`#fbf9f8`). Tactile, magazine-like.

### Tokens

| Group | Examples |
|-------|----------|
| Colors | `surface`, `on-surface`, `primary` (`#a2391a`), `outline`, plus the full Material 3 surface/container ramp |
| Typography | `display` (80px Epilogue 800), `headline-lg` (48px), `headline-md` (32px), `body-lg`/`body-md` (Manrope), `label-bold` |
| Spacing | base 8px, scale: `xs=4`, `sm=12`, `md=24`, `lg=48`, `xl=80`. `container-margin=32`, `gutter=24`. |
| Radius | `sm=0.25rem`, `DEFAULT=0.5rem`, `md=0.75rem`, `lg=1rem`, `xl=1.5rem` |
| Shapes | `borderWidth=2px` |

See the YAML for the full color ramp and exact values.

### Canvas

Every slide is **1080 × 1080 px**. That's Instagram's square post target; the renderer hard-codes it.

### Slide variants

Reference HTML lives in `templates/warm-industrial/` — these are the visual specs, not runtime templates. The actual rendering happens through JSX components in `src/render/slides/`.

| File | Component | When to use |
|------|-----------|-------------|
| `title-main.html` | `TitleMain` | Headline slide with optional kicker label |
| `title-statement.html` | `TitleStatement` | One bold declarative sentence, no kicker |
| `title-question.html` | `TitleQuestion` | Question framing, oversized |
| `body-text.html` | `BodyText` | Heading + paragraph |
| `body-list.html` | `BodyList` | Heading + bullet list (3–6 items) |
| `body-comparison.html` | `BodyComparison` | Two-column "this vs. that" |
| `quote-classic.html` | `QuoteClassic` | Centered pullquote with attribution |
| `quote-pullout.html` | `QuotePullout` | Quote with a large opening glyph |
| `quote-reaction.html` | `QuoteReaction` | Quote framed as a response/clapback |

### Satori constraints

Components must respect what Satori supports:

- **Flexbox only.** No CSS Grid, no `position: absolute` outside what flex provides.
- **No pseudo-elements** (`::before`, `::after`).
- **No background images via CSS.** Images must be passed as `<img>` with a URL or base64 source.
- **Fonts must be loaded explicitly** from `fonts/` as buffers and registered with Satori per weight.

Anything in the reference HTML that uses these features must be re-expressed with flex when porting to JSX.
