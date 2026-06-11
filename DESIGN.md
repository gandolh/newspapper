---
name: Newspapper
description: A warm-editorial workstation that turns today's news into Instagram-style slide posts.
colors:
  terracotta: "#a2391a"
  terracotta-hover: "#c3512f"
  terracotta-soft: "#ffdbd1"
  warm-white: "#fbf9f8"
  card-white: "#ffffff"
  surface-low: "#f5f3f3"
  surface-container: "#efeded"
  surface-tint: "#fff5f2"
  ink: "#1b1c1c"
  warm-muted: "#57423c"
  border: "#e4e2e2"
  outline: "#8b716b"
  slate: "#555f6a"
  error: "#ba1a1a"
  error-container: "#ffdad6"
  success: "#2e7d32"
  success-container: "#c8e6c9"
  warning: "#7c5a00"
  warning-container: "#fff3cd"
typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.06em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "0.25rem"
  md: "0.5rem"
  lg: "1rem"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "12px"
  md: "24px"
  lg: "48px"
  container: "32px"
components:
  button-primary:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.terracotta-hover}"
  button-secondary:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.warm-muted}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-danger:
    backgroundColor: "{colors.error-container}"
    textColor: "{colors.error}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  input:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "38px"
  card:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  badge-primary:
    backgroundColor: "{colors.terracotta-soft}"
    textColor: "{colors.terracotta}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  nav-item-active:
    backgroundColor: "{colors.terracotta-soft}"
    textColor: "{colors.terracotta}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
---

# Design System: Newspapper

## 1. Overview

**Creative North Star: "The Warm Press Room"**

Newspapper is a focused editorial workstation: ink set on warm paper, with a single
terracotta stamp standing in for the press. It is not a marketing surface and not a
playful consumer app — it is the desk a person sits at, daily, to turn the day's news
into a clean slide post. The visual system serves that task and then gets out of the way.
Warmth comes from the paper-toned surface, the brown-tinted neutrals, and the one
confident accent — never from gradients, glass, or ornament.

Density is deliberate. A list of sources is a tight table; a settings screen is a calm
centered column; the wizard is a full-bleed work area. The system uses width
intentionally — full-bleed where the work is, a narrow reading column where the content
is prose. Surfaces are flat by default and lift only in response to interaction.

This system explicitly rejects the SaaS-cream dashboard with an eyebrow kicker over every
section, the over-decorated "delightful" tool, and narrow content marooned in a sea of
empty space. The register is earned familiarity: a person fluent in Linear, Figma, or
Stripe should sit down and trust it immediately.

**Key Characteristics:**
- One terracotta accent (`#a2391a`) on a warm off-white (`#fbf9f8`); accent ≤ ~10% of any screen.
- Inter only, 400–900; hierarchy from weight and size, not from font pairing.
- Flat by default; a single soft shadow appears on hover.
- Intentional width: full-bleed work areas, centered columns for prose and forms.

## 2. Colors

A warm-neutral paper palette carried by a single saturated terracotta. The neutrals are
tinted toward the brand's own brown hue, not toward generic "warmth."

### Primary
- **Terracotta** (`#a2391a`): The one voice. Primary buttons, the active nav pill, the current step, focus rings, links, the `np` brand mark. Hover deepens to **Terracotta Hover** (`#c3512f`).
- **Terracotta Soft** (`#ffdbd1`): The accent's quiet form — selection highlight, active-nav background, focus glow (`0 0 0 3px`), selected rows, primary badges.

### Secondary
- **Slate** (`#555f6a`): A cool counter-note for informational icons and the info-toast accent. Used sparingly; the palette is overwhelmingly warm.

### Neutral
- **Warm White** (`#fbf9f8`): The body — the "paper." The default app background.
- **Card White** (`#ffffff`): Raised surfaces — cards, inputs, the sidebar, table headers' parent.
- **Surface Low / Container** (`#f5f3f3` / `#efeded`): Tonal layering for table-header rows, hovered ghost buttons, inset notes.
- **Surface Tint** (`#fff5f2`): A barely-there warm wash for selected/checked list rows (pairs with a terracotta border).
- **Ink** (`#1b1c1c`): Primary text.
- **Warm Muted** (`#57423c`): Secondary text, labels, captions — a brown-grey, not a cool gray.
- **Border** (`#e4e2e2`) / **Outline** (`#8b716b`): 1px dividers and stronger control outlines respectively.

### Semantic
- **Error** (`#ba1a1a` on `#ffdad6`), **Success** (`#2e7d32` on `#c8e6c9`), **Warning** (`#7c5a00` on `#fff3cd`): toasts, badges, validation, ping/health states. Each has an `-emphasis` text shade for legibility on its container.

### Named Rules
**The One Voice Rule.** Terracotta is the only accent. It appears on ≤ ~10% of any screen — primary action, current selection, brand mark, focus. Its rarity is what makes it read as confident rather than loud. Never introduce a second saturated hue for decoration.

**The Warm Neutral Rule.** Every neutral is tinted toward the brand's brown hue. Never reach for a cool/blue-gray "for contrast"; it breaks the paper feeling.

## 3. Typography

**Display / Body / Label Font:** Inter (with `system-ui, -apple-system, sans-serif`)
**Mono Font:** `ui-monospace, SFMono-Regular, Menlo` — for the prompt editor, JSON sample data, IDs, and RSS URLs.

**Character:** One family, many weights. Inter is neutral, legible at small sizes, and dense-data friendly — the right choice for a workstation. Hierarchy is built from weight (400→900) and size, never from a second typeface.

### Hierarchy
- **Display** (800, 26px, -0.03em): Page titles ("Settings", "History", "Sources"). The heaviest type on any screen.
- **Title** (700, 16px): Card and post titles, section sub-heads.
- **Body** (400, 15px, 1.5): Default text and help copy. Cap prose at 65–75ch (the centered form/reading column enforces this).
- **Label** (700, 11px, +0.06em, UPPERCASE): Panel and section labels (Inspector sections, settings card heads, table column heads). A product convention, not a marketing eyebrow.
- **Mono** (400, 13px): Code, JSON, IDs, URLs.

### Named Rules
**The Weight-Not-Family Rule.** Contrast comes from Inter's weight range, never from pairing a second font. If a heading needs more presence, go heavier or larger — don't introduce a display face.

**The Earned-Label Rule.** All-caps section labels are allowed *inside* panels and tables where they organize controls. They are forbidden as decorative eyebrows above page sections — one contextual label per region, never a stack of redundant ones.

## 4. Elevation

Flat by default. The system conveys depth through tonal layering (warm-white body →
card-white surfaces → surface-low/container insets), not through ambient shadow. A single
soft shadow exists, and it is reactive: it appears on hover to signal interactivity, and
on the modal/toast layer to lift transient surfaces above the page.

### Shadow Vocabulary
- **Hover lift** (`box-shadow: 0 4px 16px rgba(0,0,0,0.07)`): Post cards and other clickable containers on `:hover` only.
- **Floating layer** (`box-shadow: 0 4px 16px rgba(27,28,28,0.12)`): Toasts and modal dialogs — surfaces that live above the page.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. A shadow is a response to state (hover) or a signal of layer (modal/toast) — never decoration on a resting element.

## 5. Components

### Buttons
- **Shape:** Gently rounded (`0.5rem` / `--radius`; small `sm` size uses `0.25rem`). Heights: sm 30px, md 36px, lg 44px.
- **Primary:** Terracotta fill, white text. Hover deepens to `#c3512f`. The one high-emphasis action per view.
- **Secondary:** Card-white fill, ink text, 1px border. The neutral default for most actions.
- **Ghost:** Transparent, muted text; fills with `surface-container` on hover. Low-emphasis / inline actions (All / None, Ping).
- **Danger:** `error-container` fill with `error` text at rest; inverts to solid `error`/white on hover. Destructive actions only.
- **Disabled:** 45% opacity, `not-allowed` cursor. **Loading:** centered spinner with hidden label.

### Badges / Chips
- **Style:** Pill (`9999px`), 11px/600, `2px 8px`. Variants: `primary` (terracotta-soft), `success`/`error`/`warning` (semantic container + emphasis text), `muted` (transparent + border), `default` (surface-container).
- **State:** Used for status (post `rendered`/`draft`), source health, and theme tags.

### Cards / Containers
- **Corner Style:** `1rem` (`--radius-lg`) for content cards; inputs and inset notes use `0.5rem`.
- **Background:** Card-white on the warm-white body.
- **Shadow Strategy:** None at rest; `0 4px 16px rgba(0,0,0,0.07)` on hover for clickable cards (see Elevation).
- **Border:** 1px `border` (`#e4e2e2`).
- **Internal Padding:** `none` / `sm` (12px) / `md` (24px) variants.
- **Never nest cards inside cards** — use spacing and 1px dividers for internal hierarchy.

### Inputs / Fields
- **Style:** Card-white fill, 1px `border`, `0.5rem` radius, ~38px tall.
- **Focus:** Border shifts to terracotta + a `0 0 0 3px` terracotta-soft glow (the focus ring is consistent across input, select, textarea, and the stepper dot).
- **Error:** Border + message in `error`. **Disabled:** reduced opacity.

### Navigation
- **Style:** Left sidebar (220px), card-white, 1px right border. Items are 40px rows: 14px muted text + leading icon.
- **States:** Hover → `surface-low`; **active** → terracotta-soft pill with terracotta text (600).
- **Mobile:** Below 768px the sidebar collapses to a 60px icon rail (labels and brand wordmark hide); it does not become a separate mobile shell. This is a desktop tool.

### Signature: The Stepper & The Builder
- **Stepper:** A 4-step horizontal progress row (Scrape → Compose → Edit → Export). Done steps fill terracotta; the current step is a ringed dot with the soft glow; upcoming steps are muted. Below 640px the per-step descriptions drop so all four fit.
- **Builder:** A full-bleed 3-panel editor (tree · canvas · inspector) with its own dense toolbar grouped by separators. The inspector header is contextual ("Document" or "{kind} node [path]").

## 6. Do's and Don'ts

### Do:
- **Do** keep terracotta to ≤ ~10% of a screen — primary action, current selection, brand, focus (The One Voice Rule).
- **Do** tint every neutral toward the brand's warm brown hue; use `surface-low`/`container` for tonal layering instead of shadow.
- **Do** build type hierarchy from Inter's weight and size alone.
- **Do** use width intentionally: full-bleed for work areas (wizard, builder), a centered `--content-narrow` (720px) column for forms and prose, and the centered `--content-max` (1080px) column for lists.
- **Do** give every interactive element its full state set: default, hover, focus-visible, active, disabled, loading.
- **Do** use skeletons for content loading, not a centered spinner.

### Don't:
- **Don't** add an eyebrow kicker / all-caps label above every page section. All-caps labels belong *inside* panels and tables, one per region (The Earned-Label Rule).
- **Don't** use `border-left` greater than 1px as a colored accent stripe on cards, callouts, or alerts. Use a full 1px border + a leading icon.
- **Don't** introduce a second saturated accent color, gradients, gradient text, or glassmorphism.
- **Don't** ship the SaaS-cream dashboard look, the over-decorated "delightful" tool, or narrow content marooned in empty space (PRODUCT.md anti-references).
- **Don't** nest cards inside cards, or apply a resting shadow as decoration.
- **Don't** reach for a cool/blue-gray neutral; it breaks the warm paper feeling.
