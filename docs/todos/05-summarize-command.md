# TODO: Implement Summarize Command

**File:** `src/commands/summarize.js`

## Overview
Generate slide content from a group of articles using LLM, local LLM, or template-based methods.

## Implementation Details

### 1. Command Function Signature
```javascript
export async function summarizeCommand(groupId, options) {
  // groupId - group ID to summarize
  // options.method - summarization method: llm, local, nlp
  // options.tone - tone: optimistic, analytical
  // options.design - design system: broadsheet, industrial
  // options.maxSlides - maximum slides (default 8)
  // options.emphasis - key points to emphasize
  // options.exclude - comma-separated article IDs to exclude
}
```

### 2. Required Imports
```javascript
import { manifestManager } from '../storage/manifest.js';
import { articleStorage } from '../storage/articles.js';
import { groupStorage } from '../storage/groups.js';
import { summaryStorage } from '../storage/summaries.js';
import { sourceManager } from '../storage/sources.js';
import { summarizerOrchestrator } from '../summarizers/index.js';
import { logger } from '../utils/logger.js';
import inquirer from 'inquirer';
import ora from 'ora';
import Table from 'cli-table3';
```

### 3. Implementation Steps

#### Step 1: Load and Validate Group
```javascript
const group = await groupStorage.load(groupId);

if (!group) {
  logger.error(`Group ${groupId} not found`);
  logger.info('Run "npm run list --type=groups" to see available groups');
  process.exit(1);
}

logger.info(`Summarizing group ${groupId} with ${group.articleIds.length} articles`);

// Load articles
let articles = await articleStorage.loadMultiple(group.articleIds);

// Exclude articles if specified
if (options.exclude) {
  const excludeIds = options.exclude.split(',').map(id => id.trim());
  articles = articles.filter(a => !excludeIds.includes(a.id));
  logger.info(`Excluded ${group.articleIds.length - articles.length} articles`);
}

if (articles.length === 0) {
  logger.error('No articles remaining after exclusions');
  process.exit(1);
}
```

#### Step 2: Load Source Names
```javascript
// Add source names to articles
await sourceManager.load();
articles = articles.map(article => {
  const source = sourceManager.sources.find(s => s.id === article.sourceId);
  return {
    ...article,
    sourceName: source?.name || 'Unknown Source'
  };
});
```

#### Step 3: Show Preview
```javascript
console.log('\nArticles to summarize:');
const table = new Table({
  head: ['#', 'Title', 'Source', 'Words'],
  colWidths: [5, 50, 20, 10]
});

articles.forEach((article, idx) => {
  table.push([
    idx + 1,
    article.title.slice(0, 47) + '...',
    article.sourceName,
    article.metadata?.wordCount || '-'
  ]);
});

console.log(table.toString());

// Confirm before proceeding
const { proceed } = await inquirer.prompt([{
  type: 'confirm',
  name: 'proceed',
  message: `Summarize with ${options.method} method (${options.tone} tone)?`,
  default: true
}]);

if (!proceed) {
  logger.info('Summarization cancelled');
  process.exit(0);
}
```

#### Step 4: Check LLM Availability
```javascript
if (options.method === 'local') {
  const spinner = ora('Checking local LLM connection...').start();
  const isAvailable = await summarizerOrchestrator.checkLocalLLM();
  
  if (!isAvailable) {
    spinner.fail('Local LLM not available');
    logger.error('Make sure Ollama is running: ollama serve');
    logger.error(`And model is pulled: ollama pull ${process.env.OLLAMA_MODEL || 'llama3.2:1b'}`);
    process.exit(1);
  }
  spinner.succeed('Local LLM connected');
}
```

#### Step 5: Generate Summary
```javascript
const spinner = ora('Generating summary...').start();

try {
  const slides = await summarizerOrchestrator.summarize(
    articles,
    options.method,
    {
      tone: options.tone,
      maxSlides: options.maxSlides,
      emphasis: options.emphasis
    }
  );
  
  spinner.succeed(`Generated ${slides.length} slides`);
  
  // Save summary
  const summary = await summaryStorage.save({
    groupId,
    method: options.method,
    tone: options.tone,
    design: options.design,
    slides
  });
  
  logger.success(`Saved summary ${summary.id}`);
  
} catch (error) {
  spinner.fail('Summarization failed');
  logger.error(error.message);
  
  if (error.message.includes('API key')) {
    logger.info('Set OPENAI_API_KEY in .env file');
  }
  
  process.exit(1);
}
```

#### Step 6: Preview Slides
```javascript
console.log('\nGenerated slides:');
console.log('='.repeat(60));

slides.forEach((slide, idx) => {
  console.log(`\nSlide ${idx + 1}/${slides.length} [${slide.type}]`);
  console.log('-'.repeat(60));
  console.log(slide.text);
  
  if (slide.attribution) {
    console.log(`\n— ${slide.attribution}`);
  }
  
  if (slide.notes) {
    console.log(`\nNotes: ${slide.notes}`);
  }
});

console.log('\n' + '='.repeat(60));
```

#### Step 7: Offer Options
```javascript
const { nextAction } = await inquirer.prompt([{
  type: 'list',
  name: 'nextAction',
  message: 'What would you like to do?',
  choices: [
    { name: 'Generate images from this summary', value: 'generate' },
    { name: 'Regenerate with different settings', value: 'regenerate' },
    { name: 'Edit slides manually', value: 'edit' },
    { name: 'Done', value: 'done' }
  ]
}]);

if (nextAction === 'generate') {
  logger.info(`Run: npm run generate ${groupId}`);
} else if (nextAction === 'regenerate') {
  logger.info('Regenerate with different --method, --tone, or --emphasis');
} else if (nextAction === 'edit') {
  logger.info(`Edit: data/summaries/${summary.id}.json`);
}

logger.info('Summarization complete');
```

### 4. Error Handling
- Handle missing groups gracefully
- Catch LLM API errors
- Validate slide format from LLM
- Handle network timeouts
- Provide helpful error messages

### 5. Edge Cases
- Group with single article → still summarize
- Very long articles → truncate for LLM
- LLM returns invalid JSON → retry or fallback
- No emphasis provided → use default
- Excluded all articles → error

### 6. Testing
```bash
# Test with local LLM
npm run summarize abc-123 --method=local --tone=analytical

# Test with OpenAI
npm run summarize abc-123 --method=llm --tone=optimistic

# Test with template method (no LLM)
npm run summarize abc-123 --method=nlp

# Test with emphasis
npm run summarize abc-123 --method=local --emphasis="economic impact"

# Test with exclusions
npm run summarize abc-123 --exclude=article1,article2

# Test with different design
npm run summarize abc-123 --design=industrial
```

### 7. Expected Output
```
ℹ Summarizing group abc-123 with 4 articles

Articles to summarize:
┌───┬──────────────────────────────────────────────┬──────────┬───────┐
│ # │ Title                                        │ Source   │ Words │
├───┼──────────────────────────────────────────────┼──────────┼───────┤
│ 1 │ Biden announces new climate policy...       │ Guardian │ 1200  │
│ 2 │ White House unveils climate initiative...   │ NYT      │ 950   │
│ 3 │ US climate policy shift announced...        │ BBC      │ 800   │
│ 4 │ Biden's climate plan details emerge...      │ Reuters  │ 1100  │
└───┴──────────────────────────────────────────────┴──────────┴───────┘

? Summarize with local method (analytical tone)? Yes
✓ Local LLM connected
✓ Generated 6 slides
✓ Saved summary def-456

Generated slides:
============================================================

Slide 1/6 [title]
------------------------------------------------------------
Biden Unveils Ambitious Climate Initiative

Notes: 4 articles from Guardian, NYT, BBC, Reuters

Slide 2/6 [body]
------------------------------------------------------------
The White House announced a comprehensive climate policy...
[content continues]

============================================================

? What would you like to do? (Use arrow keys)
❯ Generate images from this summary
  Regenerate with different settings
  Edit slides manually
  Done
```

### 8. Files to Create/Modify
- Create: `src/commands/summarize.js`
- Ensure: All summarizer modules work
- Test: LLM, local, and template methods

### 9. Dependencies Used
- `inquirer` - Interactive prompts
- `ora` - Progress spinner
- `cli-table3` - Table formatting
- `summarizerOrchestrator` - Summarization logic

### 10. Notes
- Consider adding slide editing in CLI
- Add option to combine multiple groups
- Implement summary versioning
- Add option to regenerate specific slides
- Consider adding summary quality scoring
