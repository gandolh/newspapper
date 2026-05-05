# Query Entities Command Design

**Date:** 2026-05-05  
**Status:** Approved

## Overview

Implement `src/commands/query-entities.ts` — searches articles by entity name and type, shows a results table and groups summary, with optional related entities (`--related`) and ASCII timeline (`--timeline`).

Also adds `getAll()` to `ManifestManager` to expose the full articles map for date-based filtering.

---

## CLI Registration (already wired in index.ts)

```
query-entities
  --type <type>     person | place | organization | event  (required)
  --name <name>     Entity name to search for              (required)
  --days <number>   Look back N days                       (default: 30)
  --related         Show "Frequently mentioned with" block (optional flag)
  --timeline        Show ASCII timeline block              (optional flag)
```

**Note:** `--related` and `--timeline` flags need to be added to the CLI registration in `src/index.ts`.

---

## ManifestManager Change

Add to `src/storage/manifest.ts`:

```typescript
getAll(): { articles: Record<string, ArticleEntry> } {
  return { articles: this.manifest?.articles ?? {} };
}
```

This is a synchronous getter — manifest must already be loaded via `load()` before calling it.

---

## Architecture & Data Flow

### Phase 1: Validate & map type

```typescript
const typeMap: Record<string, string> = {
  person: 'people',
  place: 'places',
  organization: 'organizations',
  event: 'events',
};
```

If `options.type` not in `typeMap` → `logger.error` + `process.exit(1)`.  
If `options.name` is empty → `logger.error` + `process.exit(1)`.

### Phase 2: Filter articles by date

```typescript
await manifestManager.load();
const { articles } = manifestManager.getAll();
const cutoff = subDays(new Date(), options.days);
const recent = Object.values(articles).filter(a => new Date(a.scrapedAt) >= cutoff);
```

### Phase 3: Search entities

```typescript
const results = await entityStorage.searchByEntity(
  typeMap[options.type],
  options.name,
  recent.map(a => a.id)
);
```

If empty → warn with helpful suggestions + `process.exit(0)`.

### Phase 4: Display

1. **Results table** — always shown: Date, Title (truncated), Source, Matches count, Group ID (first 8 chars + `…`)
2. **Groups summary** — always shown: collect unique group IDs from manifest, load each, print article count
3. **Related entities** — shown if `--related`: aggregate all entity fields from results, exclude the searched name, print top 10 per non-empty category
4. **Timeline** — shown if `--timeline`: group results by `publishedAt` date (fall back to `scrapedAt` if absent), sort, print ASCII bar (`█` per article, max 50)

---

## Output Format

**Always shown:**
```
ℹ Searching for person: "Biden"
✓ Found 8 articles mentioning "Biden"

┌────────────┬───────────────────────────────────────┬───────────┬─────────┬────────┐
│ Date       │ Title                                 │ Source    │ Matches │ Group  │
└────────────┴───────────────────────────────────────┴───────────┴─────────┴────────┘

Found in 2 group(s):
  abc123…: 4 articles
  def456…: 3 articles
```

**`--related`:**
```
Frequently mentioned with:
  People: Harris, Blinken, McCarthy
  Places: Washington, United States
  Organizations: Democratic Party, Senate
```

**`--timeline`:**
```
Timeline:
  05/03: ███ (3)
  05/04: █████ (5)
```

---

## Error Handling

| Situation | Behaviour |
|-----------|-----------|
| Invalid `--type` | `logger.error` + `process.exit(1)` |
| Empty `--name` | `logger.error` + `process.exit(1)` |
| No results | `logger.warn` with suggestions + `process.exit(0)` |
| Article not in storage | skip silently in table rendering |
| Group not in storage | skip silently in groups summary |

---

## Files

- **Modify:** `src/storage/manifest.ts` — add `getAll()` method
- **Modify:** `src/commands/query-entities.ts` — full implementation
- **Modify:** `src/index.ts` — add `--related` and `--timeline` options to the `query-entities` command registration

---

## Out of Scope

- CSV export
- Fuzzy matching
- Multi-entity search
- Sentiment analysis
- Full article text display
