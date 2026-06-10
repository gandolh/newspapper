# Wave 4 — Visual template builder

## Project context

Newspapper turns daily RSS news into an Instagram-style slide post (1080×1080 PNGs), rebuilt as a local web app. Monorepo: `core/` (pipeline), `api/` (Fastify :3001), `ui/` (Astro + React islands; dev proxy forwards `/api`, `/output`, `/assets`). Everything else is FINISHED: wizard, editor, export, management pages. You build the last and most ambitious piece: the **visual template builder** at `/builder`, where the user edits the slide templates themselves — the JSON documents that define each slide variant's layout.

### The template model (the thing you're editing)

Templates are `TemplateDoc` JSON files (`assets/templates/<theme>/<id>.json`), contract in `core/src/types.ts` (mirrored in `ui/src/lib/types.ts`):

```ts
type TStyle = Record<string, string | number>;
// Token refs in values: "$color.primary", "$spacing.lg", "$rounded.md"
// Special key typography: "display" expands to the theme's typography token.
type TNode =
  | { kind: 'box'; style?: TStyle; children?: TNode[] }
  | { kind: 'text'; style?: TStyle; text: string }                       // {{bindings}}
  | { kind: 'repeat'; source: string; style?: TStyle; children: TNode[] }; // {{item}}, {{i}}
interface TemplateDoc {
  id: string; theme: string; family: 'title'|'body'|'quote'; name: string;
  fields: FieldSpec[];                  // {key,label,kind:'text'|'textarea'|'list'|'pair',required}
  sample: Record<string, unknown>;      // preview data
  root: TNode;
}
```

The browser-safe interpreter is importable: `import { resolveStyle } from '@newspapper/core/templates'` — `resolveStyle(style, theme)` returns final CSS properties (token refs resolved, typography expanded, numbers px-suffixed). **Use it for the canvas so edit-mode styling matches the real renderer.** Check what else `core/src/templates/index.ts` exports browser-safely (e.g. validators) and reuse rather than reimplement. Theme tokens come from `GET /api/themes` → `[{name, tokens}]` (tokens: `colors`, `typography`, `spacing`, `rounded` records).

### API routes you consume

- `GET /api/templates?theme=` → `TemplateDoc[]`; `GET /api/templates/:theme/:id`; `PUT /api/templates/:theme/:id` (validates server-side, 400 with message on invalid); `POST /api/templates` (create, 409 if exists); `DELETE /api/templates/:theme/:id`.
- `POST /api/preview` `{doc, data, theme, index, total}` → `text/html` — accepts an INLINE doc; this is your pixel-true preview (iframe srcDoc).

## Rules

- Owned paths: `ui/src/pages/builder.astro`, `ui/src/components/builder/**`. Touch nothing else. Missing dep → `plans/swarm/NEEDS.md`; strongly prefer none (native HTML5 drag-and-drop or move buttons — no dnd library).
- Do NOT git commit. No edits to `docs/` or `CLAUDE.md`. Reuse the kit (`ui/src/components/ui/`) and warm-editorial styles.

## Layout

Four zones: top bar (template picker + actions), left tree panel, center canvas, right inspector.

## Task 1 — Template management (top bar)

- Theme select + template select (grouped by family); Save (PUT, disabled when clean, server validation errors → toast with message), Revert (reload from API, confirm if dirty), Duplicate (Modal: new id/name → POST), Delete (ConfirmDialog → DELETE), New (Modal: id, name, family → POST with a minimal starter root: one box with one text node bound to the family's main field).
- Dirty tracking + `beforeunload` guard. Sample-data switcher: edit the doc's `sample` in a small JSON textarea drawer (validated on apply) so users preview with their own content.

## Task 2 — Canvas (center)

Two modes, toggle in the top bar:
- **Preview mode (pixel-true)**: iframe via `POST /api/preview` with the current in-memory doc + sample, debounced ~400ms after changes, CSS-scaled to fit (~600px).
- **Edit mode (interactive)**: recursive React rendering of the TNode tree as real DOM — each node a `div` styled with `resolveStyle(node.style, themeTokens)`; text nodes show their raw text with `{{bindings}}` left visible; repeat nodes render children once per sample-array element. Wrap each node in a selection shell: hover outline, click to select (stopPropagation), selected = terracotta outline + a small kind tag. The canvas root is a 1080×1080 div scaled with `transform: scale()`.
- Drag-to-reorder among siblings in edit mode (native HTML5 DnD with drop indicators) — if this fights you, ship up/down moves in the tree panel as the primary mechanism and basic DnD as best-effort; say which in the report.

## Task 3 — Tree panel (left)

- Nested tree of the doc (kind icon, text snippet/source label), click selects (syncs with canvas), expand/collapse.
- Node operations (toolbar on the selected row): add child (box/text/repeat — only box/repeat accept children), add sibling after, delete (with subtree, ConfirmDialog when it has children), move up/down, duplicate subtree.
- Root cannot be deleted.

## Task 4 — Inspector (right) — selected node

- **Text node**: textarea for `text`; a "binding" helper Select listing the doc's field keys + built-ins (`_index`, `_total`, and inside repeat: `item`, `i`) that inserts `{{key}}` at the cursor.
- **Repeat node**: `source` Select from fields with `kind: 'list'`.
- **Style editor** (all kinds), grouped sections:
  - Layout: display (flex/grid/block), flexDirection, justifyContent, alignItems, gap, flex; position (static/absolute) + top/right/bottom/left when absolute; width/height; padding/margin (single field accepting CSS shorthand).
  - Appearance: background (color), color, borderRadius, border, boxShadow, opacity.
  - Typography (text nodes): the special `typography` token Select (from theme typography keys) + overrides fontSize/fontWeight/lineHeight/letterSpacing/textAlign/textTransform.
  - **Token-aware color/spacing inputs**: color fields = swatch row of theme colors (sets `$color.<key>`) + free hex input; spacing-ish fields offer `$spacing.*` chips + free value. Show resolved value as helper text when a token is set.
  - Raw escape hatch: collapsible "All styles (JSON)" textarea editing the node's full `style` object, validated on apply.
- **Doc-level tab** (when nothing/root selected): name, family (read-only after creation), fields editor (add/remove/edit FieldSpec rows — warn that keys must match slide data), id read-only.

## Task 5 — Safety net

Undo/redo (in-memory snapshot stack, ~50 deep, Ctrl+Z / Ctrl+Shift+Z) — mutations are centralized through one `applyChange(doc => newDoc)` so this is cheap. Don't ship without it; mis-clicks in a structural editor are constant.

## Verify

`npm run dev`: open every one of the 9 warm-industrial templates — each must render in BOTH canvas modes without errors. Make a visible edit (e.g. change title-main's accent color via a token swatch), Save, confirm the JSON on disk changed and the wizard editor's preview (step 3) reflects it; then Revert your test edit and Save again (leave the repo's templates as you found them unless a fix was genuinely needed — note any). Duplicate → edit → delete a scratch template. Edit↔preview modes should look closely alike (flag any drift you can't fix in the report). `astro build` passes.

## Final report

What you built per zone, DnD vs buttons outcome, undo depth/behavior, edit-vs-preview drift notes, template files touched and their end state.
