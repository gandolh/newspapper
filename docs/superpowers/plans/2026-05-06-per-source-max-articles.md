# Per-Source maxArticles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `maxArticles` field to each source in `sources.json` that limits how many articles are scraped per source, defaulting to 10.

**Architecture:** Add `maxArticles: number` to the `Source` interface, migrate existing sources to include the field, then apply the cap in both the RSS and HTTP/Playwright paths of the scrape command. CLI `--limit` remains an override over `source.maxArticles`.

**Tech Stack:** TypeScript, vitest, Node.js

---

### Task 1: Add `maxArticles` to `Source` interface and `add()` method

**Files:**
- Modify: `src/storage/sources.ts`

- [ ] **Step 1: Add the field to the interface**

In `src/storage/sources.ts`, update the `Source` interface:

```ts
export interface Source {
  id: string;
  name: string;
  url: string;
  rss: string | null;
  scraperType: string;
  selectors: Record<string, string>;
  enabled: boolean;
  maxArticles: number;
}
```

- [ ] **Step 2: Default `maxArticles` in the `add()` method**

Update the `add()` method body so new sources default to 10:

```ts
const source: Source = {
  id: sourceData.id || sourceData.name.toLowerCase().replace(/\s+/g, '-'),
  name: sourceData.name,
  url: sourceData.url,
  rss: sourceData.rss || null,
  scraperType: sourceData.scraperType || 'http',
  selectors: sourceData.selectors || {},
  enabled: sourceData.enabled !== false,
  maxArticles: sourceData.maxArticles ?? 10,
};
```

- [ ] **Step 3: Build to verify no TypeScript errors**

```bash
npm run build
```
Expected: exits 0 with no errors.

---

### Task 2: Migrate `data/sources.json`

**Files:**
- Modify: `data/sources.json`

- [ ] **Step 1: Add `"maxArticles": 10` to every source entry**

Open `data/sources.json` and add `"maxArticles": 10` to each object. Example resulting entry:

```json
{
  "id": "hotnews-ro",
  "name": "HotNews.ro",
  "url": "https://hotnews.ro/",
  "rss": "https://hotnews.ro/feed",
  "scraperType": "rss",
  "selectors": {
    "title": "h1.entry-title",
    "author": ".author",
    "date": "time[datetime]",
    "body": ".entry-content",
    "image": "meta[property='og:image']"
  },
  "enabled": true,
  "maxArticles": 10
}
```

Apply the same to every source in the file.

---

### Task 3: Apply `maxArticles` in scrape command

**Files:**
- Modify: `src/commands/scrape.ts`

- [ ] **Step 1: Write a failing test**

Create `src/commands/scrape.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveArticleLimit } from './scrape.js';

describe('resolveArticleLimit', () => {
  it('uses CLI limit when provided', () => {
    expect(resolveArticleLimit(5, 10)).toBe(5);
  });

  it('falls back to source maxArticles when no CLI limit', () => {
    expect(resolveArticleLimit(undefined, 10)).toBe(10);
  });

  it('falls back to 10 when both are absent', () => {
    expect(resolveArticleLimit(undefined, undefined)).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/commands/scrape.test.ts
```
Expected: FAIL — `resolveArticleLimit` is not exported.

- [ ] **Step 3: Extract and export `resolveArticleLimit` in `scrape.ts`**

Add this pure function at the top of `src/commands/scrape.ts` (before `scrapeCommand`):

```ts
export function resolveArticleLimit(cliLimit: number | undefined, sourceMax: number | undefined): number {
  return cliLimit ?? sourceMax ?? 10;
}
```

- [ ] **Step 4: Apply it in the RSS path**

Replace the RSS articles assignment (lines ~44-46) so the cap is applied right after fetching:

```ts
const feed = await rssFeedParser.parse(source.rss);
const limit = resolveArticleLimit(options.limit, source.maxArticles);
articles = (feed.articles || []).slice(0, limit);
logger.debug(`RSS: ${articles.length} articles from ${source.name}`);
```

- [ ] **Step 5: Apply it in the HTTP/Playwright path**

Replace the hardcoded limit on line ~62:

```ts
const limit = resolveArticleLimit(options.limit, source.maxArticles);
```

- [ ] **Step 6: Remove the now-redundant CLI-limit slice**

Remove lines 75-77 (the `if (options.limit) { articles = articles.slice(...) }` block) — the limit is now applied at fetch time in both paths, so this second slice is redundant.

- [ ] **Step 7: Run the test to confirm it passes**

```bash
npx vitest run src/commands/scrape.test.ts
```
Expected: PASS — 3 tests passing.

- [ ] **Step 8: Run full test suite**

```bash
npm run test
```
Expected: all tests pass.

- [ ] **Step 9: Build**

```bash
npm run build
```
Expected: exits 0.
