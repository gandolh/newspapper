# Extract Entities Command Design

**Date:** 2026-05-05  
**Status:** Approved

## Overview

Implement `src/commands/extract-entities.ts` — the command that extracts named entities (people, places, organizations, events) from article bodies using the existing `entityExtractor` NLP layer, with three input modes and per-article overwrite confirmation.

---

## CLI Registration (already wired in index.ts)

```
extract-entities [article-id]
  --method <method>   compromise | transformers  (default: compromise)
  --all               Extract from all scraped articles
```

---

## Architecture & Data Flow

Three sequential phases:

### Phase 1: Resolve articles

Three mutually exclusive modes, checked in order:

1. **Single article** — `articleId` argument provided → `[articleId]`
2. **Batch** — `--all` flag → `manifestManager.getArticlesByStatus('scraped')`
3. **Interactive select** — neither provided → load scraped articles, show inquirer checkbox, user picks

If no scraped articles are available in modes 2 or 3 → `logger.warn` + `process.exit(0)`  
If checkbox selection is empty → `logger.warn('No articles selected')` + `process.exit(0)`

### Phase 2: Extract loop

For each article ID:
1. Load article via `articleStorage.load(id)` — if null, warn + increment `failed`, continue
2. Check for existing entities via `entityStorage.load(id)`
3. If existing → pause spinner, prompt `"Article already has entities. Overwrite? (Y/n)"` → if No, increment `skipped`, continue
4. Call `entityExtractor.extract(article.body, options.method)`
5. Save via `entityStorage.save(id, { method: options.method, entities })`
6. Increment `processed`
7. If extraction throws → warn + increment `failed`, continue

### Phase 3: Summary

**Single article mode:** Print entity breakdown with counts and top values (up to 5 per category).

**Batch / multi-select mode:** Print aggregate unique entity counts across all processed articles.

---

## Output Format

**Single article:**
```
✓ Extracted entities from 1 article

Extracted entities from: Biden announces new climate policy
  People (3): Biden, John Kerry, Pete Buttigieg
  Places (2): United States, Washington
  Organizations (1): White House
  Events (2): climate summit announced, policy unveiled
```

**Batch:**
```
✓ Extracted entities from 32 articles (2 skipped, 1 failed)

Entity extraction summary:
  Unique people: 127
  Unique places: 45
  Unique organizations: 38
  Unique events: 23
```

---

## Error Handling

| Situation | Behaviour |
|-----------|-----------|
| Article not in storage | `logger.warn` + `failed++`, continue |
| NLP extraction throws | `logger.warn` + `failed++`, continue |
| No scraped articles (batch/select) | `logger.warn` + `process.exit(0)` |
| Empty checkbox selection | `logger.warn('No articles selected')` + `process.exit(0)` |
| `failed > 0` at end | `logger.warn('Failed to process N articles')` |

---

## Files

- **Modify:** `src/commands/extract-entities.ts` — full implementation replacing the 2-line stub
- **No other files need changes** — `entityExtractor`, `entityStorage`, `articleStorage`, `manifestManager` are all fully implemented

---

## Out of Scope

- `--overwrite` flag (per-article prompt covers this)
- Progress bar (spinner with counter is sufficient)
- CSV export
- Entity deduplication/normalization
- Transformers NER (falls back to compromise per existing implementation)
