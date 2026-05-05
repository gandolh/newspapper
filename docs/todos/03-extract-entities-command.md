# TODO: Implement Extract Entities Command

**File:** `src/commands/extract-entities.js`

## Overview
Extract named entities (people, places, organizations, events) from articles using compromise or transformers.

## Implementation Details

### 1. Command Function Signature
```javascript
export async function extractEntitiesCommand(articleId, options) {
  // articleId - specific article ID (optional if --all)
  // options.method - extraction method: compromise, transformers
  // options.all - extract from all ungrouped articles
}
```

### 2. Required Imports
```javascript
import { manifestManager } from '../storage/manifest.js';
import { articleStorage } from '../storage/articles.js';
import { entityStorage } from '../storage/entities.js';
import { entityExtractor } from '../nlp/entity-extractor.js';
import { logger } from '../utils/logger.js';
import ora from 'ora';
```

### 3. Implementation Steps

#### Step 1: Determine Articles to Process
```javascript
let articleIds = [];

if (options.all) {
  // Extract from all scraped articles
  await manifestManager.load();
  const articles = await manifestManager.getArticlesByStatus('scraped');
  articleIds = articles.map(a => a.id);
  
  if (articleIds.length === 0) {
    logger.warn('No articles found for entity extraction');
    process.exit(0);
  }
  
  logger.info(`Extracting entities from ${articleIds.length} articles`);
} else if (articleId) {
  // Extract from specific article
  articleIds = [articleId];
} else {
  logger.error('Please provide an article ID or use --all flag');
  process.exit(1);
}
```

#### Step 2: Extract Entities
```javascript
const spinner = ora('Extracting entities...').start();
let processed = 0;
let failed = 0;

for (const id of articleIds) {
  try {
    spinner.text = `Extracting entities (${processed + 1}/${articleIds.length})...`;
    
    // Load article
    const article = await articleStorage.load(id);
    if (!article) {
      logger.warn(`Article ${id} not found`);
      failed++;
      continue;
    }
    
    // Extract entities
    const entities = await entityExtractor.extract(
      article.body,
      options.method
    );
    
    // Save entities
    await entityStorage.save(id, {
      method: options.method,
      entities
    });
    
    processed++;
    
    // Log summary for single article
    if (!options.all) {
      logger.info(`\nExtracted entities from: ${article.title}`);
      console.log(`  People: ${entities.people.length}`);
      console.log(`  Places: ${entities.places.length}`);
      console.log(`  Organizations: ${entities.organizations.length}`);
      console.log(`  Events: ${entities.events.length}`);
      
      if (entities.people.length > 0) {
        console.log(`\n  Top people: ${entities.people.slice(0, 5).join(', ')}`);
      }
      if (entities.places.length > 0) {
        console.log(`  Top places: ${entities.places.slice(0, 5).join(', ')}`);
      }
    }
    
  } catch (error) {
    logger.error(`Failed to extract entities from ${id}: ${error.message}`);
    failed++;
  }
}

spinner.succeed(`Extracted entities from ${processed} articles`);

if (failed > 0) {
  logger.warn(`Failed to process ${failed} articles`);
}
```

#### Step 3: Summary Statistics
```javascript
if (options.all) {
  // Show aggregate statistics
  logger.info('\nEntity extraction summary:');
  
  const allEntities = await entityStorage.loadMultiple(articleIds);
  const stats = {
    people: new Set(),
    places: new Set(),
    organizations: new Set(),
    events: new Set()
  };
  
  allEntities.forEach(entityData => {
    if (entityData) {
      entityData.entities.people.forEach(p => stats.people.add(p));
      entityData.entities.places.forEach(p => stats.places.add(p));
      entityData.entities.organizations.forEach(o => stats.organizations.add(o));
      entityData.entities.events.forEach(e => stats.events.add(e));
    }
  });
  
  console.log(`  Unique people: ${stats.people.size}`);
  console.log(`  Unique places: ${stats.places.size}`);
  console.log(`  Unique organizations: ${stats.organizations.size}`);
  console.log(`  Unique events: ${stats.events.size}`);
}

logger.info('Entity extraction complete');
```

### 4. Error Handling
- Handle missing articles gracefully
- Continue processing if one article fails
- Validate article ID format
- Handle NLP library errors

### 5. Edge Cases
- Article with no extractable entities → save empty entities
- Very long articles → truncate or process in chunks
- Non-English articles → log warning
- Already extracted entities → ask to overwrite or skip

### 6. Testing
```bash
# Extract from specific article
npm run extract-entities abc-123-def

# Extract from all articles
npm run extract-entities --all

# Use transformers method
npm run extract-entities --all --method=transformers

# Extract from single article with transformers
npm run extract-entities abc-123 --method=transformers
```

### 7. Expected Output
```
ℹ Extracting entities from 35 articles
✓ Extracted entities from 35 articles

Entity extraction summary:
  Unique people: 127
  Unique places: 45
  Unique organizations: 38
  Unique events: 23
ℹ Entity extraction complete
```

### 8. Files to Create/Modify
- Create: `src/commands/extract-entities.js`
- Ensure: Entity extractor module works
- Test: Both compromise and transformers methods

### 9. Dependencies Used
- `ora` - Progress spinner
- `entityExtractor` - NLP extraction
- `entityStorage` - Saving entities

### 10. Notes
- Consider adding `--overwrite` flag to re-extract
- Add progress bar for large batches
- Consider caching extracted entities
- Add option to export entities to CSV
- Implement entity deduplication/normalization
