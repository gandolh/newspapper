# HTTP API

All endpoints are prefixed with `/api/`. The server runs on port 3001 by default.

SSE endpoints stream `event: <type>\ndata: <json>\n\n` frames. Long-running endpoints emit `progress` events during work and end with `done` or `error`.

## Health

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/health` | `{ ok: true }` |
| GET | `/api/models` | `string[]` — model names from Ollama |

## Sources

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/sources` | — | `SourceConfig[]` |
| POST | `/api/sources` | `SourceConfig` | `SourceConfig[]` (full list) |
| PUT | `/api/sources/:id` | `Partial<SourceConfig>` | `SourceConfig[]` |
| DELETE | `/api/sources/:id` | — | `SourceConfig[]` |
| POST | `/api/sources/:id/ping` | — | `{ ok, itemCount?, latencyMs?, error? }` |

## Articles

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/api/articles` | `date=YYYY-MM-DD` (optional) | `Article[]` |
| POST | `/api/articles` | — | `Article` (body: `NewArticle`) |

## Scrape (SSE)

| Method | Path | Body | SSE events |
|--------|------|------|------------|
| POST | `/api/scrape` | `{ maxPerSource?: number }` | `progress: { sourceId, status, count? }` · `done: { articles: Article[] }` · `error: { message }` |

## Posts

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/posts` | — | `PostRow[]` |
| GET | `/api/posts/:id` | — | `PostRow` |
| PUT | `/api/posts/:id` | `{ payload: PostPayload }` | `PostRow` |
| DELETE | `/api/posts/:id` | — | `{ ok: true }` |

## Compose (SSE)

| Method | Path | Body | SSE events |
|--------|------|------|------------|
| POST | `/api/compose` | `{ articleIds: number[], theme?: string }` | `progress: { stage }` · `done: PostRow` · `error: { message }` |

## Caption

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/posts/:id/caption` | — | `PostRow` (with caption + hashtags in payload) |

## Render (SSE)

| Method | Path | Body | SSE events |
|--------|------|------|------------|
| POST | `/api/posts/:id/render` | — | `progress: { done, total }` · `done: { post: PostRow, files: string[] }` · `error: { message }` |

## Export

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/posts/:id/export.zip` | `application/zip` — PNGs + slides.json + caption.txt |

## Slide AI

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/slide-ai` | `{ slide: SlideBlock, action: 'shorter'\|'punchier'\|'regenerate'\|'remap', targetVariant?: string, articleIds?: number[] }` | `{ slide: SlideBlock }` |

## Preview

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/preview` | `{ doc: TemplateDoc, data: Record<string,unknown>, theme: string, index: number, total: number }` | `text/html` — complete HTML document |

## Templates

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/templates` | query `theme=` | `TemplateDoc[]` |
| GET | `/api/templates/:theme/:id` | — | `TemplateDoc` |
| POST | `/api/templates` | `TemplateDoc` | `TemplateDoc` (201) or 409 if exists |
| PUT | `/api/templates/:theme/:id` | `TemplateDoc` | `TemplateDoc` |
| DELETE | `/api/templates/:theme/:id` | — | `{ ok: true }` |
| GET | `/api/themes` | — | `Array<{ name, tokens }>` |

## Settings

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/settings` | — | `Settings` (API key masked as `"***"` if set) |
| PUT | `/api/settings` | `Partial<Settings>` | `Settings` |
| POST | `/api/settings/test` | — | `{ ok, error?, models? }` — tests Ollama connectivity |

## Prompt

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/prompt` | — | `{ text: string }` |
| PUT | `/api/prompt` | `{ text: string }` | `{ text: string }` |
| POST | `/api/prompt/reset` | — | `{ text: string }` (restored to default) |
| POST | `/api/prompt/test` | `{ text: string, articleIds: number[] }` | SSE: `progress: {stage}` · `done: PostRow` · `error: {message}` |

## Static assets (not API routes)

| Path | Serves |
|------|--------|
| `/assets/fonts/<name>.ttf` | Inter font files |
| `/output/<dir>/<n>.png` | Rendered slide PNGs |
| `/` (all non-API paths) | `ui/dist/` (production mode only) |
