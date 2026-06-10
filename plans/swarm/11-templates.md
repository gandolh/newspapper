# Wave 1A — Template system: JSON docs + HTML interpreter + the 9 warm-industrial templates

## Project context

Newspapper turns daily RSS news into an Instagram-style slide post (1080×1080 PNGs), rebuilt as a local web app: npm workspaces monorepo — `core/` (pipeline library), `api/` (Fastify), `ui/` (Astro+React). Slide layouts are **JSON template documents** interpreted into self-contained HTML, which Playwright Chromium screenshots at 1080×1080 (another agent builds the screenshotter — you only produce HTML strings). The same interpreter output is shown in iframes in the UI, so your HTML must be fully self-contained.

You build the template system: types are already defined in `core/src/types.ts` (TemplateDoc, TNode, TStyle, FieldSpec, Theme, RenderTemplateOptions — read them first, they are the contract; do not change them).

## Rules

- Owned paths: `core/src/templates/**`, `core/src/themes/**`, `assets/templates/**`, `assets/design-systems/**`. Touch nothing else (other agents work in parallel). No package.json edits — if a dep is missing, append to `plans/swarm/NEEDS.md`.
- Do NOT git commit. No edits to `docs/` or `CLAUDE.md`.
- TypeScript strict, ESM, co-located vitest tests (`*.test.ts`).
- **Browser-safety split**: `core/src/templates/index.ts` (the `@newspapper/core/templates` subpath) must be pure — no `fs`, `path`, or any Node API — because the UI imports it. File-system code goes in `core/src/templates/registry.ts`, exported only via the core main entry.

## Task 1 — Interpreter (`core/src/templates/`)

`renderTemplate(doc: TemplateDoc, data: Record<string, unknown>, theme: Theme, opts: RenderTemplateOptions): string`

Returns a **complete HTML document**: `<!doctype html><html><head><style>…</style></head><body>…</body></html>` where the body content is exactly 1080×1080 (`margin:0`, a root div `width:1080px;height:1080px;overflow:hidden;display:flex`).

- `@font-face` for Inter weights 400/500/600/700/800/900 pointing at `${opts.fontBaseUrl}/Inter-{Regular,Medium,SemiBold,Bold,ExtraBold,Black}.ttf` (files exist in `assets/fonts/`). Default body font Inter.
- Node semantics:
  - `box` → `<div>` with resolved inline styles, children recursively.
  - `text` → `<div>` with resolved styles and the text content with `{{bindings}}` substituted. HTML-escape all substituted values. Unknown binding → empty string.
  - `repeat` → for `source: "items"`, iterate `data.items` (array); render `children` once per element with bindings `{{item}}` (stringified element; if elements are objects, `{{item.label}}` style dot-paths must work) and `{{i}}` (1-based index). The repeat node itself renders as a `<div>` wrapper with its style.
- Dot-path bindings: `{{left.label}}` resolves nested objects in `data`.
- Built-ins available everywhere: `{{_index}}`, `{{_total}}` (from opts), `{{_date}}` (from `data._date` if present, else empty).
- Style resolution (`resolveStyle(style: TStyle, theme: Theme): Record<string,string>` — export this, the visual builder reuses it):
  - String values starting with `$` are token refs: `$color.primary` → `theme.colors['primary']`, `$spacing.lg` → `theme.spacing['lg']`, `$rounded.md` → `theme.rounded['md']`. Unknown token → throw with a clear message.
  - Special key `typography: "display"` expands to the theme typography token's fontFamily/fontSize/fontWeight/lineHeight/letterSpacing, then is removed; explicit keys on the same node override the expansion.
  - camelCase keys → kebab-case CSS; numbers → `px` (except unitless props: lineHeight, fontWeight, opacity, flex, flexGrow, flexShrink, zIndex).
- Full CSS is allowed (Grid, position absolute, gradients, shadows) — there is no Satori anymore.
- Also export `validateTemplateDoc(doc: unknown): TemplateDoc` (throws with field-level messages) and `validateSlideData(doc: TemplateDoc, data: unknown)` (checks required fields per FieldSpec).

## Task 2 — Theme loader (`core/src/themes/`)

Port the old loader (reference copy: `plans/swarm/reference/old-render/theme.ts`): `loadTheme(name: string): Theme` reading `assets/design-systems/<name>.json`, plus `listThemes(): string[]`. Node-only (fs) — exported from core main entry, not the browser subpath.

## Task 3 — Registry (`core/src/templates/registry.ts`)

File-backed CRUD over `assets/templates/<theme>/<id>.json`:
- `listTemplates(theme: string): TemplateDoc[]` (sorted: title family first, then body, then quote)
- `loadTemplate(theme: string, id: string): TemplateDoc`
- `saveTemplate(doc: TemplateDoc): void` (validates first)
- `deleteTemplate(theme: string, id: string): void`
- `templatesForFamily(theme: string, family: TemplateDoc['family']): TemplateDoc[]`

## Task 4 — Port the 9 warm-industrial templates to JSON

Source materials:
- Visual spec: `assets/templates/warm-industrial/*.html` (9 reference files — these were the original design intent, free to use Grid/absolute since Satori is gone)
- Old runtime layouts: `plans/swarm/reference/old-render/*.tsx`
- Tokens: `assets/design-systems/warm-industrial.json`

Create `assets/templates/warm-industrial/<id>.json` for: `title-main`, `title-statement`, `title-question`, `body-text`, `body-list`, `body-comparison`, `quote-classic`, `quote-pullout`, `quote-reaction`. The old `.html` files stay in place (reference only).

Each doc needs correct `fields` + `sample`. Field specs per variant (keys must match the SlideBlock union in types.ts exactly):
- title-main: `text` (textarea, required), `kicker` (text, optional)
- title-statement / title-question: `text` (textarea, required)
- body-text: `heading` (text), `body` (textarea)
- body-list: `heading` (text), `items` (list)
- body-comparison: `heading` (text), `left` (pair), `right` (pair) — pair = `{label, body}`
- quote-*: `quote` (textarea), `attribution` (text)

Every template includes a footer (slide number `{{_index}}/{{_total}}` + small brand mark) consistent with the reference HTML. Use theme tokens (`$color.*`, `$spacing.*`, `typography:`) rather than hard-coded values wherever a token exists.

## Task 5 — Tests

- resolveStyle: token resolution, typography expansion, kebab-casing, px-suffixing, unknown-token throw.
- renderTemplate: binding substitution + HTML escaping (`<script>` in data must come out escaped), dot-paths, repeat with `{{i}}`/`{{item.label}}`, built-ins.
- All 9 docs pass `validateTemplateDoc`; each renders with its own `sample` to non-empty HTML containing the sample strings.
- One golden test: `title-main` rendered with fixed data matches an inline-snapshot (use vitest `toMatchInlineSnapshot` once, keep it readable).

## Verify

`npx vitest run core/src/templates core/src/themes` green, `tsc --noEmit` in core green. For a visual sanity check you may write a throwaway script that writes each template's sample render to `/tmp/tpl-*.html` and inspect lengths — do not leave the script in the repo.

## Final report

List the files created, describe any places where the reference HTML couldn't be reproduced faithfully and what you did instead, and paste one full example template JSON (the smallest) in the report.
