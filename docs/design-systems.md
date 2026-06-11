# Design Systems

One theme ships: **warm-industrial**. The `digital-broadsheet` theme was removed in v2.

## warm-industrial

Source of truth: `assets/design-systems/warm-industrial.json`. Loaded at runtime via `loadTheme('warm-industrial')`.

### Vibe

Soft brutalism. Rounded corners (8px default), bold display sans-serif, terracotta accent (`#a2391a`) on a warm off-white surface (`#fbf9f8`). Tactile, magazine-like.

**Typeface.** Inter (400/500/600/700/800/900 — static TTFs). Loaded from `assets/fonts/` and served at `/assets/fonts/` by the API; the template interpreter injects `@font-face` rules into every rendered HTML string.

### Tokens

| Group | Examples |
|-------|----------|
| `colors` | `surface`, `on-surface`, `primary` (`#a2391a`), `outline`, full Material 3 container ramp |
| `typography` | `display` (80px/800), `headline-lg` (48px/800), `headline-md` (32px/700), `body-lg`, `body-md`, `label-bold` |
| `spacing` | `xs=4px`, `sm=12px`, `md=24px`, `lg=48px`, `xl=80px` |
| `rounded` | `sm=0.25rem`, `DEFAULT=0.5rem`, `md=0.75rem`, `lg=1rem`, `xl=1.5rem` |
| `shapes` | `borderWidth=2px` |

See `assets/design-systems/warm-industrial.json` for all values.

## Template JSON system

In v3, slide rendering is done by the interpreter (`renderTemplate`), which evaluates a `TemplateDoc` JSON tree into a complete HTML document string, then Playwright screenshots it.

### How it works

1. `loadTemplate(theme, variant)` reads `assets/templates/warm-industrial/<variant>.json`
2. `renderTemplate(doc, slideData, theme, {fontBaseUrl, index, total})` walks the TNode tree
3. Style values are resolved: `$color.primary` → `theme.colors['primary']`, numbers get `px`, typography tokens expand
4. `{{bindings}}` in text nodes are substituted from `slideData`
5. The result is a self-contained HTML doc with embedded `@font-face` rules

### Visual builder (`/builder`)

The template builder lets you edit JSON templates visually:
- **Preview mode** (iframe): sends the doc to `POST /api/preview`, shows a pixel-true render
- **Edit mode** (React): renders the TNode tree directly in the browser using `resolveStyleBrowser` (Canvas.tsx)

`resolveStyleBrowser` mirrors `resolveStyle` from core but returns React CSSProperties (camelCase keys) instead of a CSS string (kebab-case). Token resolution uses the same `$group.key` logic with a singular/plural fallback for group names.

Save in the builder writes via `PUT /api/templates/:theme/:id`.

### Reference HTML

Original visual-spec HTML files are archived at `plans/swarm/reference/html-specs/`. They are not used at runtime.

## Canvas

Every slide is **1080 × 1080 px** — Instagram square post format, hard-coded in the renderer.

## UI app design system (distinct from the slide theme)

The tokens above (`assets/design-systems/warm-industrial.json`) drive **slide rendering**. The
**UI chrome** (wizard, history, sources, settings, builder) has its own design system:

- **Tokens:** CSS custom properties in `ui/src/styles/global.css` (`:root`). Includes surfaces, the terracotta accent + `--primary-soft`/`--surface-tint`, semantic `--success`/`--error`/`--warning` (each with `-emphasis`/`-container`), spacing, radii, and the `--content-max` (1080px) / `--content-narrow` (720px) layout columns.
- **Canonical reference:** `DESIGN.md` at the repo root (Stitch format) documents the full system — palette, type scale, elevation, components, and the named rules ("The One Voice Rule", "The Earned-Label Rule", etc.). `PRODUCT.md` carries the strategic register. `.impeccable/design.json` is the machine-readable sidecar.
- **Shared primitives:** `ui/src/components/ui/` — `Button`, `Card`, `Input`, `Textarea`, `Select`, `Toggle`, `Badge`, `Skeleton`, `PageHeader`, `Stepper`, `Modal`, `ConfirmDialog`, `Toast`, etc. Pages and feature components compose these; the page-top title/subtitle/actions pattern is `PageHeader`. **Avoid raw `<input>`/`<select>`/`<button>`/dialog elements in feature components — route them through this library.** A native element is acceptable only when no primitive fits (e.g. `<input type="color">`, the cursor-aware text-node `<textarea>` in the builder Inspector).
- **Base UI foundation:** the interactive/overlay primitives are built on [`@base-ui/react`](https://base-ui.com) (headless + accessible), styled with the tokens above. The wrapper APIs are stable, but two follow Base UI's value-callback convention: `Select` uses `value` + `onValueChange(value)` and `Toggle` (a Base UI `Switch`) uses `checked` + `onCheckedChange(checked)` — not the native `onChange`. `Modal` wraps `Dialog`; `Toast`'s `ToastProvider`/`useToast().addToast()` API is unchanged but backed by Base UI's toast manager.
- **Navigation:** one shared `ui/src/components/Sidebar.astro` renders the nav rail for every page (App-layout pages and the full-screen builder). It owns the nav links, the Lucide SVG icon set, and `transition:persist` so it survives view transitions. Both layouts mount Astro's `<ClientRouter />`, so page changes crossfade instead of full-reloading.

When changing UI tokens or shared primitives, update `DESIGN.md` so generated screens stay on-brand.
