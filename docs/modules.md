# Modules

Module-by-module API reference. All paths under `src/`.

## `cli.ts`

Entry point. Parses argv (using a small library like `cac` or hand-rolled), dispatches to `run`, `sources`, `list`, or `clean`. Loads config from `.env` once and passes it down.

## `run.ts`

```ts
export async function run(opts: RunOptions): Promise<void>
```

Orchestrates the pipeline:

1. `scrape(config, opts)` → returns count of new articles
2. `compose(config, opts)` → returns the post payload
3. `render(post, config, opts)` → writes PNGs and `slides.json` to disk

Each step logs its progress. Failures abort the run; no partial recovery.

## `scrape/`

```ts
// scrape/index.ts
export async function scrape(config: Config, opts: ScrapeOptions): Promise<{ inserted: number }>
```

For each enabled source: fetch the feed via `scrape/rss.ts`, keep items with `pubDate` on today's local date, cap at `maxPerSource`. For each new item, fetch the article URL and reduce the response to plain text with `scrape/body.ts`. Insert into `articles` (skip on URL collision).

```ts
// scrape/rss.ts
export async function fetchFeed(url: string): Promise<RssItem[]>
```

Thin wrapper around `rss-parser`. Returns a normalized shape; no parsing logic lives elsewhere.

```ts
// scrape/body.ts
export async function fetchBody(url: string, timeoutMs: number): Promise<string>
```

Fetches the article URL with native `fetch`, runs a regex pass to strip `<script>`/`<style>` blocks and all remaining tags, collapses whitespace, and returns plain text. Returns an empty string on network failure or non-2xx; the article is still inserted so we know we've seen the URL.

## `compose/`

```ts
// compose/index.ts
export async function compose(config: Config): Promise<Post>
```

1. Reads today's articles from the DB.
2. Builds the prompt (a single string template, embedded in code — no Handlebars).
3. Calls `ollama.generate(prompt)`.
4. Parses the model's JSON output; validates against the slide-type schema in [data.md](data.md).
5. Inserts a row into `posts` (with the next `run_number` for today) and returns the post.

If parsing fails, the run aborts with the raw model output dumped to stderr. No auto-retry — a failed parse usually means the model needs a different prompt or a bigger model.

```ts
// compose/ollama.ts
export async function generate(host: string, model: string, prompt: string): Promise<string>
```

POSTs to `${host}/api/generate` with `stream: false`. Returns the `response` field.

## `render/`

```ts
// render/index.ts
export async function render(post: Post, config: Config): Promise<{ outputDir: string }>
```

For each slide in `post.slides`: pick the JSX component by `variant`, call Satori to produce SVG, call resvg to produce PNG, write `output/<date>-<n>/<i>.png`. Also writes `slides.json`.

```ts
// render/satori.ts
export async function toSvg(node: ReactNode, theme: Theme): Promise<string>
```

Configures Satori with the warm-industrial theme tokens and fonts from `fonts/`. The output is a 1080×1080 SVG string.

```ts
// render/resvg.ts
export function toPng(svg: string): Buffer
```

Synchronous SVG → PNG via `@resvg/resvg-js`.

```ts
// render/slides/*.tsx
export function TitleMain(props: TitleMainProps): JSX.Element
export function BodyText(props: BodyTextProps): JSX.Element
// … one per variant listed in data.md
```

Each component reads its layout from the theme tokens. They use **only flexbox** — Satori does not support CSS Grid or absolute positioning beyond what flex provides.

## `storage/`

```ts
// storage/db.ts
export function open(path: string): Database
export function migrate(db: Database): void   // idempotent, runs on every open
```

```ts
// storage/articles.ts
export function insertMany(db: Database, rows: NewArticle[]): number   // returns insert count
export function todays(db: Database, date: string): Article[]
```

```ts
// storage/posts.ts
export function nextRunNumber(db: Database, date: string): number
export function insert(db: Database, row: NewPost): Post
export function recent(db: Database, limit: number): Post[]
```

## `util/`

```ts
// util/config.ts
export function loadConfig(): Config
```

Reads `.env`, applies defaults, returns a frozen object. See [configuration.md](configuration.md) for the field list.

```ts
// util/logger.ts
export const log = { info, warn, error }
```

Plain `console.*` wrapper with timestamps. No spinners, no levels beyond those three.

```ts
// util/paths.ts
export function outputDirFor(date: string, runNumber: number): string
```

Resolves `output/YYYY-MM-DD-N/`, ensures the parent exists.
