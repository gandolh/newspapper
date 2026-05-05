# Design Systems

## Overview

Newspapper supports two distinct design systems for generating Instagram slides. Each system has its own aesthetic philosophy, color palette, typography, and component templates.

---

## Digital Broadsheet

### Philosophy

Inspired by the Golden Age of print journalism and mid-century technical manuals. Built on **established trust** and **technical precision** for users who value deep focus and information density.

**Aesthetic:** Modern Editorial
- **Structural Integrity:** Rigid, modular grid organizing complex data
- **Institutional Weight:** Large, authoritative serif typography
- **Utilitarian Discipline:** High-contrast 1px borders and monospaced labels
- **Emotional Response:** "Archival permanence" - vetted, organized, built to last

### Colors

```yaml
colors:
  # Surface colors (newsprint foundation)
  surface: '#fcf9f4'                    # Warm off-white newsprint
  surface-dim: '#dcdad5'
  surface-bright: '#fcf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ee'
  surface-container: '#f0ede8'
  surface-container-high: '#ebe8e3'
  surface-container-highest: '#e5e2dd'
  
  # Text colors
  on-surface: '#1c1c19'                 # Charcoal for body text
  on-surface-variant: '#434843'
  inverse-surface: '#31302d'
  inverse-on-surface: '#f3f0eb'
  
  # Borders and outlines
  outline: '#737973'
  outline-variant: '#c3c8c1'
  
  # Primary (Forest Green) - tradition and growth
  surface-tint: '#4d6453'
  primary: '#061b0e'
  on-primary: '#ffffff'
  primary-container: '#1b3022'
  on-primary-container: '#819986'
  inverse-primary: '#b4cdb8'
  
  # Secondary (Charcoal) - structural elements
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e4e2e1'
  on-secondary-container: '#656464'
  
  # Tertiary (Muted Slate) - metadata
  tertiary: '#121814'
  on-tertiary: '#ffffff'
  tertiary-container: '#262d28'
  on-tertiary-container: '#8d948e'
  
  # Error states
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  
  # Fixed colors
  primary-fixed: '#d0e9d4'
  primary-fixed-dim: '#b4cdb8'
  on-primary-fixed: '#0b2013'
  on-primary-fixed-variant: '#364c3c'
  
  secondary-fixed: '#e4e2e1'
  secondary-fixed-dim: '#c8c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474747'
  
  tertiary-fixed: '#dde4dd'
  tertiary-fixed-dim: '#c1c8c1'
  on-tertiary-fixed: '#171d19'
  on-tertiary-fixed-variant: '#424843'
  
  background: '#fcf9f4'
  on-background: '#1c1c19'
  surface-variant: '#e5e2dd'
```

**Usage Guidelines:**
- Avoid gradients or vibrant neon colors
- Palette should remain flat and ink-like
- Simulate high-quality lithographic printing

### Typography

```yaml
typography:
  # Headlines - Newsreader Serif (authoritative, traditional)
  display-lg:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  
  headline-md:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  
  headline-sm:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  
  # Body text - Newsreader Serif
  body-lg:
    fontFamily: Newsreader
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  
  body-md:
    fontFamily: Newsreader
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  
  # Technical labels - Space Grotesk (geometric, technical)
  meta-technical:
    fontFamily: Space Grotesk
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.2'
```

**Usage Guidelines:**
- Technical labels: generous letter spacing, occasionally uppercase
- All technical labels treated as "read-out" or "tag" status

### Layout & Spacing

```yaml
spacing:
  unit: 4px              # Base unit
  gutter: 24px           # Between elements
  margin: 32px           # Container padding
  column-count: '12'     # Grid columns
  container-max: 1280px  # Max width (not applicable for 1080x1080)
```

**Grid System:**
- **Fixed Grid** inspired by newspaper broadsheets
- 12-column structure for asymmetric but balanced compositions
- **Visible Framework:** 1px charcoal borders define all sections
- **Modular Blocks:** Content housed in "Cells"
- Vertical borders extend full height for broadsheet column feel
- Spacing strictly based on 4px baseline
- Padding inside cells: 24px or 32px

### Elevation & Depth

**No shadows, blurs, or Z-axis depth.** Use:
- **Bold Borders:** 1px solid for containers, 2px for active/focused states
- **Tonal Layering:** Slightly darker backgrounds (#EDEAE4) for inset data
- **Flat Stack:** Overlays appear as paper on paper with 1px border

### Shapes

**Strictly Sharp (0px border-radius)**
- 90-degree corners on all elements
- Reinforces "technical manual" and "printed press" aesthetic
- Curved lines reserved exclusively for typography letterforms

### Component Guidelines

**Buttons:**
- Rectangular with 1px borders
- Primary: solid Forest Green background, off-white text
- Secondary: Charcoal border, no fill
- Hover: invert fill and border colors

**Tags:**
- `meta-technical` font style
- Enclosed in 1px box
- Status indicators: small solid square prefix in status color

**Cards:**
- Bounded by 1px borders on all sides
- Adjacent cards share borders for unified table structure
- Not elevated surfaces, but "Grid Cells"

**Masthead:**
- Top section with `display-lg` headline
- Technical metadata bar: Date, Version, Department

---

## Warm Industrial

### Philosophy

**Soft Brutalism** - rejects sterile modern SaaS interfaces for physically manufactured, grounded aesthetics. Utilitarian and honest, emphasizing structural integrity through bold strokes and oversized elements, while maintaining warmth through organic, earthy tones.

**Aesthetic Balance:**
- **Hard elements:** Heavy borders, massive typography
- **Soft elements:** Generous corner radii, tactile textures
- **For users who value:** Clarity, durability, sense of "place"

### Colors

```yaml
colors:
  # Surface colors (oatmeal foundation)
  surface: '#fbf9f8'                    # Oatmeal - soft, paper-like
  surface-dim: '#dbd9d9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e2'
  
  # Text colors
  on-surface: '#1b1c1c'
  on-surface-variant: '#57423c'
  inverse-surface: '#303030'
  inverse-on-surface: '#f2f0f0'
  
  # Borders and outlines
  outline: '#8b716b'
  outline-variant: '#dec0b8'
  
  # Primary (Terracotta) - warm, high-visibility
  surface-tint: '#a53b1c'
  primary: '#a2391a'
  on-primary: '#ffffff'
  primary-container: '#c3512f'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb5a0'
  
  # Secondary (Slate) - structural weight
  secondary: '#555f6a'
  on-secondary: '#ffffff'
  secondary-container: '#d6e1ee'
  on-secondary-container: '#59646f'
  
  # Tertiary
  tertiary: '#5f5b55'
  on-tertiary: '#ffffff'
  tertiary-container: '#78746d'
  on-tertiary-container: '#fffbff'
  
  # Error states
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  
  # Fixed colors
  primary-fixed: '#ffdbd1'
  primary-fixed-dim: '#ffb5a0'
  on-primary-fixed: '#3b0900'
  on-primary-fixed-variant: '#852405'
  
  secondary-fixed: '#d9e4f0'
  secondary-fixed-dim: '#bdc8d4'
  on-secondary-fixed: '#131d26'
  on-secondary-fixed-variant: '#3e4852'
  
  tertiary-fixed: '#e8e1da'
  tertiary-fixed-dim: '#ccc6be'
  on-tertiary-fixed: '#1e1b17'
  on-tertiary-fixed-variant: '#4a4641'
  
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e2'
```

**Usage Guidelines:**
- Derived from raw building materials and natural pigments
- Avoid pure black (#000000)
- All dark elements use Slate palette to feel "dyed" not "rendered"

### Typography

```yaml
typography:
  # Headlines - Epilogue (chunky, geometric, printed)
  display:
    fontFamily: Epilogue
    fontSize: 80px
    fontWeight: '800'
    lineHeight: '1.0'
    letterSpacing: -0.04em
  
  headline-lg:
    fontFamily: Epilogue
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  
  headline-md:
    fontFamily: Epilogue
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  
  # Body text - Manrope (balanced, contemporary)
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  
  # Labels - Manrope Bold
  label-bold:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.2'
```

**Usage Guidelines:**
- Display sizes: tight leading, negative letter spacing
- Extreme scale shifts: very large headers with modest body text
- Creates rhythmic, editorial layout

### Layout & Spacing

```yaml
spacing:
  base: 8px              # Base unit (strict 8px rhythm)
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-margin: 32px
  gutter: 24px
```

**Grid System:**
- **Fixed-width, centered grid** for desktop
- Generous fluid model for mobile
- Strict 8px spacing rhythm
- Containers sit heavily on oatmeal background
- Whitespace used aggressively to separate information
- Each section is a "station" or "module"

### Elevation & Depth

**No modern shadows or light-source simulation.** Use:

1. **The Canvas:** Base layer (Oatmeal) with subtle high-frequency noise overlay (paper grain)
2. **Structural Borders:** 2px or 3px Slate border on all containers
3. **The "Stamp" Effect:** Active states use hard-offset "shadow" (4px block of Slate at 45° angle)
4. **Layering:** Higher-order info in slightly lighter/darker containers than base

### Shapes

```yaml
rounded:
  sm: 0.25rem    # 4px
  DEFAULT: 0.5rem # 8px - base radius for buttons, inputs
  md: 0.75rem    # 12px
  lg: 1rem       # 16px
  xl: 1.5rem     # 24px - large containers
  full: 9999px   # Fully rounded
```

**Shape Language:**
- Tension between **Hard Borders** and **Soft Corners**
- Base radius: 0.5rem (8px) for buttons, inputs
- Large containers: 1.5rem (24px) for "Soft Brutalism"
- Prevents aggressive "sharp" feel while maintaining structure

### Component Guidelines

**Buttons:**
- 2px Slate border
- Solid Terracotta fill for primary actions
- "Press" state: 2px translation down+right, remove hard-offset shadow

**Chips:**
- "Industrial tags" style
- Slate outline
- Manrope Bold in all-caps
- Look like stamped metal or cardstock labels

**Cards:**
- Paper-grain texture
- 2px Slate border
- Headers use chunky Epilogue even at smaller sizes

**Inputs:**
- Thick 2px Slate border
- Oatmeal fill slightly darker (#E6DFD6) for "inset" appearance
- Labels always above field in `label-bold`

**Checkboxes & Radios:**
- Oversized (24x24px) for "heavy-duty" feel
- Selected: solid Terracotta fill with thick Slate checkmark/dot

**Lists:**
- Solid 1px Slate "hairline" dividers
- Generous vertical padding (md spacing)

---

## Slide Templates

Both design systems support these slide types:

### 1. Title Slide
- Large headline
- Optional subtitle
- Source attribution
- Date

### 2. Body Slide
- Headline
- Paragraph text (summary)
- Optional bullet points

### 3. Quote Slide
- Large quoted text
- Attribution (source name, publication)
- Context

### 4. Image + Caption Slide
- Featured image
- Caption text
- Source credit

---

## Image Specifications

**Format:** PNG (compressed with sharp)
**Dimensions:** 1080x1080px (Instagram post)
**Quality:** 90% (configurable)
**Color Space:** sRGB

---

## Font Loading

**Digital Broadsheet:**
- Newsreader: Google Fonts or local
- Space Grotesk: Google Fonts or local

**Warm Industrial:**
- Epilogue: Google Fonts or local
- Manrope: Google Fonts or local

Fonts should be embedded in HTML templates for offline rendering.

---

## Template Variation

Each design system has 4 template files:
- `title.html` - Title slide
- `body.html` - Body text slide
- `quote.html` - Quote slide
- `image-caption.html` - Image with caption

Templates use Handlebars for variable substitution:
```handlebars
<h1 class="headline">{{title}}</h1>
<p class="body">{{text}}</p>
<div class="meta">{{source}} • {{date}}</div>
```

---

## Accessibility

Both design systems maintain:
- **Contrast ratio:** Minimum 4.5:1 for body text, 3:1 for large text
- **Font sizes:** Minimum 16px for body text
- **Line height:** Minimum 1.5 for body text
- **Color independence:** Information not conveyed by color alone
