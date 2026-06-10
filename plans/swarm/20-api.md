# Wave 2 — Fastify API: wire every core service into HTTP routes

## Project context

Newspapper turns daily RSS news into an Instagram-style slide post (1080×1080 PNGs), rebuilt as a local web app: npm workspaces monorepo — `core/` (pipeline library, FINISHED in wave 1), `api/` (you), `ui/` (Astro+React; calls you via dev proxy, relative `/api/*`). Single local user, no auth.

Core (import from `@newspapper/core`) already provides — read `core/src/index.ts` and the module index files to confirm exact signatures before wiring:
- **templates**: `renderTemplate(doc, data, theme, {index,total,fontBaseUrl})` → self-contained HTML; registry `listTemplates/loadTemplate/saveTemplate/deleteTemplate`; `validateTemplateDoc`; themes `loadTheme/listThemes`.
- **render**: `renderSlides(html[], {date, slidesJson, caption?, onProgress})` → `{dir, files}`; `zipRun(dir)` → Buffer; `htmlToPng`; `closeBrowser`.
- **compose**: `OllamaClient(cfg)` (`generate/listModels/testConnection`), `composePost(articles, cfg, {theme,date,promptOverride?})`, `generateCaption(post,cfg)`, `slideAi(slide, action, cfg)`, `DEFAULT_PROMPT`, `parsePost`, `parseSlide`.
- **storage**: posts repo (`createDraft/getPost/listPosts/updatePostPayload/markRendered/deletePost`), articles (`articlesForDate/addManualArticle/getArticlesByIds`), `getSettings/saveSettings`, sources CRUD + `pingSource`, `getPrompt/savePrompt/resetPrompt`.
- **scrape**: `scrape(sources, {date, maxPerSource, onProgress})`.

Wave 0 left `api/src/server.ts` (health route, CORS, @fastify/static serving `assets/fonts` at `/assets/fonts/` and `output/` at `/output/`).

## Rules

- Owned paths: `api/src/**`. The only outside edit allowed: nothing. Missing dep → `plans/swarm/NEEDS.md`.
- Do NOT git commit. No edits to `docs/`, `CLAUDE.md`, or anything in `core/` or `ui/` — if a core signature doesn't match what you need, adapt in the API layer; if truly broken, document in NEEDS.md.
- TypeScript strict, ESM. One `FastifyPluginAsync` per file under `api/src/routes/`, registered in `server.ts`. Error handler: thrown errors → `{error: message}` with proper status (400 validation / 404 not found / 502 for Ollama upstream failures).

## Conventions

- Ollama config per request: `const s = getSettings(); const cfg = {host: s.ollamaHost, apiKey: s.ollamaApiKey, model: s.ollamaModel}`.
- **SSE helper** (`api/src/lib/sse.ts`): for long operations. Set headers `content-type: text/event-stream`, `cache-control: no-cache`, write frames `event: <name>\ndata: <json>\n\n` to `reply.raw`. Events: repeated `progress`, terminal `done` (payload = result) or `error` (`{message}`), then end. These are POST endpoints — the UI reads the stream with fetch, not EventSource.
- Today's date: `new Date().toISOString().slice(0,10)` server-side.

## Routes

### Scrape & articles (`routes/scrape.ts`, `routes/articles.ts`)
- `POST /api/scrape` (SSE) — runs `scrape(listSources(), {date: today, onProgress})`, progress events forwarded; `done` → `{articles, errors}`.
- `GET /api/articles?date=YYYY-MM-DD` (default today) → `Article[]`.
- `POST /api/articles` `{title, body, url?, sourceName?}` → created Article. 400 if title/body missing.

### Compose & posts (`routes/posts.ts`)
- `POST /api/compose` (SSE) `{articleIds: number[], theme?}` — loads articles by id (400 if empty), emits `progress` `{stage:'prompting'}`, calls `composePost` with `promptOverride: getPrompt(DEFAULT_PROMPT)` and theme defaulting to settings.defaultTheme, saves via `createDraft`, `done` → full `PostRow`.
- `GET /api/posts` → `PostRow[]`; `GET /api/posts/:id` → `PostRow` (404).
- `PUT /api/posts/:id` `{payload: PostPayload}` — validate with `parsePost`-equivalent (slides 2–8) before saving; → updated `PostRow`.
- `DELETE /api/posts/:id` — delete row; if it had `outputDir`, `fs.rm` it (guard: only delete paths inside the repo's `output/`); → `{ok:true}`.
- `POST /api/posts/:id/caption` — `generateCaption`, merge into payload, save, → updated `PostRow`.

### Render & export (`routes/render.ts`)
- `POST /api/posts/:id/render` (SSE) — load post + theme + templates; for each slide i: `loadTemplate(theme, slide.variant)` then `renderTemplate(doc, slide, themeObj, {index: i+1, total, fontBaseUrl: `http://localhost:${PORT}/assets/fonts`})`; `renderSlides(htmlList, {date: post.date, slidesJson: payload, caption: formatCaption(payload)})` forwarding progress (`{done,total}`); `markRendered`; `done` → `{post, files: ['/output/<dirname>/1.png', …]}` (URL paths the UI can `<img>` directly). `formatCaption` = caption + blank line + hashtags as `#tag` space-joined; only when caption exists.
- `GET /api/posts/:id/export.zip` — 404 unless rendered; `zipRun(outputDir)`, reply with `content-type: application/zip`, `content-disposition: attachment; filename="newspapper-<date>.zip"`.

### Preview (`routes/preview.ts`)
- `POST /api/preview` `{templateId?, doc?, data, theme?, index?, total?}` — doc = inline TemplateDoc (builder live-preview) or load by templateId; render with `data` (fall back to the doc's `sample` when data empty); reply `content-type: text/html`. This endpoint is hit by sandboxed iframes on every editor keystroke (debounced client-side) — keep it fast, no DB writes.

### Templates (`routes/templates.ts`)
- `GET /api/templates?theme=` → `TemplateDoc[]`; `GET /api/templates/:theme/:id` → doc (404).
- `PUT /api/templates/:theme/:id` (validate + save), `POST /api/templates` (create — 409 if id exists), `DELETE /api/templates/:theme/:id`.
- `GET /api/themes` → `[{name, tokens: Theme}]` for every theme from `listThemes()`.

### Slide AI (`routes/slide-ai.ts`)
- `POST /api/slide-ai` `{slide: SlideBlock, action: 'shorter'|'punchier'|'regenerate'|'remap', targetVariant?, articleIds?}` — map to core `slideAi` (load articles for regenerate); → `{slide}`. 400 on bad action/missing targetVariant.

### Sources, settings, prompt (`routes/sources.ts`, `routes/settings.ts`, `routes/prompt.ts`)
- `GET /api/sources`; `POST /api/sources` (400 on missing id/name/rss, 409 on dup id); `PUT /api/sources/:id`; `DELETE /api/sources/:id`; `POST /api/sources/:id/ping` → ping result.
- `GET /api/settings` → Settings **with `ollamaApiKey` masked** (`'***'` when set, `''` when not); `PUT /api/settings` (patch; ignore `ollamaApiKey: '***'` sentinel so the mask never overwrites the real key); `POST /api/settings/test` → `testConnection()` result; `GET /api/models` → `listModels()` (502 with message on failure).
- `GET /api/prompt` → `{prompt, isDefault}`; `PUT /api/prompt` `{prompt}`; `POST /api/prompt/reset`; `POST /api/prompt/test` `{articleIds?}` — compose against today's (or given) articles WITHOUT saving a post; → `PostPayload` draft.

### Production static
When `ui/dist/` exists, serve it at `/` (fallback to `index.html` for non-API GETs). Dev mode: Astro proxies instead — both must coexist.

## Tests (`api/src/**/*.test.ts`, vitest + `fastify.inject`)

Use injectable temp paths/DB where core allows; stub `OllamaClient`-bound fetch with `vi.stubGlobal`. Cover: health; articles GET/POST validation; posts PUT validation (1 slide → 400); settings mask + sentinel; templates 404/409; preview returns html containing sample text (this exercises real wave-1 template code — a true integration point); export.zip 404-when-draft. SSE routes: at minimum unit-test the sse helper's frame format.

## Verify

`npx vitest run api` green; `tsc --noEmit` green in api; boot the server and `curl` health, `GET /api/templates?theme=warm-industrial` (expect 9), and `POST /api/preview` for one template.

## Final report

Route table (method, path, body, response), which routes you actually exercised via curl, any core mismatches you had to adapt around.
