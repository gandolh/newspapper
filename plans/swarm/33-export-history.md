# Wave 3C — ExportStep (render, caption, ZIP download) + History page

## Project context

Newspapper turns daily RSS news into an Instagram-style slide post (1080×1080 PNGs), rebuilt as a local web app. Monorepo: `core/`, `api/` (Fastify :3001, FINISHED), `ui/` (Astro + React islands; dev proxy forwards `/api`, `/output`, `/assets`). The main flow is a 4-step wizard (Scrape → Compose → Edit → Export); a sibling agent builds the wizard container in parallel and imports your export component by this exact contract:

```tsx
// ui/src/components/export/ExportStep.tsx — YOU export this
export function ExportStep(props: {
  post: PostRow;
  onPostUpdated: (post: PostRow) => void;   // call after caption save / render completes
  onBack: () => void;                       // back to Edit step
}): JSX.Element;
```

You also own the **History** page (`/history`), replacing its placeholder content (keep the App layout wrapper).

Already available (explore before building):
- Kit `ui/src/components/ui/` (Button, Card, Modal, Toast/useToast, Spinner, Badge, Textarea, ProgressBar, ConfirmDialog, EmptyState…), API client `ui/src/lib/api.ts` (`api<T>()`, `sse()`), types `ui/src/lib/types.ts` (`PostRow`, `PostPayload`).
- API routes you consume:
  - `POST /api/posts/:id/render` (SSE) — progress `{done, total}`, done → `{post: PostRow, files: string[]}` where files are URL paths like `/output/2026-06-10-1/1.png` directly usable in `<img src>`.
  - `POST /api/posts/:id/caption` → updated `PostRow` (payload gains `caption` + `hashtags: string[]`).
  - `PUT /api/posts/:id` `{payload}` → updated `PostRow` (for manual caption edits).
  - `GET /api/posts/:id/export.zip` — ZIP download (404 while status is 'draft').
  - `GET /api/posts` → `PostRow[]` newest first; `DELETE /api/posts/:id`.
  - `PostRow`: `{id, date, title, theme, payload, status: 'draft'|'rendered', outputDir, createdAt, updatedAt}`.

## Rules

- Owned paths: `ui/src/components/export/**`, `ui/src/pages/history.astro`, `ui/src/components/history/**`. Touch nothing else. Missing dep → `plans/swarm/NEEDS.md` (you should need none).
- Do NOT git commit. No edits to `docs/` or `CLAUDE.md`. Match the warm-editorial style in `ui/src/styles/`.

## Task 1 — ExportStep: render

- Entry state A (status 'draft' or payload edited since last render): hero panel with "Render slides" Button → `sse('/api/posts/:id/render', {})`, ProgressBar from `{done,total}` ("Rendering slide 3 of 6…"). On done: call `onPostUpdated(post)`, show the PNG grid.
- Entry state B (status 'rendered'): show the grid immediately (derive file URLs from `outputDir`: `/output/<basename>/<n>.png` for n = 1..slides.length), with a "Re-render" secondary action (note in its tooltip/copy that re-rendering creates a new output folder).
- PNG grid: responsive cards, slide number captions; click → Modal lightbox with prev/next.
- Render failure → readable error panel + Retry.

## Task 2 — ExportStep: caption & hashtags

Side panel next to / under the grid:
- If payload has no caption: "Generate caption" Button → `POST /api/posts/:id/caption` (spinner; on success `onPostUpdated`).
- Editable Textarea for caption + a tag-style editor for hashtags (chips, add via input + Enter, click to remove; store WITHOUT leading `#`, display WITH). Save = `PUT /api/posts/:id` with merged payload (debounced like a form, or explicit Save button — your call, state it in the report). "Copy caption" button copies caption + blank line + `#tags` to clipboard.
- Note under the panel: "caption.txt is included in the ZIP when a caption exists" — and re-render is required for it to land in the ZIP after edits (only show this hint when caption changed after last render).

## Task 3 — ExportStep: download

Primary "Download ZIP" Button (enabled when rendered) → navigate to `/api/posts/:id/export.zip` (plain `<a download>`). Footer: Back button.

## Task 4 — History page

- React island listing all posts: Card per post — date, title, slide count, theme Badge, status Badge (draft amber / rendered green), updatedAt ("2 days ago" style, no date lib — write a 10-line helper), and a first-slide thumbnail `<img>` when rendered (`/output/<dir>/1.png`).
- Actions per card: **Open** → `location.href = '/?post=<id>'` (wizard deep-link, lands on Edit); **Export** → `'/?post=<id>&step=4'`; **Download ZIP** (only when rendered, direct link); **Delete** → ConfirmDialog warning the output folder is removed too → `DELETE`, remove from list, toast.
- EmptyState with a "Create your first post" link to `/`. Group cards by month header when the list grows (simple `slice(0,7)` of date).

## Verify

`npm run dev` against the real API. You need a draft post: `POST /api/articles` a fake article then compose, or insert a draft via a `node -e` script calling core's `createDraft` with a valid hand-built payload. Exercise: render with progress (Chromium runs server-side — this should genuinely work without an LLM), grid + lightbox, ZIP downloads and unzips correctly (`unzip -l`), caption edit + manual save path (LLM caption generation may fail without a live model — verify the error toast), history list/open/delete. `astro build` passes. If the wizard container hasn't landed yet, test ExportStep on a throwaway page and delete it after (note in report).

## Final report

What you built, render+ZIP verification details (actual file list from `unzip -l`), caption save UX choice, anything blocked and why.
