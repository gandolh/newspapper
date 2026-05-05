# Group Command Design

**Date:** 2026-05-05  
**Status:** Approved

## Overview

Implement `src/commands/group.ts` — the command that clusters scraped articles into groups using embeddings or entity overlap, then presents an interactive TUI for the user to review, accept, modify, merge, or skip each cluster before saving.

---

## Architecture & Data Flow

Four sequential phases:

1. **Load** — `manifestManager.load()` → articles with status `scraped` → `articleStorage.loadMultiple()`
2. **Cluster** — `articleClusterer.clusterArticles(articles, threshold)` (embeddings) or `articleClusterer.clusterByEntities(articles, entityStorage)` (entities), based on `--method`
3. **Review loop** — TUI per cluster: display table + entities + keywords, prompt action
4. **Summary** — log total groups saved, hint for next step

Session state: a `savedGroups: Group[]` array tracks groups saved during this run (used for merge target selection).

---

## CLI Options

Registered in `index.ts` (already wired):

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--threshold` | float | `0.75` | Similarity threshold for embeddings clustering |
| `--method` | string | `embeddings` | `embeddings` or `entities` |
| `--min-group-size` | int | `2` | Minimum articles per group to surface in TUI |

---

## TUI Review Loop

For each cluster, display:

```
============================================================
Group 2/8 — 4 articles
============================================================
┌───┬──────────────────────────────────────┬──────────────┬─────────────┐
│ # │ Title                                │ Source       │ Date        │
├───┼──────────────────────────────────────┼──────────────┼─────────────┤
│ 1 │ Biden announces new climate policy...│ Guardian     │ 5/4/2026    │
└───┴──────────────────────────────────────┴──────────────┴─────────────┘

Common entities:
  People: Biden
  Places: United States

Keywords: climate, policy, Biden, legislation, White House, Washington
```

Then prompt with 5 actions: **Accept and save**, **Skip**, **Remove articles**, **Merge with previous group**, **Stop reviewing**.

---

## Action Handlers

### Accept
- Call `groupStorage.save({ articleIds, threshold, centroid, commonEntities })`
- Update manifest: `manifestManager.addGroup({ id, articleIds, threshold })` then `manifestManager.updateArticleStatus(id, 'grouped')` for each article
- Push saved group to `savedGroups`
- Log success with group ID

### Skip
- Do nothing, continue to next cluster

### Remove articles
- Checkbox prompt listing all articles in cluster by title
- Filter out selected IDs
- If remaining count ≥ `options.minGroupSize`: save modified group (same as Accept flow)
- Else: warn "Too few articles remaining, group not saved"

### Merge with previous group
- If `savedGroups` is empty: warn "No groups saved yet in this session", skip merge
- List prompt: one entry per saved group (label = first article title, truncated to 40 chars + group ID suffix) + **"Other (enter ID manually)"** at bottom
- If "Other": free-text input for group ID → `groupStorage.load(id)` to validate → if not found, warn and abort merge
- Call `groupStorage.addArticleToGroup(targetGroupId, articleId)` for each article in current cluster
- Update manifest article statuses to `grouped`
- Log success

### Stop
- Break review loop, skip remaining clusters, go to summary

---

## Keywords Algorithm

Computed per cluster before displaying, capped at 10 total:

1. Flatten all entity values from `commonEntities` (people + places + organizations + events) → `entityTerms[]`
2. Tokenize all article titles: lowercase, split on non-word chars, filter stop words (a, the, in, of, and, to, for, is, are, was, were, that, this, with, by, on, at, from, an, as, it, its, be, has, have, had, will, would, said, says)
3. Count term frequency across titles
4. Sort by frequency descending → `titleTerms[]`
5. Merge: `entityTerms` first (deduplicated), then fill remaining slots from `titleTerms` (skip duplicates of entity terms)
6. Slice to max 10

Keywords are displayed only — not persisted to the group record (entities already capture the structured NLP data).

---

## Error Handling

- No scraped articles → `logger.warn` + `process.exit(0)`
- Clustering returns 0 clusters → `logger.warn` + `process.exit(0)`
- Embedding generation failure → caught by clusterer, surfaces as error, `process.exit(1)`
- Invalid group ID in manual merge → warn, skip merge (don't crash loop)
- Ctrl+C mid-review → Node default SIGINT; groups saved so far are persisted (no cleanup needed)

---

## Files

- **Modify:** `src/commands/group.ts` — full implementation replacing the 2-line stub
- **No other files need changes** — all dependencies (clusterer, storage, manifest) are already implemented

---

## Out of Scope

- Persisting keywords to the group record (entities cover structured NLP)
- Undo functionality
- Auto-save every N groups
- Manual group creation (no clustering)
