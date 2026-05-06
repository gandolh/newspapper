# Per-Source maxArticles Design

## Goal

Limit the number of articles scraped per source to a configurable value, defaulting to 10.

## Schema Change

Add `maxArticles: number` to the `Source` interface in `src/storage/sources.ts`.

```ts
export interface Source {
  id: string;
  name: string;
  url: string;
  rss: string | null;
  scraperType: string;
  selectors: Record<string, string>;
  enabled: boolean;
  maxArticles: number;  // new field, default 10
}
```

All existing entries in `data/sources.json` get `"maxArticles": 10` added.

## Scrape Command Changes (`src/commands/scrape.ts`)

### HTTP/Playwright path (line 62)

Replace:
```ts
const limit = options.limit || 10;
```
With:
```ts
const limit = options.limit ?? source.maxArticles ?? 10;
```

### RSS path (after lines 44-46)

After fetching RSS articles, apply the cap before processing:
```ts
articles = (feed.articles || []).slice(0, options.limit ?? source.maxArticles ?? 10);
```

### Precedence

CLI `--limit` > per-source `maxArticles` > hardcoded default (10)

## Files Affected

- `src/storage/sources.ts` — add `maxArticles` to `Source` interface
- `data/sources.json` — add `"maxArticles": 10` to each source
- `src/commands/scrape.ts` — use `source.maxArticles` in both RSS and HTTP/Playwright paths
- `docs/data.md` — document new field
- `docs/commands.md` — note per-source limit behavior
