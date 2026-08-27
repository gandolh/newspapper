# Wave 3A — Wizard container + Step 1 (Scrape & curate) + Step 2 (Compose)

## Project context

Newspapper turns daily RSS news into an Instagram-style slide post (1080×1080 PNGs), rebuilt as a local web app. Monorepo: `core/` (pipeline), `api/` (Fastify :3001, FINISHED), `ui/` (Astro + React islands; dev proxy forwards `/api`, `/output`, `/assets`). The main flow is a 4-step wizard on `/`: **1 Scrape → 2 Compose → 3 Edit → 4 Export**, with the user able to intervene at every step. You build the wizard shell and steps 1–2. Two sibling agents build step 3 (`EditorStep`) and step 4 (`ExportStep`) **in parallel** — code against their exact prop contracts below; imports may not resolve until they land (acceptable; the wave is verified together).

Already available (built in earlier waves — explore before building):
- Shell: layout `ui/src/layouts/App.astro`, component kit `ui/src/components/ui/` (Button, Card, Stepper, Modal, Toast/useToast, Spinner, EmptyState, Badge, ProgressBar, ConfirmDialog, Input, Textarea, Select, Toggle), API client `ui/src/lib/api.ts` (`api<T>()` + `sse()` for streamed POSTs) and shared types in `ui/src/lib/types.ts` (`Article`, `PostRow`, `PostPayload`, `SlideBlock`, …).
- API routes you consume: `POST /api/scrape` (SSE: progress `{sourceId,status,count?,error?}`, done `{articles, errors}`), `GET /api/articles?date=`, `POST /api/articles` `{title, body, url?, sourceName?}`, `POST /api/compose` (SSE: done = `PostRow`) body `{articleIds: number[], theme?}`, `GET /api/posts/:id`.

## Rules

- Owned paths: `ui/src/pages/index.astro`, `ui/src/components/wizard/**`. Touch nothing else; missing dep → `plans/swarm/NEEDS.md` (you should need none).
- Do NOT git commit. No edits to `docs/` or `CLAUDE.md`. Use the existing kit — no new base components, no CSS frameworks. Match the warm-editorial style already in `ui/src/styles/`.

## Contracts with sibling agents (import these EXACT signatures)

```tsx
// ui/src/components/editor/EditorStep.tsx  (built by agent 3B)
export function EditorStep(props: {
  post: PostRow;
  onPostUpdated: (post: PostRow) => void;  // editor autosaves via PUT and reports back
  onNext: () => void;
  onBack: () => void;
}): JSX.Element;

// ui/src/components/export/ExportStep.tsx  (built by agent 3C)
export function ExportStep(props: {
  post: PostRow;
  onPostUpdated: (post: PostRow) => void;
  onBack: () => void;
}): JSX.Element;
```

## Task 1 — Wizard container (`Wizard.tsx`)

- Mounted from `index.astro` (`client:load`), replacing the placeholder page content but keeping the App layout.
- State: `step: 1|2|3|4`, `selectedArticleIds: number[]`, `post: PostRow | null`.
- Kit `Stepper` across the top: Scrape / Compose / Edit / Export. Completed steps clickable to go back; forward only via each step's primary action.
- Deep link: on mount, if `?post=<id>` in the URL, fetch the post and jump to step 3 (this is how History reopens a post). If `&step=4`, jump to Export.
- Steps 3 and 4 render the sibling components with the contracts above.

## Task 2 — Step 1: Scrape & curate (`ScrapeStep.tsx`)

- On entry, load today's existing articles (`GET /api/articles`). Show a prominent "Fetch today's news" Button → `sse('/api/scrape', …)`: live per-source status list while streaming (source name + spinner/✓ count/✗ error Badge), then merge `done.articles`.
- Article list: Card per article — checkbox (default checked), source Badge, title, expandable body preview (clamp ~3 lines, click to expand), link-out icon when `url` exists. Header shows "N of M selected"; select-all / none.
- "Add article manually" button → Modal with Title (Input), Body (Textarea), URL + Source (optional) → `POST /api/articles`, append checked.
- Empty state when no articles and not yet scraped. Scrape errors surface as a dismissible warning strip listing failed sources (the run still succeeds).
- Primary action: "Compose with AI →" (disabled when 0 selected) → stores selection, advances to step 2.

## Task 3 — Step 2: Compose (`ComposeStep.tsx`)

- Auto-starts on entry: `sse('/api/compose', {articleIds})`. Full-step progress panel: animated indicator, stage text from progress events, the selected article count, and the model name if present in events. This can take a minute on a small model — make waiting feel okay (cycle a few status lines).
- On `done` (a `PostRow`): brief summary screen — post title, slide count, a horizontal strip of mini slide placards (variant Badge + first text line each; no rendering, just text) — with actions "Edit slides →" (→ step 3) and "Regenerate" (re-runs compose with the same selection, after a ConfirmDialog since it discards the draft… it actually creates a new draft row; note that in the confirm copy).
- On `error`: readable failure panel (the message, usually Ollama connectivity) + "Retry" + "Back to articles". Hint linking to `/settings` when the message smells like connection/auth.

## Verify

`npm run dev`, walk the flow against the real API: scrape (needs at least one enabled source in `data/sources.json` — add one temporarily if empty, e.g. a public RSS feed, and remove it after), manual article add, compose (needs Ollama configured — if no live LLM is available, verify up to the compose call and that the error panel renders the failure cleanly). `astro build` must pass even though sibling components may be missing — if they haven't landed, create THROWAWAY stubs at the two contract paths marked with `// TEMP STUB (wave 3A) — replaced by 3B/3C` ONLY if needed for the build check, and say so in your report.

## Final report

What you built, the exact contract files/stubs state at finish, what you could and couldn't verify live (and why).
