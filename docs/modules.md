# Modules

Quick reference for all modules in `src/`. Commands in `src/commands/` orchestrate these — they do not implement business logic themselves.

## Storage (`src/storage/`)

All storage modules follow the same pattern: load data, mutate, save. Always call `manifestManager.save()` after manifest mutations.

### ManifestManager (`manifest.ts`)

Central index. Load once at command start; save after every write.

```typescript
await manifestManager.load();
const manifest = await manifestManager.load(); // returns manifest object
await manifestManager.save();

await manifestManager.addArticle(article);
await manifestManager.updateArticleStatus(id, 'grouped');
await manifestManager.getArticlesByStatus('scraped');

// Similar methods for groups and summaries
```

### ArticleStorage (`articles.ts`)

```typescript
const article = await articleStorage.save(articleData);
const article = await articleStorage.load(id);
const articles = await articleStorage.loadMultiple([id1, id2]);
await articleStorage.update(id, updates);
await articleStorage.delete(id);
```

### GroupStorage (`groups.ts`)

```typescript
const group = await groupStorage.save(groupData);
const group = await groupStorage.load(id);
await groupStorage.addArticle(groupId, articleId);
await groupStorage.removeArticle(groupId, articleId);
```

### SummaryStorage (`summaries.ts`)

```typescript
const summary = await summaryStorage.save(summaryData);
const summary = await summaryStorage.load(id);
const summaries = await summaryStorage.getByGroup(groupId);
```

### EntityStorage (`entities.ts`)

```typescript
await entityStorage.save(articleId, entityData);
const entities = await entityStorage.load(articleId);
const results = await entityStorage.searchByEntity(type, name, articleIds);
```

### SourceManager (`sources.ts`)

```typescript
await sourceManager.load();
const sources = await sourceManager.getEnabled();
const sources = await sourceManager.getAll();
const source = await sourceManager.getById(id);
```

---

## Scrapers (`src/scrapers/`)

### ScraperOrchestrator (`index.ts`)

```typescript
const article = await scraperOrchestrator.scrapeArticle(url, source);
await scraperOrchestrator.cleanup();
```

### HttpScraper (`http-scraper.ts`)

```typescript
const article = await httpScraper.scrape(url, selectors);
```

### RSSFeedParser (`rss-parser.ts`)

```typescript
const feed = await rssFeedParser.parse(feedUrl);
// feed.articles: array of article objects
```

---

## NLP (`src/nlp/`)

### EntityExtractor (`entity-extractor.ts`)

```typescript
const entities = await entityExtractor.extract(text, method);
// entities = { people: [], places: [], organizations: [], events: [] }
// method: 'compromise' (default, fast) | 'transformers' (slower, accurate)
```

### EmbeddingGenerator (`embeddings.ts`)

```typescript
await embeddingGenerator.initialize(); // downloads model on first use (~100-500MB)
const embedding = await embeddingGenerator.generate(text);
const similarity = embeddingGenerator.cosineSimilarity(vec1, vec2);
```

### ArticleClusterer (`clustering.ts`)

```typescript
const clusters = await articleClusterer.clusterArticles(articles, threshold);
const clusters = await articleClusterer.clusterByEntities(articles, entityStorage);
```

---

## Summarizers (`src/summarizers/`)

### SummarizerOrchestrator (`index.ts`)

```typescript
const slides = await summarizerOrchestrator.summarize(articles, method, options);
// method: 'llm' | 'local' | 'nlp'
// options: { tone, design, maxSlides, emphasis }
const isAvailable = await summarizerOrchestrator.checkLocalLLM();
```

### Individual summarizers

```typescript
// LLMSummarizer — OpenAI API
const slides = await llmSummarizer.summarize(articles, options);

// LocalSummarizer — Ollama
const isAvailable = await localSummarizer.checkConnection();
const slides = await localSummarizer.summarize(articles, options);

// TemplateSummarizer — rule-based, no LLM
const slides = await templateSummarizer.summarize(articles, options);
```

---

## Renderer (`src/renderer/`)

### DesignLoader (`design-loader.ts`)

```typescript
const design = await designLoader.load('broadsheet'); // or 'industrial'
```

### HtmlBuilder (`html-builder.ts`)

```typescript
const html = await htmlBuilder.buildSlide(slide, design);
```

### ScreenshotRenderer (`screenshot.ts`)

```typescript
const imagePaths = await screenshotRenderer.renderSlides(slides, designName, outputDir);
await screenshotRenderer.close(); // always close after use
```

---

## Utils (`src/utils/`)

### Logger (`logger.ts`)

```typescript
logger.error('Error message');
logger.warn('Warning message');
logger.info('Info message');
logger.debug('Debug message'); // only shown if LOG_LEVEL=debug
logger.success('Success message');
logger.step('Step message');
```

### Config (`config.ts`)

```typescript
config.openai.apiKey
config.ollama.host        // default: http://localhost:11434
config.ollama.model       // default: llama3.2:1b
config.scraping.timeout
config.scraping.retries
config.scraping.userAgent
config.clustering.threshold
config.clustering.minGroupSize
config.image.quality
config.image.format
config.image.width
config.image.height
config.paths.data
config.paths.output
// see data.md for full paths list
```

---

## Command Pattern

All commands follow this structure:

```typescript
import { logger } from '../utils/logger.js';
import ora from 'ora';

export async function commandName(args, options) {
  // 1. Validate input
  if (!args.requiredParam) {
    logger.error('Missing required parameter');
    process.exit(1);
  }

  // 2. Load data with spinner
  const spinner = ora('Loading...').start();
  await manifestManager.load();
  spinner.succeed('Loaded');

  // 3. Process
  try {
    const result = await someModule.process(data);
    logger.success('Done');
  } catch (error) {
    logger.error((error as Error).message);
    process.exit(1);
  }

  // 4. Save and update manifest
  await someStorage.save(result);
  await manifestManager.save();

  // 5. Show next steps
  logger.info('Next: npm run next-command');
}
```

## Common Patterns

### Interactive confirmation

```typescript
import inquirer from 'inquirer';

const { confirmed } = await inquirer.prompt([{
  type: 'confirm',
  name: 'confirmed',
  message: 'Proceed?',
  default: true,
}]);
if (!confirmed) process.exit(0);
```

### Table output

```typescript
import Table from 'cli-table3';

const table = new Table({ head: ['ID', 'Title', 'Status'], colWidths: [12, 50, 15] });
table.push([item.id, item.title, item.status]);
console.log(table.toString());
```

### Error with context

```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error(`Operation failed: ${(error as Error).message}`);
  if ((error as Error).message.includes('API key')) {
    logger.info('Set OPENAI_API_KEY in .env file');
  }
  process.exit(1);
}
```

## Important Notes

- Always call `await manifestManager.save()` after manifest mutations
- Always call `await scraperOrchestrator.cleanup()` after scraping
- Always call `await screenshotRenderer.close()` after rendering
- `data/` and `output/` are gitignored — do not commit generated data
- CSS lint errors in HTML templates are expected (Handlebars variables)
- Ollama must be running for `--method=local`: `ollama serve`
