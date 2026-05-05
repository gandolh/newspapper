# CLI Commands Reference

## Overview

All commands are run via npm scripts or direct node execution. Each command is designed to be explicit and require user confirmation for destructive actions.

## Command List

### 1. Scrape Articles

```bash
npm run scrape [options]
```

**Description:** Fetch articles from configured news sources.

**Options:**
- `--sources=src1,src2` - Scrape only specific sources (comma-separated IDs or names)
- `--method=http|playwright|rss` - Force specific scraper method
- `--limit=N` - Maximum articles to scrape per source

**Examples:**
```bash
npm run scrape
npm run scrape --sources=guardian,nytimes
npm run scrape --method=playwright --sources=wsj
```

**Output:**
- Articles saved to `data/articles/{uuid}.json`
- Manifest updated with new article entries
- Console shows: source name, articles found, articles saved

---

### 2. Group Articles

```bash
npm run group [options]
```

**Description:** Cluster articles by similarity using embeddings.

**Options:**
- `--threshold=0.75` - Similarity threshold (0.0-1.0, default: 0.75)
- `--method=embeddings|entities` - Clustering method
- `--min-group-size=2` - Minimum articles per group

**Examples:**
```bash
npm run group
npm run group --threshold=0.8
npm run group --method=entities
```

**Interactive Flow:**
1. Shows proposed groups with article titles
2. User can:
   - Accept group
   - Merge with another group
   - Split group
   - Remove articles from group
   - Delete entire group
3. Saves approved groups to `data/groups/{uuid}.json`

**Output:**
- Groups saved to `data/groups/`
- Manifest updated with group relationships
- Console shows: total groups, articles per group

---

### 3. Extract Entities

```bash
npm run extract-entities <article-id> [options]
```

**Description:** Extract named entities (people, places, organizations, events) from an article.

**Options:**
- `--method=compromise|transformers` - Extraction method (default: compromise)
- `--all` - Extract entities from all ungrouped articles

**Examples:**
```bash
npm run extract-entities abc-123-def
npm run extract-entities abc-123-def --method=transformers
npm run extract-entities --all
```

**Output:**
- Entities saved to `data/entities/{article-id}.json`
- Console shows: entity counts by type

---

### 4. Query Entities

```bash
npm run query-entities [options]
```

**Description:** Search for articles/groups by entity name.

**Options:**
- `--type=person|place|organization|event` - Entity type
- `--name="Biden"` - Entity name to search for
- `--days=30` - Look back N days (default: 30)

**Examples:**
```bash
npm run query-entities --type=person --name="Biden"
npm run query-entities --type=place --name="Ukraine" --days=7
npm run query-entities --type=event --name="Summit"
```

**Output:**
- List of matching articles with titles, dates, sources
- List of groups containing those articles
- Timeline visualization (ASCII) if multiple matches

---

### 5. Summarize Group

```bash
npm run summarize <group-id> [options]
```

**Description:** Generate slide content from a group of articles.

**Options:**
- `--method=llm|local|nlp` - Summarization method (default: local)
- `--tone=optimistic|analytical` - Tone of summary (default: analytical)
- `--design=broadsheet|industrial` - Design system to use (default: broadsheet)
- `--max-slides=8` - Maximum number of slides (default: 8)
- `--emphasis="key point"` - Specific points to emphasize
- `--exclude=article-id` - Exclude specific articles from summary

**Examples:**
```bash
npm run summarize abc-123 --method=local --tone=optimistic
npm run summarize abc-123 --method=llm --design=industrial
npm run summarize abc-123 --emphasis="economic impact" --max-slides=6
```

**Interactive Flow:**
1. Shows article titles in group
2. User confirms articles to include
3. User sets tone and emphasis
4. Generates summary
5. Shows preview of slide content
6. User can regenerate with different parameters

**Output:**
- Summary saved to `data/summaries/{uuid}.json`
- Manifest updated
- Console shows: slide count, method used, preview of first slide

---

### 6. Generate Images

```bash
npm run generate <group-id> [options]
```

**Description:** Render HTML slides to PNG images.

**Options:**
- `--summary-id=uuid` - Use specific summary (if multiple exist)
- `--format=png|jpg` - Image format (default: png)
- `--quality=90` - Compression quality (default: 90)
- `--size=1080x1080` - Image dimensions (default: 1080x1080)

**Examples:**
```bash
npm run generate abc-123
npm run generate abc-123 --quality=95
npm run generate abc-123 --size=1080x1920
```

**Output:**
- Images saved to `output/{group-id}/slides/01-title.png`, etc.
- Console shows: rendering progress, file sizes, output path

---

### 7. Export Package

```bash
npm run export <group-id> [options]
```

**Description:** Export slides and metadata, mark as published.

**Options:**
- `--destination=/path/to/export` - Custom export location

**Examples:**
```bash
npm run export abc-123
npm run export abc-123 --destination=~/Desktop/news-posts
```

**Output:**
- Copies `output/{group-id}/` to destination
- Updates manifest status to "published"
- Console shows: files exported, destination path

---

### 8. Clean Old Data

```bash
npm run clean [options]
```

**Description:** Delete old articles and groups.

**Options:**
- `--older-than=30d` - Delete items older than N days (default: 30)
- `--status=scraped|grouped|published` - Only delete items with this status
- `--dry-run` - Show what would be deleted without deleting
- `--force` - Skip confirmation prompt

**Examples:**
```bash
npm run clean --dry-run
npm run clean --older-than=60d
npm run clean --status=published --older-than=7d
```

**Interactive Flow:**
1. Shows list of items to be deleted
2. Asks for confirmation
3. Deletes files and updates manifest

**Output:**
- Deleted files listed
- Manifest updated
- Console shows: files deleted, space freed

---

### 9. List Items

```bash
npm run list [options]
```

**Description:** List articles, groups, or summaries.

**Options:**
- `--type=articles|groups|summaries` - What to list (default: groups)
- `--status=scraped|grouped|summarized|published` - Filter by status
- `--source=source-name` - Filter by source
- `--days=7` - Only show items from last N days
- `--format=table|json` - Output format (default: table)

**Examples:**
```bash
npm run list
npm run list --type=articles --status=scraped
npm run list --type=groups --days=7
npm run list --source=guardian --format=json
```

**Output:**
- Formatted table or JSON
- Shows: ID, title/name, status, date, article count (for groups)

---

## Workflow Examples

### Complete Workflow: Scrape to Publish

```bash
# 1. Scrape articles from all sources
npm run scrape

# 2. Group similar articles
npm run group --threshold=0.75

# 3. Extract entities for correlation (optional)
npm run extract-entities --all

# 4. Query to find related historical articles (optional)
npm run query-entities --type=person --name="Biden"

# 5. Summarize a group
npm run summarize abc-123 --method=local --tone=analytical

# 6. Generate images
npm run generate abc-123

# 7. Export for publishing
npm run export abc-123

# 8. Clean old published items
npm run clean --status=published --older-than=7d
```

### Experimental Workflow: Compare Summarization Methods

```bash
# Scrape and group
npm run scrape
npm run group

# Try different methods on same group
npm run summarize abc-123 --method=nlp --tone=analytical
npm run summarize abc-123 --method=local --tone=analytical
npm run summarize abc-123 --method=llm --tone=analytical

# Generate images for each
npm run generate abc-123 --summary-id=summary-1
npm run generate abc-123 --summary-id=summary-2
npm run generate abc-123 --summary-id=summary-3
```

### Maintenance Workflow

```bash
# List all items
npm run list --type=articles
npm run list --type=groups
npm run list --type=summaries

# Dry run cleanup
npm run clean --dry-run --older-than=30d

# Actually clean
npm run clean --older-than=30d
```

## Configuration

Commands read from:
- `.env` - API keys, LLM endpoints
- `sources.json` - News sources
- `design-systems/*.yaml` - Design configurations

## Error Handling

All commands:
- Show clear error messages
- Exit with non-zero code on failure
- Log errors to console
- Never silently fail

Recoverable errors (network timeout, rate limit):
- Retry with exponential backoff
- Show progress
- Allow user to cancel
