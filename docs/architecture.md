# Newspapper - Architecture Documentation

## Overview

Newspapper is a personal news aggregation and summarization tool that scrapes trusted news sources, groups similar articles, and generates beautiful Instagram-ready slides with summaries.

## Core Philosophy

- **Manual Control:** Every phase requires explicit user command
- **On-Demand Processing:** No automatic background jobs
- **Local-First:** Runs entirely on your machine with optional API integrations
- **File-Based Storage:** No database, pure JSON files
- **Flexible Processing:** Multiple strategies for scraping, NLP, and summarization

## Tech Stack

### Runtime & Language
- **Node.js** - JavaScript runtime
- **JavaScript** - Primary language

### Scraping
- **axios** - HTTP requests (default)
- **cheerio** - HTML parsing
- **Playwright** - Headless browser (fallback for JS-heavy sites)
- **RSS parser** - Feed discovery and parsing

### NLP & ML
- **compromise** - Lightweight entity extraction (default)
- **@xenova/transformers** - Advanced NER and embeddings
- **Sentence embeddings** - For article similarity clustering

### LLM Integration
- **Ollama** - Local LLM (Llama 3.2 1B, default)
- **OpenAI API** - Cloud LLM option

### Rendering
- **Playwright** - HTML to PNG screenshots
- **Handlebars** - Template engine for prompts and HTML

### CLI
- **Commander.js** (or similar) - Command-line interface

### Utilities
- **sharp** - Image compression
- **uuid** - Unique identifiers

## Project Structure

```
newspapper/
├── src/
│   ├── commands/          # CLI command handlers
│   │   ├── scrape.js
│   │   ├── group.js
│   │   ├── extract-entities.js
│   │   ├── query-entities.js
│   │   ├── summarize.js
│   │   ├── generate.js
│   │   ├── export.js
│   │   ├── clean.js
│   │   └── list.js
│   ├── scrapers/          # Scraping implementations
│   │   ├── http-scraper.js
│   │   ├── playwright-scraper.js
│   │   └── rss-parser.js
│   ├── nlp/               # NLP and ML
│   │   ├── entity-extractor.js
│   │   ├── embeddings.js
│   │   └── clustering.js
│   ├── summarizers/       # Summarization strategies
│   │   ├── llm-summarizer.js
│   │   ├── local-summarizer.js
│   │   └── template-summarizer.js
│   ├── renderer/          # Image generation
│   │   ├── html-builder.js
│   │   └── screenshot.js
│   ├── storage/           # File operations
│   │   ├── manifest.js
│   │   ├── articles.js
│   │   ├── groups.js
│   │   └── summaries.js
│   └── utils/
│       ├── logger.js
│       └── config.js
├── data/
│   ├── manifest.json      # Index of all entities and relationships
│   ├── sources.json       # Trusted news sources configuration
│   ├── articles/          # One JSON file per article
│   ├── groups/            # Similarity clusters
│   ├── summaries/         # Generated summaries
│   └── entities/          # Extracted entities per article
├── output/
│   └── {group-id}/
│       ├── slides/        # Generated PNG images
│       │   ├── 01-title.png
│       │   ├── 02-body.png
│       │   └── ...
│       ├── summary.json   # Summary data
│       └── metadata.json  # Sources, dates, entities
├── design-systems/
│   ├── digital-broadsheet.yaml
│   └── warm-industrial.yaml
├── prompts/
│   ├── summarize-llm.hbs
│   ├── summarize-local.hbs
│   └── summarize-template.hbs
├── templates/             # HTML slide templates
│   ├── digital-broadsheet/
│   │   ├── title.html
│   │   ├── body.html
│   │   ├── quote.html
│   │   └── image-caption.html
│   └── warm-industrial/
│       ├── title.html
│       ├── body.html
│       ├── quote.html
│       └── image-caption.html
├── .env                   # API keys and configuration
├── package.json
└── README.md
```

## Data Models

### manifest.json
```json
{
  "articles": {
    "article-uuid": {
      "id": "article-uuid",
      "title": "Article Title",
      "sourceId": "source-uuid",
      "scrapedAt": "2026-05-04T20:00:00Z",
      "status": "scraped|grouped|deleted",
      "groupId": "group-uuid",
      "hasEntities": true
    }
  },
  "groups": {
    "group-uuid": {
      "id": "group-uuid",
      "createdAt": "2026-05-04T21:00:00Z",
      "threshold": 0.75,
      "status": "draft|reviewed|summarized",
      "articleIds": ["article-uuid-1", "article-uuid-2"],
      "summaryId": "summary-uuid"
    }
  },
  "summaries": {
    "summary-uuid": {
      "id": "summary-uuid",
      "groupId": "group-uuid",
      "method": "llm|local|nlp",
      "tone": "optimistic|analytical",
      "design": "broadsheet|industrial",
      "createdAt": "2026-05-04T22:00:00Z",
      "status": "draft|generated|published"
    }
  }
}
```

### sources.json
```json
[
  {
    "id": "source-uuid",
    "name": "The Guardian",
    "url": "https://theguardian.com",
    "rss": "https://theguardian.com/rss",
    "scraperType": "http|playwright",
    "selectors": {
      "title": "h1.headline",
      "author": ".author-name",
      "date": "time[datetime]",
      "body": "article .content"
    }
  }
]
```

### articles/{article-id}.json
```json
{
  "id": "article-uuid",
  "sourceId": "source-uuid",
  "url": "https://...",
  "title": "Article Title",
  "author": "Author Name",
  "publishedAt": "2026-05-04T10:00:00Z",
  "scrapedAt": "2026-05-04T20:00:00Z",
  "body": "Full article text...",
  "image": "https://...",
  "metadata": {
    "wordCount": 1500,
    "language": "en"
  }
}
```

### groups/{group-id}.json
```json
{
  "id": "group-uuid",
  "articleIds": ["uuid-1", "uuid-2", "uuid-3"],
  "createdAt": "2026-05-04T21:00:00Z",
  "threshold": 0.75,
  "centroid": [0.1, 0.2, ...],
  "commonEntities": {
    "people": ["Biden", "Putin"],
    "places": ["Ukraine"],
    "events": ["Summit"]
  }
}
```

### summaries/{summary-id}.json
```json
{
  "id": "summary-uuid",
  "groupId": "group-uuid",
  "method": "local",
  "tone": "analytical",
  "design": "broadsheet",
  "createdAt": "2026-05-04T22:00:00Z",
  "slides": [
    {
      "type": "title",
      "text": "Main Headline",
      "notes": "Context for this slide"
    },
    {
      "type": "body",
      "text": "Summary paragraph...",
      "notes": "Key points emphasized"
    },
    {
      "type": "quote",
      "text": "\"Important quote\"",
      "attribution": "Source Name",
      "notes": ""
    }
  ]
}
```

### entities/{article-id}.json
```json
{
  "articleId": "article-uuid",
  "method": "compromise|transformers",
  "extractedAt": "2026-05-04T21:30:00Z",
  "entities": {
    "people": ["Joe Biden", "Vladimir Putin"],
    "places": ["Washington", "Moscow", "Ukraine"],
    "organizations": ["NATO", "UN"],
    "events": ["Peace Summit", "Election"]
  }
}
```

## Workflow States

Articles and groups flow through these states:

1. **Scraped** → Articles stored in `data/articles/`, not yet grouped
2. **Grouped** → Similarity clusters created in `data/groups/`, awaiting user review
3. **Reviewed** → User approved groups via CLI, ready for summarization
4. **Summarized** → Summary generated in `data/summaries/`, ready for rendering
5. **Generated** → Images created in `output/{group-id}/slides/`
6. **Published** → Exported and marked complete in manifest

## Data Flow

```
1. Sources Configuration (sources.json)
         ↓
2. Scrape Articles (HTTP/Playwright/RSS)
         ↓
3. Store Articles (data/articles/*.json)
         ↓
4. Extract Entities (on-demand, data/entities/*.json)
         ↓
5. Generate Embeddings (@xenova/transformers)
         ↓
6. Cluster by Similarity (cosine similarity)
         ↓
7. Create Groups (data/groups/*.json)
         ↓
8. User Review Groups (CLI TUI)
         ↓
9. Summarize (LLM/Local/Template)
         ↓
10. Store Summary (data/summaries/*.json)
         ↓
11. Render HTML Templates (Handlebars)
         ↓
12. Screenshot with Playwright
         ↓
13. Compress Images (sharp)
         ↓
14. Export Package (output/{group-id}/)
```

## Key Design Decisions

### Why File-Based Storage?
- **Transparency:** Easy to inspect, debug, and version control
- **Simplicity:** No database setup or migrations
- **Portability:** Copy the `data/` folder anywhere
- **Manual Control:** Aligns with on-demand workflow

### Why Dual Strategies?
- **Scraping:** HTTP is fast, Playwright handles complex sites
- **NLP:** compromise is lightweight, transformers for precision
- **Summarization:** Flexibility to experiment with quality vs. cost

### Why Manifest?
- **Performance:** Avoid scanning thousands of JSON files
- **Relationships:** Track article→group→summary connections
- **Queries:** Fast entity lookups without loading all files

### Why 30-Day Retention?
- Supports multi-day event tracking
- Prevents unbounded storage growth
- User controls deletion timing

## Scalability Considerations

**Current Design (10-20 sources, daily scraping):**
- ~100-500 articles/day
- ~10-50 groups/day
- File system handles this easily

**If Scaling to 100 sources:**
- Consider SQLite for manifest (keep JSON for articles)
- Add pagination to CLI commands
- Implement background indexing

**Not Recommended:**
- Real-time scraping (stick with on-demand)
- Automatic deletion (manual control is a feature)
- Web UI (CLI keeps it focused)
