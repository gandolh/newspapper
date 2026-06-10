# Wave 1C — Compose service: Ollama client (local + cloud), post composition, caption, per-slide AI

## Project context

Newspapper turns daily RSS news into an Instagram-style slide post (1080×1080 PNGs), rebuilt as a local web app: npm workspaces monorepo — `core/` (pipeline library), `api/` (Fastify), `ui/` (Astro+React). The LLM reads today's scraped articles and drafts a post (title + 2–8 slides, choosing slide types itself); the user then edits slides in a UI with per-slide AI actions. LLM backend is **Ollama**: local (`http://localhost:11434`) or **Ollama Cloud** (`https://ollama.com`, `Authorization: Bearer <key>`); both speak the same REST API (`/api/generate`, `/api/chat`, `/api/tags`).

Contracts live in `core/src/types.ts` (`SlideBlock`, `PostPayload`, `Article`, `Settings`) — read them first; do not change them. There is existing code in `core/src/compose/` (`ollama.ts`, `prompt.ts`, `parse.ts` + `parse.test.ts`, `index.ts`) from the CLI era — refactor/replace it freely within your dir; keep `parse.ts`'s validation logic and its tests alive (adapt as needed).

## Rules

- Owned paths: `core/src/compose/**`. Touch nothing else (parallel agents elsewhere). No package.json edits — missing dep → append to `plans/swarm/NEEDS.md`.
- Do NOT git commit. No edits to `docs/` or `CLAUDE.md`.
- TypeScript strict, ESM, co-located vitest tests. Mock `fetch` in tests — never call a live LLM from tests.
- No storage/db imports: connection config arrives as a plain argument. No `fs` except where noted for the default prompt.

## Task 1 — Ollama client (`core/src/compose/ollama.ts`)

```ts
interface OllamaConfig { host: string; apiKey?: string; model: string }

class OllamaClient {
  constructor(cfg: OllamaConfig)
  generate(prompt: string, opts?: { json?: boolean; system?: string }): Promise<string>
  listModels(): Promise<string[]>            // GET /api/tags → models[].name
  testConnection(): Promise<{ ok: boolean; error?: string; models?: string[] }>
}
```

- `generate`: POST `{host}/api/generate` with `{model, prompt, system?, stream: false, format: json?'json':undefined}`; add `Authorization: Bearer` when `apiKey` is non-empty. 120s timeout via AbortController. Non-2xx → throw `OllamaError` with status + body snippet.
- `testConnection` never throws — returns the error message instead.

## Task 2 — Compose (`composePost`)

```ts
composePost(articles: Article[], cfg: OllamaConfig, opts: {
  theme: string; date: string; promptOverride?: string;
}): Promise<PostPayload>
```

- System prompt: from `opts.promptOverride` when given, else the exported `DEFAULT_PROMPT` constant. The default prompt must: describe each slide variant and its exact JSON fields, demand 2–8 slides starting with a title slide, demand strict JSON output (no markdown fences), and instruct the model to pick variants that fit the content (lists → body-list, conflicts → body-comparison, strong statements from sources → quotes).
- User prompt: numbered articles (source, title, body trimmed to a sane length).
- Parse + validate the response with the (kept) `parse.ts` logic → `PostPayload` with `theme`/`date` from opts. On parse failure, retry once with the parse error appended to the prompt ("Your previous output was invalid: …"); then throw `ComposeParseError`.

## Task 3 — Caption (`generateCaption`)

`generateCaption(post: PostPayload, cfg: OllamaConfig): Promise<{ caption: string; hashtags: string[] }>` — prompts with the post title + slide texts; asks for strict JSON `{caption, hashtags}`; caption ≤ 2 short paragraphs, 5–10 hashtags without the `#` duplicated weirdly (normalize: strip leading `#`, no spaces, prepend `#` when rendering is the UI's job — store them bare).

## Task 4 — Per-slide AI (`slideAi`)

```ts
type SlideAiAction =
  | { action: 'shorter' } | { action: 'punchier' }
  | { action: 'regenerate'; articles: Article[] }
  | { action: 'remap'; targetVariant: SlideBlock['variant'] }

slideAi(slide: SlideBlock, req: SlideAiAction, cfg: OllamaConfig): Promise<SlideBlock>
```

- `shorter`/`punchier`: rewrite text fields, same variant, same shape.
- `regenerate`: rewrite the slide from the supplied articles, same variant.
- `remap`: convert content to the target variant's shape (e.g. body-text paragraph → 3–5 body-list items). Build the JSON-shape instructions per variant from one shared map (export it: `VARIANT_SHAPES: Record<variant, string>` describing each variant's exact fields — the UI shows it nowhere but tests use it).
- Always validate the returned slide with the single-slide validator from `parse.ts` (export one: `parseSlide(value: unknown): SlideBlock`); one retry on invalid, then throw.

## Task 5 — Module surface

`core/src/compose/index.ts` exports: `OllamaClient`, `OllamaError`, `composePost`, `generateCaption`, `slideAi`, `parseSlide`, `parsePost` (full-payload parser), `DEFAULT_PROMPT`, `ComposeParseError`, types. Ensure `core/src/index.ts` re-exports the compose module (that one export line is the only file outside your dir you may touch).

## Task 6 — Tests (mocked fetch via `vi.stubGlobal`)

- Client: auth header present iff apiKey set; json format flag; non-2xx → OllamaError; listModels parses /api/tags.
- composePost: happy path; retry-on-invalid-then-success; double failure throws ComposeParseError.
- Keep/adapt all existing `parse.test.ts` cases (slide count 2–8 enforced, field checks per variant).
- slideAi remap: returns target-variant shape, validation rejects wrong shape and triggers retry.
- generateCaption: hashtag normalization (`#Foo` → `Foo`).

## Verify

`npx vitest run core/src/compose` green; `tsc --noEmit` in core green.

## Final report

List exports, paste `DEFAULT_PROMPT` in full, and note any deviations from this spec with reasons.
