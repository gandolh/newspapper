# Rendering Issue: Stitch Design System Not Applied

## The Problem

The generated slides don't match the Stitch design system because:

1. **You created HTML templates** in `templates/warm-industrial/` with the Stitch design patterns:
   - Blocked/hard shadows (`box-shadow: 8px 8px 0px #1b1c1c`)
   - Grid textures (linear gradient overlays)
   - Structural borders (20px borders)
   - Utilitarian badges with shadows
   - Specific typography hierarchy

2. **But the renderer uses `@napi-rs/canvas`** (`src/renderer/screenshot.ts`) which:
   - Draws slides programmatically with canvas drawing commands
   - **Completely ignores your HTML templates**
   - Uses generic card/badge rendering that doesn't match Stitch aesthetics

## Why This Happened

The screenshot renderer was built before the HTML templates existed. It renders slides by:
- Drawing backgrounds, cards, and text directly on canvas
- Using generic design patterns (rounded corners, simple shadows)
- Not reading or using the HTML template files at all

## Solutions

### Option 1: Use Puppeteer (Recommended but you rejected)
- Install Puppeteer to render HTML templates as screenshots
- Pros: Perfect match to your HTML designs
- Cons: Requires headless browser, you explicitly said no

### Option 2: Rewrite Canvas Renderer (Current approach)
- Update `screenshot.ts` to implement Stitch design patterns manually
- Pros: No external dependencies, fast rendering
- Cons: Must manually replicate all HTML/CSS designs in canvas code
- Status: Partially implemented (added helper functions)

### Option 3: Use Playwright or Playwright-core
- Lighter alternative to Puppeteer
- Can render HTML without full browser
- Still requires some browser components

### Option 4: Server-side HTML to Image
- Use libraries like `node-html-to-image` or `html2canvas`
- May still require browser components under the hood

## Current State

I've added helper functions to `screenshot.ts`:
- `drawGridTexture()` - for grid overlays
- `drawBlockedShadow()` - for hard shadows
- `drawStructuralBorder()` - for heavy borders

But the main render functions (`renderTitle`, `renderBody`, `renderQuote`) still need complete rewrites to match each template variation's specific design.

## Recommended Next Steps

**Choose one:**

1. **Accept Puppeteer** - Install it and use HTML templates directly (cleanest solution)
2. **Manual canvas rewrite** - I'll rewrite all render functions to match Stitch designs (time-consuming)
3. **Simplify templates** - Keep canvas renderer, simplify HTML templates to match what canvas can do
4. **Hybrid approach** - Use a lighter HTML-to-image library

Which approach would you prefer?
