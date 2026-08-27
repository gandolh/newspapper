# Wave 1D — Storage (SQLite + sources + settings + prompt file) and scrape service

## Project context

Newspapper turns daily RSS news into an Instagram-style slide post (1080×1080 PNGs), rebuilt as a local web app: npm workspaces monorepo — `core/` (pipeline library), `api/` (Fastify), `ui/` (Astro+React). Pipeline: scrape RSS → user curates articles → LLM composes a post → user edits slides → render PNGs → download ZIP. You own persistence and scraping.

Contracts live in `core/src/types.ts` (`Article`, `PostRow`, `PostPayload`, `SourceConfig`, `Settings`) — read them first; do not change them. Existing CLI-era code in `core/src/storage/` (`db.ts`, `articles.ts`, `posts.ts`) and `core/src/scrape/` (`index.ts`, `rss.ts`, `body.ts` + `body.test.ts`) is yours to refactor; keep the date-filtering and body-extraction logic and tests alive.

## Rules

- Owned paths: `core/src/storage/**`, `core/src/scrape/**`, `core/src/util/**`. Touch nothing else (parallel agents elsewhere). No package.json edits — missing dep → `plans/swarm/NEEDS.md`.
- Do NOT git commit. No edits to `docs/` or `CLAUDE.md`.
- TypeScript strict, ESM, co-located vitest tests. Tests must use temp paths (`fs.mkdtemp`) — never the real `data/`.

## Task 1 — DB (`core/src/storage/db.ts`)

better-sqlite3, WAL mode, auto-create at `data/newspapper.db`; `getDb(dbPath?: string)` injectable for tests. Idempotent migration on open (versioned `PRAGMA user_version`):

```sql
articles(id INTEGER PK, source_id TEXT, source_name TEXT, title TEXT,
         url TEXT UNIQUE, published_at TEXT, body TEXT, created_at TEXT)
posts(id INTEGER PK, date TEXT, title TEXT, theme TEXT,
      payload TEXT NOT NULL,                 -- JSON PostPayload
      status TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'rendered'
      output_dir TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL)
settings(key TEXT PRIMARY KEY, value TEXT NOT NULL)
```

Migrate from the v2 schema if present (old `posts` lacked status/output_dir/updated_at — `ALTER TABLE ADD COLUMN` guarded by user_version; existing rows get `status='rendered'`).

## Task 2 — Repositories

`articles.ts` (keep + extend): `upsertArticles` (dedupe by url), `articlesForDate(date)`, `addManualArticle({title, url?, sourceName?, body})` (source_id `manual`, published_at = now), `getArticlesByIds(ids: number[])`.

`posts.ts` (rewrite): `createDraft(payload) → PostRow`, `getPost(id)`, `listPosts({limit?}) → PostRow[]` newest first, `updatePostPayload(id, payload)` (bumps updated_at, resets status to 'draft'), `markRendered(id, outputDir)`, `deletePost(id) → PostRow | undefined` (returns the deleted row so the API can also remove its output dir). Map snake_case columns → the camelCase `PostRow`.

`settings.ts` (new): `getSettings(dbPath?): Settings` — read KV rows, fall back per-key to env (`OLLAMA_HOST`, `OLLAMA_API_KEY`, `OLLAMA_MODEL`) then defaults (`http://localhost:11434`, `''`, `llama3.2:1b`, theme `warm-industrial`); `saveSettings(patch: Partial<Settings>)`. Never log the API key.

`sources.ts` (new, file-backed): CRUD over `data/sources.json` (shape: `SourceConfig[]`; file may not exist → empty list; injectable path): `listSources`, `saveSources(all)`, `addSource`, `updateSource(id, patch)`, `removeSource(id)`.

`prompt.ts` (new, file-backed): `getPrompt(defaultText: string): string` — returns `data/prompt.md` contents, seeding the file with `defaultText` on first read; `savePrompt(text)`; `resetPrompt(defaultText)`. Injectable path.

## Task 3 — Scrape (`core/src/scrape/`)

Refactor the CLI-era scraper into:

```ts
scrape(sources: SourceConfig[], opts: {
  date: string;                 // keep only items published this day
  maxPerSource?: number;        // default 10
  dbPath?: string;
  onProgress?: (e: { sourceId: string; status: 'fetching' | 'done' | 'error';
                     count?: number; error?: string }) => void;
}): Promise<{ articles: Article[]; errors: { sourceId: string; error: string }[] }>
```

- Only `enabled` sources. Per-source failures don't abort the run — collect into `errors` + emit progress events.
- Keep rss-parser fetching, today-filtering, body extraction (`body.ts`), upsert-dedupe by URL via `articles.ts`. Returns all of today's articles from the DB after upserting (so re-scrapes accumulate).
- `pingSource(src: SourceConfig): Promise<{ ok: boolean; itemCount?: number; error?: string; latencyMs: number }>` — fetch + parse the feed, never throws.

## Task 4 — Module surface

Export everything via `core/src/storage/index.ts` and `core/src/scrape/index.ts`; ensure `core/src/index.ts` re-exports both (those export lines are the only outside-dir edits allowed).

## Task 5 — Tests

- Migration: open a fresh temp DB → user_version correct, all tables exist; open a hand-built v2-schema DB → columns added, old rows `status='rendered'`.
- posts: create→update→markRendered→delete round-trip; updatedAt changes; payload JSON round-trips.
- settings: env fallback, DB value wins over env, patch merge.
- sources/prompt: missing-file behavior, CRUD round-trips (temp paths).
- scrape: keep existing date-filter and body tests; new test with a mocked rss-parser for per-source error isolation + progress events.

## Verify

`npx vitest run core/src/storage core/src/scrape` green; `tsc --noEmit` in core green.

## Final report

List exports per module, schema DDL as created, and any deviations with reasons.
