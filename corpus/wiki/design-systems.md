---
summary: The warm-industrial-1/2/3 theme family — the three palettes, the eleven-step type ramp and the size-to-token mapping it feeds, and how missingThemeTokens gates every theme in the directory.
updated: 2026-08-31
---

# Design Systems

**Three themes ship**, per
[decisions.md § "A theme varies the components — there are no presets"](decisions.md#a-theme-varies-the-components--there-are-no-presets):
`warm-industrial-1`, `-2`, `-3`. They are a **family, not three designs** —
identical type scale, spacing and shape tokens, differing only in the primary
color (and the handful of tokens tied to it). The `digital-broadsheet` theme
was removed in v2.

## warm-industrial-1 / -2 / -3

Source of truth: `assets/design-systems/warm-industrial-{1,2,3}.json`. Loaded
at runtime via `loadTheme('warm-industrial-1')` etc.; `listThemes()` returns
every `*.json` file in that directory.

### Vibe

Soft brutalism. Rounded corners (8px default), bold display sans-serif, on a
warm off-white surface (`#fbf9f8`). Tactile, magazine-like. The three siblings:

| Theme | Primary | On-primary | Character |
|---|---|---|---|
| `warm-industrial-1` | `#a2391a` (terracotta) | `#ffffff` | The original — warm, editorial red-orange. |
| `warm-industrial-2` | `#1f6b3b` (moss) | `#ffffff` | Same hue family recipe, hue rotated to a deep green. |
| `warm-industrial-3` | `#2e5d9e` (ink) | `#ffffff` | Same recipe, hue rotated to a deep blue. |

`-2` and `-3` were derived from `-1` by holding saturation/lightness and
rotating hue (142° and 215° respectively), then nudging lightness until
on-primary contrast matched `-1`'s. Every other token — `secondary`,
`tertiary`, `error`, all neutrals, `surface`, spacing, rounded, shapes — is
byte-for-byte identical across all three. Only the primary-linked tokens
differ: `primary`, `on-primary`, `primary-container`, `on-primary-container`,
`inverse-primary`, `surface-tint`, `primary-fixed(-dim)`,
`on-primary-fixed(-variant)`.

**Typeface.** Inter (400/500/600/700/800/900 — static TTFs). Loaded from `assets/fonts/` and served at `/assets/fonts/` by the API; the template interpreter injects `@font-face` rules into every rendered HTML string.

### Tokens

| Group | Values (shared by all three) |
|-------|----------|
| `colors` | `surface`, `on-surface`, `primary` (varies — see table above), `outline`, full Material 3 container ramp |
| `typography` | eleven steps — see the ramp below |
| `spacing` | `xs=4px`, `sm=12px`, `md=24px`, `lg=48px`, `xl=80px` |
| `rounded` | `sm=0.25rem`, `DEFAULT=0.5rem`, `md=0.75rem`, `lg=1rem`, `xl=1.5rem` |
| `shapes` | `borderWidth=2px` |

See `assets/design-systems/warm-industrial-1.json` for all values (`-2`/`-3` are the same shape with different primary-linked colors).

### The type ramp

Brief 54 found the original six-token ramp (`display` 80px … `label-bold` 14px)
web-sized for a 1080² square. Brief 61 enlarged it; brief 65 widened it to
**eleven steps**, because six could not give every component five distinct
sizes (see below). All three themes ship the same eleven token names at the
same values — type is what makes them a family.

| Token | Size | Weight | Line height |
|---|---|---|---|
| `display-xl` | 160px | 900 | 0.92 |
| `display-lg` | 128px | 900 | 0.95 |
| `display` | 96px | 800 | 1.0 |
| `headline-lg` | 64px | 800 | 1.1 |
| `headline-md` | 44px | 700 | 1.2 |
| `headline-sm` | 36px | 700 | 1.25 |
| `body-lg` | 30px | 400 | 1.5 |
| `body-md` | 26px | 400 | 1.45 |
| `label-bold` | 20px | 700 | 1.2 |
| `label-sm` | 16px | 700 | 1.2 |
| `label-xs` | 14px | 700 | 1.2 |

Letter-spacing is `em`-relative throughout, so it scales with the size.

### `size` resolves to a token — and every step is distinct (brief 65)

`WZD_TYPOGRAPHY_SCALES` in
[`core/src/wizard/components/style.ts`](../../core/src/wizard/components/style.ts)
maps component + `size` to a **token name**. It used to map `Heading` `lg` and
`xl` both to `display`, and `Stat`'s `md`/`lg`/`xl` all to `display` — so a
person could write `size="xl"`, the linter would accept it, and the slide would
not change. A documented, lint-validated prop was a no-op.

The invariant now: **no component resolves two adjacent sizes to the same
token.**

| Component | `xs` | `sm` | `md` | `lg` | `xl` |
|---|---|---|---|---|---|
| `Heading` | `headline-sm` | `headline-md` | `headline-lg` | `display` | `display-lg` |
| `Text` | `body-md` | `body-lg` | `headline-md` | `headline-lg` | `display` |
| `Item` | `body-md` | `body-lg` | `headline-md` | `headline-lg` | `display` |
| `Quote` | `body-lg` | `headline-md` | `headline-lg` | `display` | `display-lg` |
| `Stat` | `headline-md` | `headline-lg` | `display` | `display-lg` | `display-xl` |
| `Kicker` / `Source` / `PageCounter` | `label-xs` | `label-sm` | `label-bold` | `body-md` | `body-lg` |

`Item` has no `size` prop of its own — it takes the enclosing `List`'s.

`core/src/wizard/components/style.test.ts` **walks the catalogue** rather than a
hand-written list: it discovers every component with a typography scale, orders
its steps from `allowedValues(name, 'size')`, and asserts both that adjacent
steps use different token names and that those names resolve to different
`fontSize` values **in every theme in the directory**. A component added to
`catalogue.ts` is covered without anyone remembering to come back.

### Every theme is gated, and the gate discovers them

`missingThemeTokens(theme)` (`style.ts`) reports the tokens the component
library needs that a theme does not define; the compiler refuses a theme that
fails it. The test that guards this enumerates `listThemes()` at runtime, so a
fourth theme dropped into `assets/design-systems/` is checked the moment it
lands.

### The rename to `warm-industrial-1` (brief 65)

Brief 61 shipped the three suffixed themes but left the unsuffixed
`warm-industrial.json` in place, because ~15 hardcoded call sites named it.
Brief 65 deleted that file and repointed every call site:
`core/src/storage/settings.ts` (`defaultTheme`), `core/src/util/config.ts`
(the `THEME` env default), `core/src/storage/posts.ts` (`DEFAULT_THEME`),
`core/src/storage/db.ts` (the `posts.theme` column default),
`ui/src/components/settings/SettingsIsland.tsx` (the placeholder), and the test
fixtures across `core/src/**` and `api/src/**`. `listThemes()` now returns
exactly `warm-industrial-1`, `-2`, `-3`.

Stored data moved with it: **schema v4** rewrites `posts.theme` and the
`defaultTheme` setting from `'warm-industrial'` to `'warm-industrial-1'`, and
rebuilds `posts` to carry the new column default. See
[data.md § SQLite](./data.md#sqlite--datanewspapperdb).

## TNode interpreter (the compile target, not an authoring surface)

The JSON template documents, their file-backed registry, `/api/templates`, and
`/builder` are all gone — see
[decisions.md § "The template system is removed"](decisions.md#the-template-system-is-removed)
(brief 58). What's left is the pure interpreter every `.wzd` slide compiles
through on its way to Chromium:

1. `core/src/wizard/compile.ts` compiles a parsed `.wzd` document to one `TNode`
   per `<Slide>`, resolving every `{{binding}}` against `<head>` at compile
   time — so nothing reaches the interpreter with unresolved bindings.
2. `renderTemplate(root: TNode, data, theme, {fontBaseUrl, index, total})`
   (`core/src/templates/interpreter.ts`) walks that tree into a complete HTML
   document string, which Playwright then screenshots.
3. Style values resolve the same way they always did: `$color.primary` →
   `theme.colors['primary']`, numbers get `px`, typography tokens expand.
4. `resolveStyle(style, theme)` is exported for direct reuse by the browser
   preview brief 59 builds — no server round-trip needed.
5. `validateSlideData(data)` is now just the non-null-object guard on the
   `data` argument; there is no more per-template field spec to validate
   against.

`GET /api/themes` (list themes + tokens) survived the retirement — it wasn't
part of the template registry — and now lives in its own
`api/src/routes/themes.ts`.

The nine retired JSON template documents are kept as reference for how the
built-in components should look, at
`corpus/briefs/superseded/templates-warm-industrial/`. Unrelated to those:
the original hand-authored visual-spec HTML files (`title-main.html` etc.,
predating the JSON templates) are still archived at
`plans/swarm/reference/html-specs/` and were never used at runtime.

## Canvas

Every slide is **1080 × 1080 px** — Instagram square post format, hard-coded in the renderer.

## UI app design system (distinct from the slide theme)

> **Superseded, not yet replaced in code.** The tokens above drive **slide
> rendering** and carry over untouched. Everything in this section describes the
> **app chrome** built for the four-step pipeline. That chrome is being replaced
> by **The Mechanical** — a paste-up board — chosen 2026-08-27; the system is
> [`DESIGN.md`](../../DESIGN.md) and the rebuild is
> [brief 64](../briefs/todo/64-workstation-chrome.md). Until 64 lands, the
> description below is accurate for what `ui/` renders today, so keep building
> against it.
>
> What changes when 64 lands: a 26px non-photo blue grid governs every surface;
> `border-radius` is `0` throughout; state is carried by a **mark** (rubylith,
> wax, rubber stamp, tissue corner, 45° hatch) rather than a coloured badge; the
> chrome face becomes **Archivo** with **Spline Sans Mono** for the galley, and
> Inter is confined to the rendered slide; the `Stepper` and `Badge` primitives
> retire; `Sidebar.astro` becomes the tray; and animation arrives as
> [anime.js](./decisions-engineering.md#animejs-is-the-motion-engine-tailwind-bound-kits-are-references-only)
> — two moments, nothing else.

The tokens above (`assets/design-systems/warm-industrial-{1,2,3}.json`) drive **slide rendering**. The
**UI chrome** (wizard, history, sources, settings) has its own design system —
`/builder` retired with the template system (brief 58); its canvas, tree panel,
inspector and undo/redo survive for brief 59 to build the post editor on, not
as a page of their own:

- **Tokens:** CSS custom properties in `ui/src/styles/global.css` (`:root`). Includes surfaces, the terracotta accent + `--primary-soft`/`--surface-tint`, semantic `--success`/`--error`/`--warning` (each with `-emphasis`/`-container`), spacing, radii, and the `--content-max` (1080px) / `--content-narrow` (720px) layout columns.
- **Canonical reference:** `DESIGN.md` at the repo root (Stitch format) documents the full system — palette, type scale, elevation, components, and the named rules ("The One Voice Rule", "The Earned-Label Rule", etc.). `PRODUCT.md` carries the strategic register.
- **Shared primitives:** `ui/src/components/ui/` — `Button`, `Card`, `Input`, `Textarea`, `Select`, `Toggle`, `Badge`, `Skeleton`, `PageHeader`, `Stepper`, `Modal`, `ConfirmDialog`, `Toast`, etc. Pages and feature components compose these; the page-top title/subtitle/actions pattern is `PageHeader`. **Avoid raw `<input>`/`<select>`/`<button>`/dialog elements in feature components — route them through this library.**
- **Base UI foundation:** the interactive/overlay primitives are built on [`@base-ui/react`](https://base-ui.com) (headless + accessible), styled with the tokens above. The wrapper APIs are stable, but two follow Base UI's value-callback convention: `Select` uses `value` + `onValueChange(value)` and `Toggle` (a Base UI `Switch`) uses `checked` + `onCheckedChange(checked)` — not the native `onChange`. `Modal` wraps `Dialog`; `Toast`'s `ToastProvider`/`useToast().addToast()` API is unchanged but backed by Base UI's toast manager.
- **Navigation:** one shared `ui/src/components/Sidebar.astro` renders the nav rail for every page. It owns the nav links, the Lucide SVG icon set, and `transition:persist` so it survives view transitions. Pages mount Astro's `<ClientRouter />`, so page changes crossfade instead of full-reloading.

When changing UI tokens or shared primitives, update `DESIGN.md` so generated screens stay on-brand.
