# TODO: Implement Group Command

**File:** `src/commands/group.js`

## Overview
Implement the group command that clusters similar articles using embeddings or entity-based methods, with interactive TUI for review.

## Implementation Details

### 1. Command Function Signature
```javascript
export async function groupCommand(options) {
  // options.threshold - similarity threshold (0.0-1.0)
  // options.method - clustering method: embeddings, entities
  // options.minGroupSize - minimum articles per group
}
```

### 2. Required Imports
```javascript
import { manifestManager } from '../storage/manifest.js';
import { articleStorage } from '../storage/articles.js';
import { groupStorage } from '../storage/groups.js';
import { entityStorage } from '../storage/entities.js';
import { articleClusterer } from '../nlp/clustering.js';
import { logger } from '../utils/logger.js';
import inquirer from 'inquirer';
import ora from 'ora';
import Table from 'cli-table3';
```

### 3. Implementation Steps

#### Step 1: Load Ungrouped Articles
```javascript
await manifestManager.load();
const ungroupedArticles = await manifestManager.getArticlesByStatus('scraped');

if (ungroupedArticles.length === 0) {
  logger.warn('No ungrouped articles found');
  logger.info('Run "npm run scrape" first to fetch articles');
  process.exit(0);
}

logger.info(`Found ${ungroupedArticles.length} ungrouped articles`);

// Load full article data
const articles = await articleStorage.loadMultiple(
  ungroupedArticles.map(a => a.id)
);
```

#### Step 2: Perform Clustering
```javascript
const spinner = ora('Clustering articles...').start();

let clusters;
if (options.method === 'entities') {
  // Entity-based clustering
  clusters = await articleClusterer.clusterByEntities(articles, entityStorage);
} else {
  // Embedding-based clustering (default)
  clusters = await articleClusterer.clusterArticles(articles, options.threshold);
}

spinner.succeed(`Created ${clusters.length} potential groups`);

if (clusters.length === 0) {
  logger.warn('No clusters formed. Try lowering the threshold.');
  process.exit(0);
}
```

#### Step 3: Interactive Review
```javascript
logger.info('Review and approve groups:');

for (let i = 0; i < clusters.length; i++) {
  const cluster = clusters[i];
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Group ${i + 1}/${clusters.length} - ${cluster.articles.length} articles`);
  console.log('='.repeat(60));
  
  // Show articles in table
  const table = new Table({
    head: ['#', 'Title', 'Source', 'Date'],
    colWidths: [5, 50, 20, 15]
  });
  
  cluster.articles.forEach((article, idx) => {
    table.push([
      idx + 1,
      article.title.slice(0, 47) + '...',
      article.sourceName || 'Unknown',
      new Date(article.publishedAt).toLocaleDateString()
    ]);
  });
  
  console.log(table.toString());
  
  // Show common entities if available
  if (cluster.commonEntities) {
    console.log('\nCommon entities:');
    if (cluster.commonEntities.people.length > 0) {
      console.log(`  People: ${cluster.commonEntities.people.join(', ')}`);
    }
    if (cluster.commonEntities.places.length > 0) {
      console.log(`  Places: ${cluster.commonEntities.places.join(', ')}`);
    }
  }
  
  // Ask user what to do
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'What would you like to do with this group?',
    choices: [
      { name: 'Accept and save', value: 'accept' },
      { name: 'Skip (don\'t save)', value: 'skip' },
      { name: 'Remove articles from group', value: 'remove' },
      { name: 'Merge with previous group', value: 'merge' },
      { name: 'Stop reviewing', value: 'stop' }
    ]
  }]);
  
  if (action === 'stop') {
    break;
  }
  
  if (action === 'accept') {
    // Save group
    const group = await groupStorage.save({
      articleIds: cluster.articleIds,
      threshold: options.threshold,
      centroid: cluster.centroid,
      commonEntities: cluster.commonEntities
    });
    logger.success(`Saved group ${group.id}`);
  }
  
  if (action === 'remove') {
    // Let user select articles to remove
    const { articlesToRemove } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'articlesToRemove',
      message: 'Select articles to remove:',
      choices: cluster.articles.map((a, idx) => ({
        name: `${idx + 1}. ${a.title}`,
        value: a.id
      }))
    }]);
    
    const remainingArticles = cluster.articles.filter(
      a => !articlesToRemove.includes(a.id)
    );
    
    if (remainingArticles.length >= options.minGroupSize) {
      const group = await groupStorage.save({
        articleIds: remainingArticles.map(a => a.id),
        threshold: options.threshold,
        centroid: cluster.centroid,
        commonEntities: cluster.commonEntities
      });
      logger.success(`Saved modified group ${group.id}`);
    } else {
      logger.warn('Too few articles remaining, group not saved');
    }
  }
  
  if (action === 'merge') {
    // Implement merge logic with previous saved group
    logger.info('Merge functionality to be implemented');
  }
}
```

#### Step 4: Summary
```javascript
const savedGroups = await manifestManager.getGroupsByStatus('draft');
logger.success(`\nGrouping complete! Created ${savedGroups.length} groups`);
logger.info('Next: npm run summarize <group-id>');
```

### 4. Error Handling
- Handle embedding generation failures
- Catch clustering errors
- Validate user input in prompts
- Handle Ctrl+C gracefully

### 5. Edge Cases
- No articles to group → show helpful message
- All articles too dissimilar → no groups formed
- Single article groups → skip or allow based on minGroupSize
- User cancels mid-review → save progress so far

### 6. Testing
```bash
# Test with default settings
npm run group

# Test with different threshold
npm run group --threshold=0.8

# Test entity-based clustering
npm run group --method=entities

# Test with higher minimum group size
npm run group --min-group-size=3
```

### 7. Expected Output
```
ℹ Found 35 ungrouped articles
✓ Created 8 potential groups

Review and approve groups:
============================================================
Group 1/8 - 4 articles
============================================================
┌───┬──────────────────────────────────────────────┬──────────┬─────────────┐
│ # │ Title                                        │ Source   │ Date        │
├───┼──────────────────────────────────────────────┼──────────┼─────────────┤
│ 1 │ Biden announces new climate policy...       │ Guardian │ 5/4/2026    │
│ 2 │ White House unveils climate initiative...   │ NYT      │ 5/4/2026    │
│ 3 │ US climate policy shift announced...        │ BBC      │ 5/4/2026    │
│ 4 │ Biden's climate plan details emerge...      │ Reuters  │ 5/4/2026    │
└───┴──────────────────────────────────────────────┴──────────┴─────────────┘

Common entities:
  People: Biden
  Places: United States, Washington

? What would you like to do with this group? (Use arrow keys)
❯ Accept and save
  Skip (don't save)
  Remove articles from group
  Merge with previous group
  Stop reviewing
```

### 8. Files to Create/Modify
- Create: `src/commands/group.js`
- Ensure: Clustering module works
- Test: Embeddings generation, entity extraction

### 9. Dependencies Used
- `inquirer` - Interactive prompts
- `cli-table3` - Table formatting
- `ora` - Progress spinner
- `articleClusterer` - Clustering logic

### 10. Notes
- Consider adding auto-save every N groups
- Add option to preview group before accepting
- Implement undo functionality
- Consider showing similarity scores
- Add option to manually create groups
