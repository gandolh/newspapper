# Modules

All modules are in `@newspapper/core` (`core/src/`). Exported from `core/src/index.ts` (main entry) or `core/src/templates/index.ts` (browser-safe subpath).

## Scrape

```ts
// core/src/scrape/index.ts
export async function scrape(sources: SourceConfig[], opts: ScrapeOptions): Promise<ScrapeResult>
export async function pingSource(source: SourceConfig): Promise<PingResult>
```

`scrape()` fetches each enabled source, trims to `maxPerSource` items for today's date, fetches article bodies, and upserts into SQLite.

```ts
export async function fetchFeed(url: string): Promise<RssItem[]>   // scrape/rss.ts
export async function fetchBody(url: string, opts?): Promise<string>  // scrape/body.ts
export function stripHtml(html: string): string
```

## Compose

```ts
// core/src/compose/compose-post.ts
export async function composePost(articles: Article[], cfg: OllamaConfig, opts: ComposePostOptions): Promise<PostPayload>
```

Sends articles to Ollama, parses JSON response, retries once on parse failure.

```ts
// core/src/compose/caption.ts
export async function generateCaption(payload: PostPayload, cfg: OllamaConfig): Promise<CaptionResult>
```

```ts
// core/src/compose/slide-ai.ts
export async function slideAi(slide: SlideBlock, req: SlideAiAction, cfg: OllamaConfig): Promise<SlideBlock>
```

`SlideAiAction` union: `{action:'shorter'}`, `{action:'punchier'}`, `{action:'regenerate', articles}`, `{action:'remap', targetVariant}`.

`remap` enforces `result.variant === targetVariant`; retries once on mismatch, then throws.

```ts
// core/src/compose/ollama.ts
export class OllamaClient {
  async generate(prompt: string, opts?: {json?:boolean; system?:string}): Promise<string>
  async listModels(): Promise<string[]>
  async testConnection(): Promise<{ok:boolean; error?:string; models?:string[]}>
}
export class OllamaError extends Error { status: number; body: string }
```

```ts
// core/src/compose/parse.ts
export function parsePost(raw: string, date: string, theme: string): PostPayload
export function parseSlide(value: unknown): SlideBlock
export class ComposeParseError extends Error { raw: string }
```

```ts
// core/src/compose/prompt.ts
export const DEFAULT_PROMPT: string
export const VARIANT_SHAPES: Record<string, string>
export function buildUserPrompt(articles: Article[]): string
```

## Render

```ts
// core/src/render/index.ts
export async function renderSlides(
  htmlList: string[],
  opts: { date: string; slidesJson: unknown; caption?: string; onProgress?: (done, total) => void }
): Promise<{ dir: string; files: string[] }>

export async function zipRun(outputDir: string): Promise<Uint8Array>
```

`renderSlides` launches a Playwright Chromium browser, screenshots each HTML string at 1080×1080, writes PNGs + `slides.json` + optional `caption.txt`.

```ts
// core/src/templates/interpreter.ts (also re-exported from @newspapper/core/templates)
export function renderTemplate(doc: TemplateDoc, data: Record<string,unknown>, theme: Theme, opts: RenderTemplateOptions): string
export function resolveStyle(style: TStyle, theme: Theme): Record<string, string>
export function validateTemplateDoc(doc: unknown): TemplateDoc
export function validateSlideData(doc: TemplateDoc, data: unknown): void
```

```ts
// core/src/templates/registry.ts
export function listTemplates(theme: string): TemplateDoc[]
export function loadTemplate(theme: string, id: string): TemplateDoc
export function saveTemplate(doc: TemplateDoc): void
export function deleteTemplate(theme: string, id: string): void
export function templatesForFamily(theme: string, family: TemplateDoc['family']): TemplateDoc[]
```

## Storage

```ts
// core/src/storage/db.ts
export function getDb(dbPath?: string): DB
export function migrate(db: DB): void
```

```ts
// core/src/storage/articles.ts
export function upsertArticles(db: DB, rows: NewArticle[]): number
export function articlesForDate(db: DB, date: string): Article[]
export function getArticlesByIds(db: DB, ids: number[]): Article[]
```

```ts
// core/src/storage/posts.ts
export function createDraft(db: DB, payload: PostPayload): PostRow
export function getPost(db: DB, id: number): PostRow | null
export function listPosts(db: DB): PostRow[]
export function updatePostPayload(db: DB, id: number, payload: PostPayload): PostRow
export function markRendered(db: DB, id: number, outputDir: string): PostRow
export function deletePost(db: DB, id: number): PostRow | null
```

```ts
// core/src/storage/settings.ts
export function getSettings(dbPath?: string): Settings
export function saveSettings(patch: Partial<Settings>, dbPath?: string): void
```

```ts
// core/src/storage/sources.ts
export function listSources(filePath?: string): SourceConfig[]
export function addSource(src: SourceConfig, filePath?: string): SourceConfig[]
export function updateSource(id, patch, filePath?): SourceConfig[]
export function removeSource(id, filePath?): SourceConfig[]
```

```ts
// core/src/storage/prompt.ts
export function getPrompt(defaultText: string, filePath?: string): string
export function savePrompt(text: string, filePath?: string): void
export function resetPrompt(defaultText: string, filePath?: string): void
```

## Themes

```ts
// core/src/themes/index.ts
export function loadTheme(name: string): Theme
export function listThemes(): string[]
```

Theme JSON files live at `assets/design-systems/<name>.json`.

## Util

```ts
// core/src/util/config.ts
export function loadConfig(): Config   // reads .env, applies defaults
```

```ts
// core/src/util/logger.ts
export const log = { info, warn, error }
```

```ts
// core/src/util/paths.ts
export function nextOutputDir(outputRoot: string, date: string): { dir: string; runNumber: number }
export function todayLocal(): string
export function ensureDir(path: string): void
export function ensureParent(path: string): void
```
