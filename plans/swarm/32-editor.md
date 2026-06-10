# Wave 3B — EditorStep: slide-by-slide post editor with live previews and slide AI

## Project context

Newspapper turns daily RSS news into an Instagram-style slide post (1080×1080 PNGs), rebuilt as a local web app. Monorepo: `core/`, `api/` (Fastify :3001, FINISHED), `ui/` (Astro + React islands; dev proxy forwards `/api`, `/output`, `/assets`). The main flow is a 4-step wizard; you build **step 3, the editor** — where users spend most of their time fixing the LLM's draft. A sibling agent builds the wizard container in parallel and imports your component by this exact contract:

```tsx
// ui/src/components/editor/EditorStep.tsx — YOU export this
export function EditorStep(props: {
  post: PostRow;                            // the draft to edit
  onPostUpdated: (post: PostRow) => void;   // call after every successful save
  onNext: () => void;                       // go to Export step
  onBack: () => void;                       // back to Compose step
}): JSX.Element;
```

Already available (explore before building):
- Kit `ui/src/components/ui/` (Button, Card, Modal, Toast/useToast, Spinner, Badge, Select, Input, Textarea, ConfirmDialog, EmptyState…), API client `ui/src/lib/api.ts` (`api<T>()`, `sse()`), shared types `ui/src/lib/types.ts` (`PostRow`, `PostPayload`, `SlideBlock`, `TemplateDoc`, `FieldSpec`).
- API routes you consume:
  - `GET /api/templates?theme=<theme>` → `TemplateDoc[]` — each has `id` (=== slide variant), `family` ('title'|'body'|'quote'), `name`, `fields: FieldSpec[]` (`{key, label, kind: 'text'|'textarea'|'list'|'pair', required}`).
  - `POST /api/preview` `{templateId, data, theme, index, total}` → `text/html` (a self-contained 1080×1080 document for an iframe).
  - `PUT /api/posts/:id` `{payload: PostPayload}` → updated `PostRow` (validates 2–8 slides).
  - `POST /api/slide-ai` `{slide, action, targetVariant?, articleIds?}` → `{slide: SlideBlock}`; actions: `'shorter' | 'punchier' | 'regenerate' | 'remap'`.

`SlideBlock` field shapes by variant: title-main `{text, kicker?}`; title-statement/title-question `{text}`; body-text `{heading, body}`; body-list `{heading, items: string[]}`; body-comparison `{heading, left: {label, body}, right: {label, body}}`; quote-* `{quote, attribution}`.

## Rules

- Owned paths: `ui/src/components/editor/**`. Touch nothing else; the wizard page mounts you. Missing dep → `plans/swarm/NEEDS.md` (aim for none — no drag-drop libs; use up/down buttons for reorder).
- Do NOT git commit. No edits to `docs/` or `CLAUDE.md`. Match the warm-editorial style in `ui/src/styles/`.

## Layout

Three zones: **left** — vertical slide list (thumbnails); **center** — large live preview of the selected slide; **right** — edit panel (fields + variant + AI). Keep it calm; the preview is the hero.

## Task 1 — State & saving

- Local `payload: PostPayload` state seeded from `props.post.payload`; every mutation goes through one `update(fn)` helper.
- Autosave: debounce 800ms after last change → `PUT /api/posts/:id`; on success call `onPostUpdated`; show a subtle "Saved"/"Saving…"/"Save failed — Retry" indicator near the header. Post title is editable inline at the top (part of payload).
- Footer: Back (calls `onBack`), "Export →" primary (flushes pending save first, then `onNext`).

## Task 2 — Slide list (left)

- One small card per slide: slide number, family Badge, text snippet, and a tiny live thumbnail — an `<iframe>` of `POST /api/preview` scaled down via CSS transform. To avoid hammering the API: thumbnails refresh only when that slide's data changes (debounced 1.5s) — build one `PreviewFrame` component (props: `templateId, data, theme, index, total, scale`) that fetches the HTML via `fetch` → `srcDoc`, with `sandbox=""`, used for both thumbnails and the center preview.
- Reorder: up/down icon buttons per card. Delete: trash icon with ConfirmDialog, blocked (toast) when it would drop below 2 slides.
- "Add slide" at the bottom → Modal: pick family → variant (grouped by family, template `name` + id), inserts after the selected slide with empty-ish defaults derived from the template's `fields` (empty strings, `items: ['', '', '']`, pairs with empty label/body), selects it.
- Cap: block adding past 8 slides (toast).

## Task 3 — Edit panel (right)

- **Form from FieldSpec** of the slide's template: `text` → Input, `textarea` → Textarea, `list` → editable string list (add/remove/reorder rows), `pair` → fieldset with Label Input + Body Textarea. Controlled inputs writing into the payload (which triggers autosave + preview refresh).
- **Variant switcher**: Select of all variants grouped by family. Same-family switch → instant: rename/keep matching fields (quote family shares shape; title-statement↔question share `{text}`; title-main→statement drops kicker after a ConfirmDialog if kicker non-empty). Cross-family switch → ConfirmDialog "AI will convert this content", then `POST /api/slide-ai {action:'remap', targetVariant}`, replace slide on success; keep the pre-switch slide in a one-deep undo: show a toast with an "Undo" action for ~8s.
- **AI menu** ("✦ AI" Button → small popover/menu): Make it shorter / Make it punchier / Regenerate from articles → corresponding slide-ai calls; spinner state on the menu while pending; failures → error toast; result replaces the slide with the same one-deep Undo toast.

## Task 4 — Center preview

The selected slide in a large `PreviewFrame` (CSS-scaled to fit, max ~560px), slide number / total displayed, refresh debounced ~500ms while typing. A small "open full size" action opening the preview HTML in a new tab is a nice touch (object URL).

## Verify

Run `npm run dev` with the real API. Seed a draft to edit: easiest is `curl` — `POST /api/articles` a fake article, then if Ollama isn't reachable, insert a draft directly via a small `node -e` script calling core's `createDraft` with a hand-built valid `PostPayload` (4 slides covering different families) — then open `/?post=<id>`. Exercise: field editing reflects in preview, reorder, add/delete, same-family switch, AI actions (if no live LLM, verify the error toast path), autosave (check `GET /api/posts/:id` shows edits). `astro build` passes.

## Final report

What you built, how preview throttling behaves (requests per keystroke burst), what was verified live vs blocked (and why), any contract deviations.
