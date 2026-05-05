# TODO: Implement Scrape Command

**File:** `src/commands/scrape.js`

## Overview
Implement the scrape command that fetches articles from configured news sources using HTTP, Playwright, or RSS methods.

## Implementation Details

### 1. Command Function Signature
```javascript
export async function scrapeCommand(options) {
  // options.sources - comma-separated source IDs/names (optional)
  // options.method - force scraper method: http, playwright, rss (optional)
  // options.limit - max articles per source (optional)
}
```

### 2. Required Imports
```javascript
import { sourceManager } from '../storage/sources.js';
import { articleStorage } from '../storage/articles.js';
import { scraperOrchestrator } from '../scrapers/index.js';
import { rssFeedParser } from '../scrapers/rss-parser.js';
import { logger } from '../utils/logger.js';
import ora from 'ora';
```

### 3. Implementation Steps

#### Step 1: Load and Filter Sources
```javascript
await sourceManager.load();
let sources = await sourceManager.getEnabled();

// If --sources specified, filter
if (options.sources) {
  const requestedSources = options.sources.split(',').map(s => s.trim());
  sources = sources.filter(source => 
    requestedSources.includes(source.id) || 
    requestedSources.includes(source.name)
  );
}

if (sources.length === 0) {
  logger.error('No sources found or enabled');
  process.exit(1);
}

logger.info(`Scraping ${sources.length} source(s)`);
```

#### Step 2: Process Each Source
```javascript
const spinner = ora('Scraping articles...').start();
let totalArticles = 0;

for (const source of sources) {
  spinner.text = `Scraping ${source.name}...`;
  
  try {
    let articles = [];
    
    // If source has RSS and no method forced, try RSS first
    if (source.rss && !options.method) {
      try {
        const feed = await rssFeedParser.parse(source.rss);
        articles = feed.articles;
        logger.debug(`Found ${articles.length} articles from RSS`);
      } catch (rssError) {
        logger.warn(`RSS failed for ${source.name}, falling back to scraping`);
      }
    }
    
    // If no articles from RSS or method is forced, scrape individual pages
    if (articles.length === 0 || options.method) {
      // Get article URLs (from RSS or source.url)
      const urls = articles.length > 0 
        ? articles.map(a => a.url) 
        : [source.url]; // Or implement URL discovery
      
      articles = [];
      for (const url of urls.slice(0, options.limit || 10)) {
        try {
          const article = await scraperOrchestrator.scrapeArticle(url, source);
          articles.push(article);
        } catch (error) {
          logger.warn(`Failed to scrape ${url}: ${error.message}`);
        }
      }
    }
    
    // Save articles
    for (const articleData of articles) {
      const article = await articleStorage.save({
        ...articleData,
        sourceId: source.id,
        sourceName: source.name
      });
      totalArticles++;
      logger.debug(`Saved article: ${article.title}`);
    }
    
    logger.success(`${source.name}: ${articles.length} articles`);
    
  } catch (error) {
    logger.error(`Failed to scrape ${source.name}: ${error.message}`);
  }
}

spinner.succeed(`Scraped ${totalArticles} articles from ${sources.length} sources`);
```

#### Step 3: Cleanup
```javascript
// Close Playwright browser if used
await scraperOrchestrator.cleanup();

logger.info('Scraping complete');
```

### 4. Error Handling
- Handle network timeouts gracefully
- Continue processing other sources if one fails
- Log all errors but don't crash
- Show progress with ora spinner

### 5. Edge Cases
- No sources configured → show helpful error
- All sources disabled → show error
- Invalid source names in --sources → warn and skip
- RSS feed empty → fallback to scraping
- Rate limiting → implement delays between requests

### 6. Testing
```bash
# Test with all sources
npm run scrape

# Test with specific sources
npm run scrape --sources=guardian,nytimes

# Test with forced method
npm run scrape --method=playwright --sources=wsj

# Test with limit
npm run scrape --limit=5
```

### 7. Expected Output
```
ℹ Scraping 3 source(s)
✓ The Guardian: 12 articles
✓ New York Times: 8 articles
✓ BBC News: 15 articles
✓ Scraped 35 articles from 3 sources
ℹ Scraping complete
```

### 8. Files to Create/Modify
- Create: `src/commands/scrape.js`
- Ensure: All scraper modules are working
- Test: RSS parser, HTTP scraper, Playwright scraper

### 9. Dependencies Used
- `ora` - Progress spinner
- `logger` - Logging
- `sourceManager` - Source configuration
- `articleStorage` - Saving articles
- `scraperOrchestrator` - Scraping logic

### 10. Notes
- Consider adding `--dry-run` flag to test without saving
- Add `--verbose` flag for detailed logging
- Implement rate limiting if scraping many sources
- Consider parallel scraping with Promise.all() for speed
