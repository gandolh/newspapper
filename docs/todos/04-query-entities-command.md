# TODO: Implement Query Entities Command

**File:** `src/commands/query-entities.js`

## Overview
Search for articles and groups by entity name and type, with timeline visualization.

## Implementation Details

### 1. Command Function Signature
```javascript
export async function queryEntitiesCommand(options) {
  // options.type - entity type: person, place, organization, event
  // options.name - entity name to search for
  // options.days - look back N days
}
```

### 2. Required Imports
```javascript
import { manifestManager } from '../storage/manifest.js';
import { articleStorage } from '../storage/articles.js';
import { groupStorage } from '../storage/groups.js';
import { entityStorage } from '../storage/entities.js';
import { logger } from '../utils/logger.js';
import Table from 'cli-table3';
import { subDays, format } from 'date-fns';
```

### 3. Implementation Steps

#### Step 1: Validate Input
```javascript
const validTypes = ['person', 'place', 'organization', 'event'];
const typeMap = {
  person: 'people',
  place: 'places',
  organization: 'organizations',
  event: 'events'
};

if (!validTypes.includes(options.type)) {
  logger.error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
  process.exit(1);
}

if (!options.name || options.name.trim().length === 0) {
  logger.error('Entity name is required');
  process.exit(1);
}

const entityType = typeMap[options.type];
logger.info(`Searching for ${options.type}: "${options.name}"`);
```

#### Step 2: Filter Articles by Date
```javascript
await manifestManager.load();
const allArticles = Object.values(manifestManager.manifest.articles);

const cutoffDate = subDays(new Date(), options.days);
const recentArticles = allArticles.filter(article => {
  const articleDate = new Date(article.scrapedAt);
  return articleDate >= cutoffDate;
});

logger.debug(`Searching in ${recentArticles.length} articles from last ${options.days} days`);
```

#### Step 3: Search Entities
```javascript
const results = await entityStorage.searchByEntity(
  entityType,
  options.name,
  recentArticles.map(a => a.id)
);

if (results.length === 0) {
  logger.warn(`No articles found mentioning ${options.type} "${options.name}"`);
  logger.info('Try:');
  logger.info('  - Using a different spelling');
  logger.info('  - Increasing --days value');
  logger.info('  - Running entity extraction first: npm run extract-entities --all');
  process.exit(0);
}

logger.success(`Found ${results.length} articles mentioning "${options.name}"`);
```

#### Step 4: Display Results
```javascript
// Load full article data
const articleData = await articleStorage.loadMultiple(
  results.map(r => r.articleId)
);

// Create table
const table = new Table({
  head: ['Date', 'Title', 'Source', 'Matches', 'Group'],
  colWidths: [12, 45, 15, 10, 10]
});

for (const result of results) {
  const article = articleData.find(a => a.id === result.articleId);
  if (!article) continue;
  
  const manifestArticle = manifestManager.manifest.articles[result.articleId];
  const groupId = manifestArticle?.groupId || '-';
  
  table.push([
    format(new Date(article.publishedAt), 'MM/dd/yyyy'),
    article.title.slice(0, 42) + '...',
    article.sourceName || 'Unknown',
    result.matches.length,
    groupId ? groupId.slice(0, 8) : '-'
  ]);
}

console.log('\n' + table.toString());
```

#### Step 5: Show Related Entities
```javascript
// Aggregate all entities from matching articles
const relatedEntities = {
  people: new Set(),
  places: new Set(),
  organizations: new Set(),
  events: new Set()
};

for (const result of results) {
  Object.keys(relatedEntities).forEach(type => {
    result.allEntities[type].forEach(entity => {
      // Don't include the searched entity itself
      if (entity.toLowerCase() !== options.name.toLowerCase()) {
        relatedEntities[type].add(entity);
      }
    });
  });
}

console.log('\nFrequently mentioned with:');
if (relatedEntities.people.size > 0) {
  console.log(`  People: ${Array.from(relatedEntities.people).slice(0, 10).join(', ')}`);
}
if (relatedEntities.places.size > 0) {
  console.log(`  Places: ${Array.from(relatedEntities.places).slice(0, 10).join(', ')}`);
}
if (relatedEntities.organizations.size > 0) {
  console.log(`  Organizations: ${Array.from(relatedEntities.organizations).slice(0, 10).join(', ')}`);
}
```

#### Step 6: Show Groups
```javascript
// Find groups containing these articles
const groupIds = new Set();
results.forEach(result => {
  const article = manifestManager.manifest.articles[result.articleId];
  if (article?.groupId) {
    groupIds.add(article.groupId);
  }
});

if (groupIds.size > 0) {
  console.log(`\nFound in ${groupIds.size} group(s):`);
  for (const groupId of groupIds) {
    const group = await groupStorage.load(groupId);
    if (group) {
      const groupArticles = await articleStorage.loadMultiple(group.articleIds);
      console.log(`  ${groupId.slice(0, 8)}: ${groupArticles.length} articles`);
    }
  }
}
```

#### Step 7: Timeline Visualization
```javascript
// Create simple ASCII timeline
console.log('\nTimeline:');
const dateGroups = {};
results.forEach(result => {
  const article = articleData.find(a => a.id === result.articleId);
  if (article) {
    const dateKey = format(new Date(article.publishedAt), 'MM/dd');
    dateGroups[dateKey] = (dateGroups[dateKey] || 0) + 1;
  }
});

const sortedDates = Object.keys(dateGroups).sort();
sortedDates.forEach(date => {
  const count = dateGroups[date];
  const bar = '█'.repeat(Math.min(count, 50));
  console.log(`  ${date}: ${bar} (${count})`);
});
```

### 4. Error Handling
- Handle missing entity data gracefully
- Validate date ranges
- Handle malformed entity names
- Catch storage errors

### 5. Edge Cases
- No entities extracted yet → show helpful message
- Entity name with special characters → handle properly
- Very common entity (e.g., "US") → limit results
- No articles in date range → adjust suggestion

### 6. Testing
```bash
# Search for person
npm run query-entities --type=person --name="Biden"

# Search with different time range
npm run query-entities --type=person --name="Biden" --days=7

# Search for place
npm run query-entities --type=place --name="Ukraine"

# Search for organization
npm run query-entities --type=organization --name="NATO"

# Search for event
npm run query-entities --type=event --name="Summit"
```

### 7. Expected Output
```
ℹ Searching for person: "Biden"
✓ Found 8 articles mentioning "Biden"

┌────────────┬───────────────────────────────────────────────┬───────────┬─────────┬────────┐
│ Date       │ Title                                         │ Source    │ Matches │ Group  │
├────────────┼───────────────────────────────────────────────┼───────────┼─────────┼────────┤
│ 05/04/2026 │ Biden announces new climate policy...        │ Guardian  │ 3       │ abc123 │
│ 05/04/2026 │ White House unveils climate initiative...    │ NYT       │ 2       │ abc123 │
│ 05/03/2026 │ Biden meets with European leaders...         │ Reuters   │ 4       │ def456 │
└────────────┴───────────────────────────────────────────────┴───────────┴─────────┴────────┘

Frequently mentioned with:
  People: Harris, Blinken, McCarthy
  Places: Washington, White House, United States
  Organizations: White House, Democratic Party, Senate

Found in 2 group(s):
  abc123: 4 articles
  def456: 3 articles

Timeline:
  05/03: ███ (3)
  05/04: █████ (5)
```

### 8. Files to Create/Modify
- Create: `src/commands/query-entities.js`
- Ensure: Entity storage search works
- Test: Different entity types

### 9. Dependencies Used
- `cli-table3` - Table formatting
- `date-fns` - Date manipulation
- `entityStorage` - Entity search

### 10. Notes
- Consider adding export to CSV
- Add option to show full article text
- Implement fuzzy matching for names
- Add option to search multiple entities
- Consider adding sentiment analysis
