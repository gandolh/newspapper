# Codebase Map

## Quick Reference: Where to Find Things

### Need to work with articles?

→ `src/storage/articles.js` - ArticleStorage class

### Need to work with groups?

→ `src/storage/groups.js` - GroupStorage class

### Need to work with summaries?

→ `src/storage/summaries.js` - SummaryStorage class

### Need to track status/relations?

→ `src/storage/manifest.js` - ManifestManager class

### Need to scrape websites?

→ `src/scrapers/index.js` - ScraperOrchestrator class

### Need to cluster articles?

→ `src/nlp/clustering.js` - ArticleClusterer class

### Need to extract entities?

→ `src/nlp/entity-extractor.js` - EntityExtractor class

### Need to generate summaries?

→ `src/summarizers/index.js` - SummarizerOrchestrator class

### Need to render images?

→ `src/renderer/screenshot.js` - ScreenshotRenderer class

### Need configuration values?

→ `src/utils/config.js` - config object

### Need to log messages?

→ `src/utils/logger.js` - logger object

## Module Details

### Storage Modules (`src/storage/`)

All storage modules follow the same pattern:

**ManifestManager** (`manifest.js`)

```javascript
await manifestManager.load();
await manifestManager.save();
await manifestManager.addArticle(article);
await manifestManager.updateArticleStatus(id, status);
await manifestManager.getArticlesByStatus(status);
// Similar for groups and summaries
```

**ArticleStorage** (`articles.js`)

```javascript
const article = await articleStorage.save(articleData);
const article = await articleStorage.load(id);
const articles = await articleStorage.loadMultiple([id1, id2]);
await articleStorage.update(id, updates);
await articleStorage.delete(id);
```

**GroupStorage** (`groups.js`)

```javascript
const group = await groupStorage.save(groupData);
const group = await groupStorage.load(id);
await groupStorage.addArticle(groupId, articleId);
await groupStorage.removeArticle(groupId, articleId);
```

**SummaryStorage** (`summaries.js`)

```javascript
const summary = await summaryStorage.save(summaryData);
const summary = await summaryStorage.load(id);
const summaries = await summaryStorage.getByGroup(groupId);
```

**EntityStorage** (`entities.js`)

```javascript
await entityStorage.save(articleId, entityData);
const entities = await entityStorage.load(articleId);
const results = await entityStorage.searchByEntity(type, name, articleIds);
```

**SourceManager** (`sources.js`)

```javascript
await sourceManager.load();
const sources = await sourceManager.getEnabled();
const source = await sourceManager.getById(id);
```

### Scraper Modules (`src/scrapers/`)

**ScraperOrchestrator** (`index.js`)

```javascript
const article = await scraperOrchestrator.scrapeArticle(url, source);
await scraperOrchestrator.cleanup(); // Close browser
```

**HttpScraper** (`http-scraper.js`)

```javascript
const article = await httpScraper.scrape(url, selectors);
```

**PlaywrightScraper** (`playwright-scraper.js`)

```javascript
await playwrightScraper.launch();
const article = await playwrightScraper.scrape(url, selectors);
await playwrightScraper.close();
```

**RSSFeedParser** (`rss-parser.js`)

```javascript
const feed = await rssFeedParser.parse(feedUrl);
// feed.articles is array of article objects
```

### NLP Modules (`src/nlp/`)

**EntityExtractor** (`entity-extractor.js`)

```javascript
const entities = await entityExtractor.extract(text, method);
// entities = { people: [], places: [], organizations: [], events: [] }
```

**EmbeddingGenerator** (`embeddings.js`)

```javascript
await embeddingGenerator.initialize();
const embedding = await embeddingGenerator.generate(text);
const similarity = embeddingGenerator.cosineSimilarity(vec1, vec2);
```

**ArticleClusterer** (`clustering.js`)

```javascript
const clusters = await articleClusterer.clusterArticles(articles, threshold);
const clusters = await articleClusterer.clusterByEntities(
  articles,
  entityStorage,
);
```

### Summarizer Modules (`src/summarizers/`)

**SummarizerOrchestrator** (`index.js`)

```javascript
const slides = await summarizerOrchestrator.summarize(
  articles,
  method,
  options,
);
const isAvailable = await summarizerOrchestrator.checkLocalLLM();
```

**LLMSummarizer** (`llm-summarizer.js`)

```javascript
const slides = await llmSummarizer.summarize(articles, options);
```

**LocalSummarizer** (`local-summarizer.js`)

```javascript
const isAvailable = await localSummarizer.checkConnection();
const slides = await localSummarizer.summarize(articles, options);
```

**TemplateSummarizer** (`template-summarizer.js`)

```javascript
const slides = await templateSummarizer.summarize(articles, options);
```

### Renderer Modules (`src/renderer/`)

**DesignLoader** (`design-loader.js`)

```javascript
const design = await designLoader.load("broadsheet");
// or 'industrial'
```

**HtmlBuilder** (`html-builder.js`)

```javascript
const html = await htmlBuilder.buildSlide(slide, design);
```

**ScreenshotRenderer** (`screenshot.js`)

```javascript
const imagePaths = await screenshotRenderer.renderSlides(
  slides,
  designName,
  outputDir,
);
await screenshotRenderer.close();
```

### Utility Modules (`src/utils/`)

**Logger** (`logger.js`)

```javascript
logger.error("Error message");
logger.warn("Warning message");
logger.info("Info message");
logger.debug("Debug message");
logger.success("Success message");
logger.step("Step message");
```

**Config** (`config.js`)

```javascript
config.openai.apiKey;
config.ollama.host;
config.ollama.model;
config.scraping.timeout;
config.scraping.retries;
config.clustering.threshold;
config.image.quality;
config.paths.data;
config.paths.output;
```

## Data Structures

### Article Object

```javascript
{
  id: 'uuid',
  url: 'https://...',
  title: 'Article Title',
  author: 'Author Name',
  publishedAt: '2026-05-05T00:00:00Z',
  body: 'Full article text...',
  excerpt: 'Brief summary...',
  images: ['url1', 'url2'],
  sourceId: 'source-id',
  sourceName: 'Source Name',
  metadata: {
    wordCount: 1200,
    scrapedAt: '2026-05-05T00:00:00Z',
    scraperType: 'http'
  }
}
```

### Group Object

```javascript
{
  id: 'uuid',
  articleIds: ['id1', 'id2', 'id3'],
  threshold: 0.75,
  centroid: [0.1, 0.2, ...], // embedding vector
  commonEntities: {
    people: ['Biden', 'Harris'],
    places: ['Washington'],
    organizations: ['White House']
  },
  createdAt: '2026-05-05T00:00:00Z'
}
```

### Summary Object

```javascript
{
  id: 'uuid',
  groupId: 'group-id',
  method: 'local',
  tone: 'analytical',
  design: 'broadsheet',
  slides: [
    {
      type: 'title',
      text: 'Slide Title',
      notes: 'Internal notes'
    },
    {
      type: 'body',
      text: 'Slide content...'
    },
    {
      type: 'quote',
      text: 'Quote text',
      attribution: 'Person Name'
    }
  ],
  createdAt: '2026-05-05T00:00:00Z'
}
```

### Manifest Structure

```javascript
{
  articles: {
    'article-id': {
      id: 'article-id',
      status: 'scraped', // scraped | grouped | published
      scrapedAt: '2026-05-05T00:00:00Z',
      groupId: 'group-id' // optional
    }
  },
  groups: {
    'group-id': {
      id: 'group-id',
      status: 'draft', // draft | summarized | generated | published
      createdAt: '2026-05-05T00:00:00Z',
      articleCount: 4
    }
  },
  summaries: {
    'summary-id': {
      id: 'summary-id',
      groupId: 'group-id',
      status: 'draft', // draft | generated | published
      createdAt: '2026-05-05T00:00:00Z'
    }
  }
}
```

## File Paths

All paths are configured in `src/utils/config.js`:

```javascript
config.paths.data; // ./data
config.paths.articles; // ./data/articles
config.paths.groups; // ./data/groups
config.paths.summaries; // ./data/summaries
config.paths.entities; // ./data/entities
config.paths.output; // ./output
config.paths.designSystems; // ./design-systems
config.paths.prompts; // ./prompts
config.paths.templates; // ./templates
```

## Environment Variables

Defined in `.env.example`:

```bash
# OpenAI
OPENAI_API_KEY=

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b

# Scraping
SCRAPING_TIMEOUT=30000
SCRAPING_RETRIES=3
SCRAPING_USER_AGENT=

# Clustering
CLUSTERING_THRESHOLD=0.75
CLUSTERING_MIN_GROUP_SIZE=2

# Image Generation
IMAGE_QUALITY=90
IMAGE_FORMAT=png
IMAGE_WIDTH=1080
IMAGE_HEIGHT=1080

# Data Retention
DATA_RETENTION_DAYS=30

# Logging
LOG_LEVEL=info
```

## Common Workflows

### Scraping Workflow

1. Load sources from `data/sources.json`
2. For each enabled source:
   - Try RSS if available
   - Fallback to HTTP/Playwright scraping
3. Save articles to `data/articles/`
4. Update manifest with new articles

### Grouping Workflow

1. Load ungrouped articles from manifest
2. Generate embeddings or extract entities
3. Cluster articles by similarity
4. Show groups to user for review
5. Save approved groups to `data/groups/`
6. Update manifest with group assignments

### Summarization Workflow

1. Load group and its articles
2. Choose summarization method
3. Generate slide content
4. Save summary to `data/summaries/`
5. Update manifest with summary

### Generation Workflow

1. Load summary and design system
2. Build HTML for each slide
3. Render to PNG with Playwright
4. Compress with Sharp
5. Save to `output/{group-id}/slides/`
6. Update manifest status

### Export Workflow

1. Copy slides and metadata
2. Update manifest status to 'published'
3. Show export location to user
