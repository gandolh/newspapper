---
summary: The public API of @newspapper/core — what each module actually exports and from which entry point.
updated: 2026-08-31
---

# Modules

All modules are in `@newspapper/core` (`core/src/`). Exported from `core/src/index.ts` (main entry) or `core/src/templates/index.ts` (browser-safe subpath).

## Scrape

```ts
// core/src/scrape/index.ts
export async function searchArticles(sources: SourceConfig[], opts: SearchOptions): Promise<SearchResult>
export async function pingSource(source: SourceConfig): Promise<PingResult>
```

`searchArticles()` fetches each enabled source (trimmed to `maxPerSource` feed
items), fetches bodies, and keeps items matching any of `opts.keywords`
(case-insensitive substring, title + body), ranked by total match count. It
**persists nothing** — `SearchResult.articles` are `ScrapedArticle[]`, not DB
rows; saving one is a separate call to `saveArticle`/`saveArticles`.

```ts
export async function fetchFeed(url: string): Promise<RssItem[]>   // scrape/rss.ts
export async function fetchBody(url: string, opts?): Promise<string>  // scrape/body.ts
export function stripHtml(html: string): string
```

## Wizard

`core/src/wizard/**`, exported from the **`@newspapper/core/wizard`** subpath
(one of four: `.`, `./templates`, `./publish`, `./wizard`). The language itself
is documented in [markup.md](./markup.md) — this is the module surface.

```ts
// parse / format / lint — text <-> WzdDocument, with diagnostics over the tree
export function parse(src: string): WzdParseResult      // forgiving; collects errors
export function parseOrThrow(src: string): WzdDocument  // strict; throws WzdSyntaxError
export function format(src: string, opts?: WzdFormatOptions): string
export function lint(doc: WzdDocument, opts?: WzdLintOptions): WzdDiagnostic[]

// compile — WzdDocument -> TNode trees the template interpreter renders
export function compileDocument(doc: WzdDocument, theme: Theme): TNode[]  // strict
export function compile(src: string, theme: Theme): WzdCompileResult      // forgiving
```

Two compile paths on purpose: `compileDocument` is strict and feeds the render
pipeline; `compile`/`compileSource` are forgiving and feed the live preview,
because a document is broken most of the time while it is being typed. The
compile is **browser-safe** — no Node APIs — which is why the editor previews
off the same code the renderer uses instead of a second copy of style
resolution, and why `api/src/routes/preview.ts` was deleted rather than rebuilt.

`WZD_COMPONENTS` is the catalogue, and it is data: the compiler, the linter and
the editor's completions all read it rather than restating it.

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
// The compile target for `.wzd` documents (core/src/wizard/compile.ts), not
// an authoring surface. `TemplateDoc`, the JSON template files, the registry
// below, and `/builder` were all removed in brief 58 — see decisions.md
// "The template system is removed".
export function renderTemplate(root: TNode, data: Record<string,unknown>, theme: Theme, opts: RenderTemplateOptions): string
export function resolveStyle(style: TStyle, theme: Theme): Record<string, string>
export function validateSlideData(data: unknown): void
```

## Storage

```ts
// core/src/storage/db.ts
export function getDb(dbPath?: string): DB
export function migrate(db: DB): void
```

```ts
// core/src/storage/articles.ts — the saved library; a search's results are not rows until saved
export function saveArticle(db: DB, input: NewArticle): Article        // idempotent on (source_id, guid)
export function saveArticles(db: DB, rows: NewArticle[]): number       // returns newly inserted count
export function listArticles(db: DB, filter?: ArticleFilter): Article[]  // { search?; sourceId?; limit?; offset? }
export function findArticle(db: DB, id: number): Article | undefined
export function getArticlesByIds(db: DB, ids: number[]): Article[]
export function removeArticle(db: DB, id: number): Article | undefined
export function countArticles(db: DB): number
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
// core/src/storage/sources.ts — DB-backed as of schema v3 (was data/sources.json)
export function listSources(db?: DB): SourceConfig[]
export function getSource(id: string, db?: DB): SourceConfig | undefined
export function addSource(src: SourceConfig, db?: DB): SourceConfig[]
export function updateSource(id: string, patch: Partial<Omit<SourceConfig, 'id'>>, db?: DB): SourceConfig[]
export function removeSource(id: string, db?: DB): SourceConfig[]
export function saveSources(all: SourceConfig[], db?: DB): void
```

`db` is trailing and optional everywhere — a caller with no open handle gets one
opened and closed for the call, the same pattern as `getSettings`.

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

## Uploads

```ts
// core/src/uploads/index.ts — Node-only, re-exported from the core barrel
export async function saveUpload(db: DB, input: { filename: string; data: Buffer }): Promise<StoredUpload>
export function deleteUpload(db: DB, id: number): Upload | undefined
export function removeUploadFiles(upload: Upload, root?: string): void
export function uploadRef(upload: Upload): string
export function uploadFiles(upload: Upload, root?: string): { original; normalized; served }
export function findUploadByRef(db: DB, ref: unknown): Upload | undefined
export function parseUploadRef(src: unknown): string | null
export function resolveUploadSrc(src: unknown, baseUrl?: string): string | null
export function uploadPublicPath(ref: string): string       // '/uploads/<ref>'
export function uploadOriginalPath(ref: string): string     // '/uploads/<ref>/original'
export function uploadsBaseUrl(): string
```

```ts
// core/src/uploads/store.ts — paths, refs, containment
export function uploadsRoot(): string          // UPLOADS_DIR, else <repo>/uploads
export function resolveInStore(relativePath: string, root?: string): string
export function isValidRef(ref: unknown): ref is string
export function sanitizeDisplayName(filename: unknown): string
export function slugifyFilename(filename: unknown): string
export function makeRef(filename: unknown): string
```

```ts
// core/src/uploads/image.ts — Sharp
export async function probeImage(data: Buffer): Promise<ProbedImage>
export async function normalizeImage(data: Buffer, format: UploadFormat): Promise<NormalizedImage>
export const MAX_UPLOAD_BYTES, MAX_SOURCE_PIXELS, MAX_SOURCE_DIMENSION, MAX_NORMALIZED_DIMENSION
```

A **ref** is the upload's stable name — a slug of the original filename plus 8
hex characters, e.g. `harbour-at-dawn-9f3a1c2b`. It is what `<Image src="…">`
carries and what `/uploads/<ref>` serves. Stored paths are **relative to the
store root** (`originals/<ref>.<ext>`, `normalized/<ref>.<ext>`), so the store
can be relocated by moving the directory and changing `UPLOADS_DIR`; `uploadRef`
derives the ref back out of `storedPath`.
