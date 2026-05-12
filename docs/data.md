# Data

All state lives under `data/` as JSON files. No database.

## Directory Layout

```
data/
├── manifest.json          # Central index
├── sources.json           # Source configurations
├── articles/{uuid}.json   # One file per article
├── groups/{uuid}.json     # One file per group
├── summaries/{uuid}.json  # One file per summary
└── entities/{uuid}.json   # One file per article's entities
```

Output images live under `output/`:

```
output/
└── {group-id}/
    ├── slides/
    │   ├── 01-title.png
    │   ├── 02-body.png
    │   └── ...
    ├── metadata.json
    └── summary.json
```

## manifest.json

Central index. Updated after every write operation. Never modify manually.

```json
{
  "articles": {
    "article-uuid": {
      "id": "article-uuid",
      "title": "Article Title",
      "sourceId": "source-uuid",
      "scrapedAt": "2026-05-04T20:00:00Z",
      "status": "scraped | grouped | published",
      "groupId": "group-uuid",
      "hasEntities": true
    }
  },
  "groups": {
    "group-uuid": {
      "id": "group-uuid",
      "createdAt": "2026-05-04T21:00:00Z",
      "threshold": 0.75,
      "status": "draft | reviewed | summarized | generated | published",
      "articleIds": ["article-uuid-1", "article-uuid-2"],
      "articleCount": 2,
      "summaryId": "summary-uuid"
    }
  },
  "summaries": {
    "summary-uuid": {
      "id": "summary-uuid",
      "groupId": "group-uuid",
      "method": "llm | local | nlp",
      "tone": "optimistic | analytical",
      "design": "broadsheet | industrial",
      "createdAt": "2026-05-04T22:00:00Z",
      "status": "draft | generated | published"
    }
  }
}
```

## sources.json

Configured manually. Controls which sources are scraped.

```json
[
  {
    "id": "source-uuid",
    "name": "The Guardian",
    "url": "https://theguardian.com",
    "rss": "https://theguardian.com/rss",
    "scraperType": "http",
    "enabled": true,
    "selectors": {
      "title": "h1.headline",
      "author": ".author-name",
      "date": "time[datetime]",
      "body": "article .content"
    }
  }
]
```

## articles/{article-id}.json

```json
{
  "id": "article-uuid",
  "sourceId": "source-uuid",
  "sourceName": "The Guardian",
  "url": "https://...",
  "title": "Article Title",
  "author": "Author Name",
  "publishedAt": "2026-05-04T10:00:00Z",
  "body": "Full article text...",
  "excerpt": "Brief summary...",
  "images": ["https://..."],
  "metadata": {
    "wordCount": 1500,
    "language": "en",
    "scrapedAt": "2026-05-04T20:00:00Z",
    "scraperType": "http"
  }
}
```

## groups/{group-id}.json

```json
{
  "id": "group-uuid",
  "articleIds": ["uuid-1", "uuid-2", "uuid-3"],
  "createdAt": "2026-05-04T21:00:00Z",
  "threshold": 0.75,
  "centroid": [0.1, 0.2],
  "commonEntities": {
    "people": ["Biden", "Putin"],
    "places": ["Ukraine"],
    "organizations": ["NATO"],
    "events": ["Summit"]
  }
}
```

## summaries/{summary-id}.json

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

Slide types: `title`, `body`, `quote`, `image-caption`.

## entities/{article-id}.json

```json
{
  "articleId": "article-uuid",
  "method": "compromise | transformers",
  "extractedAt": "2026-05-04T21:30:00Z",
  "entities": {
    "people": ["Joe Biden", "Vladimir Putin"],
    "places": ["Washington", "Moscow", "Ukraine"],
    "organizations": ["NATO", "UN"],
    "events": ["Peace Summit", "Election"]
  }
}
```

## output/{group-id}/metadata.json

Written by `npm run generate`. Not tracked in manifest.

```json
{
  "groupId": "group-uuid",
  "summaryId": "summary-uuid",
  "generatedAt": "2026-05-04T23:00:00Z",
  "design": "broadsheet",
  "method": "local",
  "tone": "analytical",
  "slideCount": 5,
  "articles": [
    {
      "title": "Article Title",
      "source": "The Guardian",
      "url": "https://...",
      "author": "Author Name",
      "publishedAt": "2026-05-04T10:00:00Z"
    }
  ]
}
```

## Config Paths

All paths resolved in `src/utils/config.ts`:

```
config.paths.data          → ./data
config.paths.articles      → ./data/articles
config.paths.groups        → ./data/groups
config.paths.summaries     → ./data/summaries
config.paths.entities      → ./data/entities
config.paths.output        → ./output
config.paths.designSystems → ./design-systems
config.paths.prompts       → ./prompts
config.paths.templates     → ./templates
```
