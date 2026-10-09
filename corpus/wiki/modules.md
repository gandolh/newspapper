---
summary: The public API of @newspapper/core — what the wizard, render, templates, posts storage, themes, util and uploads modules export and from which entry point. Scrape, the Reader and the storage for sources, articles and feed items are in modules-reader.md.
updated: 2026-10-09
---

# Modules

All modules are in `@newspapper/core` (`core/src/`). Exported from `core/src/index.ts` (main entry) or `core/src/templates/index.ts` (browser-safe subpath).

## Scrape, the Reader, and the reading side's storage

`scrape/`, `reader/`, `util/concurrency.ts` and the `storage/` modules for
sources, saved articles and feed items: [modules-reader.md](./modules-reader.md).

## Wizard

`core/src/wizard/**`, on the **`@newspapper/core/wizard`** subpath (one of four:
`.`, `./templates`, `./publish`, `./wizard`). The module surface — parse,
format, lint, compile — is documented with the language it serves, in
[markup.md](./markup.md#module-surface).

## Render

```ts
// core/src/render/index.ts
export async function renderSlides(
  htmlList: string[],
  opts: {
    date: string;
    slidesJson: unknown;
    caption?: string;
    outputRoot?: string;
    quality?: number;
    onProgress?: (done, total) => void;
    db?: DB; // required in practice for slides with images: see below
  }
): Promise<{ dir: string; files: string[] }>

export async function zipRun(outputDir: string): Promise<Uint8Array>
```

`renderSlides` launches a Playwright Chromium browser, screenshots each HTML string at 1080×1080, writes JPEGs + `slides.json` + optional `caption.txt`. **Pass `db`** for any run with `<Image>`s: `/uploads/*` is guarded and the render browser has no session, so the images are served from disk through `render/uploads-route.ts`, which resolves refs through the DB. Without it they come out blank.

```ts
// core/src/render/fonts.ts — brief 66
export function installFontRoute(ctx: BrowserContext): Promise<void>
```

Serves the render page's `**/assets/fonts/*` from disk, not over HTTP:
`setContent` leaves the page on an **opaque origin**, so the font fetch carries
`Origin: null`, the API's UI-only CORS allowlist drops it, and Chromium discards
bytes that arrived fine. [Why](./decisions-engineering.md#the-renderer-serves-its-own-fonts-from-disk-not-over-http).

```ts
// core/src/templates/interpreter.ts (also on @newspapper/core/templates)
// The compile target for `.wzd`, not an authoring surface: `TemplateDoc`, the
// template JSON, the registry and `/builder` went in brief 58 — decisions.md
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

`sources.ts`, `articles.ts` and `feed-items.ts`: [modules-reader.md](./modules-reader.md#storage).

## Themes

```ts
// core/src/themes/index.ts
export function loadTheme(name: string): Theme
export function listThemes(): string[]
```

Theme JSON files live at `assets/design-systems/<name>.json`.

## Util

```ts
// core/src/util/config.ts — no exports. Side effect only: `import 'dotenv/config'`.
```

The repo's **only** `dotenv` call site, imported first by `core/src/index.ts`.
`api` gets `.env` purely by importing that barrel. It exports nothing, so it
reads as dead and is not — remove either half and `SESSION_SECRET`, `PORT`,
`NEWSPAPPER_DB_PATH`, `UPLOADS_DIR`, `THEME` and friends silently fall back to
defaults with no error. `config.test.ts` guards both halves.

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
