# Implementation Guide for AI Assistants

## Quick Context

You're working on **Newspapper**, a CLI news aggregation tool. The project is **fully scaffolded** but needs **command implementations**.

## Your Task

Implement the 9 CLI commands in `src/commands/`. Each command has a detailed guide in `docs/todos/`.

## Implementation Order

Follow this sequence for a working end-to-end flow:

1. **scrape.js** - Start here, it's the entry point
2. **list.js** - Useful for debugging
3. **group.js** - Most complex, interactive TUI
4. **summarize.js** - LLM integration
5. **generate.js** - Image rendering
6. **export.js** - Package creation
7. **extract-entities.js** - Optional NLP
8. **query-entities.js** - Entity search
9. **clean.js** - Maintenance

## Before You Start

### Read These Files

1. `docs/todos/{command-name}.md` - Your implementation guide
2. `docs/architecture.md` - System design
3. `.claude/project-overview.md` - High-level context

### Understand the Modules

All the heavy lifting is done by existing modules:

```javascript
// Storage - already implemented
import { manifestManager } from "../storage/manifest.js";
import { articleStorage } from "../storage/articles.js";
import { groupStorage } from "../storage/groups.js";
import { summaryStorage } from "../storage/summaries.js";
import { entityStorage } from "../storage/entities.js";
import { sourceManager } from "../storage/sources.js";

// Processing - already implemented
import { scraperOrchestrator } from "../scrapers/index.js";
import { articleClusterer } from "../nlp/clustering.js";
import { entityExtractor } from "../nlp/entity-extractor.js";
import { summarizerOrchestrator } from "../summarizers/index.js";
import { screenshotRenderer } from "../renderer/screenshot.js";

// Utilities - already implemented
import { logger } from "../utils/logger.js";
import { config } from "../utils/config.js";
```

Your job is to **orchestrate these modules** in the command handlers.

## Command Template

Every command follows this pattern:

```javascript
import { logger } from "../utils/logger.js";
import ora from "ora";

export async function commandName(args, options) {
  // 1. Validate input
  if (!args.requiredParam) {
    logger.error("Missing required parameter");
    process.exit(1);
  }

  // 2. Load data
  const spinner = ora("Loading...").start();
  const data = await someStorage.load(args.id);
  spinner.succeed("Loaded");

  // 3. Process
  try {
    const result = await someModule.process(data);
    logger.success("Processing complete");
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }

  // 4. Save results
  await someStorage.save(result);

  // 5. Show next steps
  logger.info("Next: npm run next-command");
}
```

## Key Patterns

### Loading Manifest

```javascript
import { manifestManager } from "../storage/manifest.js";

await manifestManager.load();
const articles = await manifestManager.getArticlesByStatus("scraped");
```

### Progress Spinners

```javascript
import ora from "ora";

const spinner = ora("Processing...").start();
// ... do work ...
spinner.succeed("Done");
// or
spinner.fail("Failed");
```

### Interactive Prompts

```javascript
import inquirer from "inquirer";

const { confirm } = await inquirer.prompt([
  {
    type: "confirm",
    name: "confirm",
    message: "Proceed?",
    default: true,
  },
]);
```

### Tables

```javascript
import Table from "cli-table3";

const table = new Table({
  head: ["Column 1", "Column 2"],
  colWidths: [30, 50],
});

table.push(["Value 1", "Value 2"]);
console.log(table.toString());
```

### Error Handling

```javascript
try {
  await riskyOperation();
} catch (error) {
  logger.error(`Operation failed: ${error.message}`);

  // Provide helpful context
  if (error.message.includes("API key")) {
    logger.info("Set OPENAI_API_KEY in .env file");
  }

  process.exit(1);
}
```

## Testing Your Implementation

### 1. Create Test Data

Add a test source to `data/sources.json`:

```json
[
  {
    "id": "test-source",
    "name": "Test News",
    "url": "https://example.com",
    "rss": "https://example.com/rss",
    "scraperType": "rss",
    "enabled": true
  }
]
```

### 2. Test Each Command

```bash
# Test scraping
npm run scrape --sources=test-source

# Test listing
npm run list --type=articles

# Test grouping
npm run group --threshold=0.75

# Test summarization (use template method first)
npm run summarize <group-id> --method=nlp

# Test generation
npm run generate <group-id>

# Test export
npm run export <group-id>
```

### 3. Verify Outputs

Check these directories:

- `data/articles/` - Article JSON files
- `data/groups/` - Group JSON files
- `data/summaries/` - Summary JSON files
- `output/{group-id}/slides/` - PNG images
- `data/manifest.json` - Updated index

## Common Issues

### Issue: Module not found

**Solution**: Check import paths are correct (use `.js` extension)

### Issue: Manifest not updating

**Solution**: Call `await manifestManager.save()` after changes

### Issue: Ollama connection refused

**Solution**: User needs to run `ollama serve` first

### Issue: Playwright fails

**Solution**: User needs to run `npx playwright install chromium`

### Issue: CSS lint errors in templates

**Solution**: Ignore them - they're from Handlebars variables

## Code Style

- Use ES modules (`import`/`export`)
- Use async/await (no callbacks)
- Use destructuring for options
- Use template literals for strings
- Use `logger` for all output (not `console.log`)
- Handle errors gracefully
- Provide helpful error messages
- Show next steps after completion

## Don't Forget

- Update manifest status after operations
- Close resources (Playwright browser, etc.)
- Show progress for long operations
- Validate user input
- Handle Ctrl+C gracefully
- Test with edge cases (empty data, missing files, etc.)

## Getting Help

If you're stuck:

1. Read the TODO guide for that command
2. Check the architecture docs
3. Look at similar storage/processing modules
4. Check the existing module implementations in `src/`

## Success Criteria

A command is complete when:

- ✅ It runs without errors
- ✅ It handles edge cases gracefully
- ✅ It updates the manifest correctly
- ✅ It provides helpful output
- ✅ It shows next steps
- ✅ It can be tested end-to-end

Good luck! Start with `scrape.js` and work your way through the list.
