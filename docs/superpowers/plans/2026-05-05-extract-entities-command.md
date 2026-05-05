# Extract Entities Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `src/commands/extract-entities.ts` — a command that extracts named entities from article bodies with three input modes (single, batch, interactive) and per-article overwrite confirmation.

**Architecture:** Resolve a list of article IDs via one of three modes, then loop through them — checking for existing entities and prompting before overwriting — extracting via `entityExtractor`, saving via `entityStorage`, and printing a summary. The spinner is stopped before any inquirer prompt and restarted after.

**Tech Stack:** TypeScript, inquirer v13, ora v9, entityExtractor (compromise), entityStorage, articleStorage, manifestManager, logger.

---

### Task 1: Implement `formatSummary` pure helper (TDD)

**Files:**
- Modify: `src/commands/extract-entities.ts`
- Test: `src/commands/extract-entities.test.ts`

This helper formats the single-article output block. Pure function, easy to test in isolation.

- [ ] **Step 1: Write the failing test**

Create `src/commands/extract-entities.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatSingleArticleSummary } from './extract-entities.js';

describe('formatSingleArticleSummary', () => {
  it('prints all entity categories with counts', () => {
    const result = formatSingleArticleSummary('Biden climate plan', {
      people: ['Biden', 'Kerry', 'Buttigieg'],
      places: ['United States', 'Washington'],
      organizations: ['White House'],
      events: ['climate summit announced'],
    });
    expect(result).toContain('Biden climate plan');
    expect(result).toContain('People (3)');
    expect(result).toContain('Places (2)');
    expect(result).toContain('Organizations (1)');
    expect(result).toContain('Events (1)');
    expect(result).toContain('Biden, Kerry, Buttigieg');
  });

  it('shows up to 5 values per category', () => {
    const result = formatSingleArticleSummary('title', {
      people: ['A', 'B', 'C', 'D', 'E', 'F'],
      places: [],
      organizations: [],
      events: [],
    });
    expect(result).toContain('People (6)');
    // only first 5 names shown
    expect(result).toContain('A, B, C, D, E');
    expect(result).not.toContain('F');
  });

  it('omits categories with zero entities', () => {
    const result = formatSingleArticleSummary('title', {
      people: ['Biden'],
      places: [],
      organizations: [],
      events: [],
    });
    expect(result).not.toContain('Places');
    expect(result).not.toContain('Organizations');
    expect(result).not.toContain('Events');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/extract-entities.test.ts
```

Expected: FAIL — `formatSingleArticleSummary` is not exported.

- [ ] **Step 3: Implement `formatSingleArticleSummary` in extract-entities.ts**

Replace the contents of `src/commands/extract-entities.ts` with:

```typescript
import { logger } from '../utils/logger.js';

interface EntitySet {
  people: string[];
  places: string[];
  organizations: string[];
  events: string[];
}

export function formatSingleArticleSummary(title: string, entities: EntitySet): string {
  const lines: string[] = [`\nExtracted entities from: ${title}`];
  const categories: [keyof EntitySet, string][] = [
    ['people', 'People'],
    ['places', 'Places'],
    ['organizations', 'Organizations'],
    ['events', 'Events'],
  ];
  for (const [key, label] of categories) {
    const items = entities[key];
    if (items.length === 0) continue;
    const preview = items.slice(0, 5).join(', ');
    lines.push(`  ${label} (${items.length}): ${preview}`);
  }
  return lines.join('\n');
}

export async function extractEntitiesCommand(articleId: string, options: Record<string, unknown>): Promise<void> {
  logger.warn('Command not yet implemented');
  void options;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/extract-entities.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/gandolh/projects/newspapper && git add src/commands/extract-entities.ts src/commands/extract-entities.test.ts && git commit -m "feat: add formatSingleArticleSummary helper for extract-entities"
```

---

### Task 2: Implement article ID resolution

**Files:**
- Modify: `src/commands/extract-entities.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/commands/extract-entities.test.ts`:

```typescript
import { formatAggregateSummary } from './extract-entities.js';

describe('formatAggregateSummary', () => {
  it('returns unique counts across all entity records', () => {
    const records = [
      { people: ['Biden', 'Kerry'], places: ['Washington'], organizations: [], events: [] },
      { people: ['Biden', 'Pelosi'], places: ['New York'], organizations: ['Congress'], events: [] },
    ];
    const result = formatAggregateSummary(records);
    expect(result).toContain('Unique people: 3');
    expect(result).toContain('Unique places: 2');
    expect(result).toContain('Unique organizations: 1');
    expect(result).toContain('Unique events: 0');
  });

  it('handles empty input', () => {
    const result = formatAggregateSummary([]);
    expect(result).toContain('Unique people: 0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/extract-entities.test.ts
```

Expected: FAIL — `formatAggregateSummary` is not exported.

- [ ] **Step 3: Implement `formatAggregateSummary` in extract-entities.ts**

Add this function after `formatSingleArticleSummary` in `src/commands/extract-entities.ts`:

```typescript
export function formatAggregateSummary(entitySets: EntitySet[]): string {
  const unique = {
    people: new Set<string>(),
    places: new Set<string>(),
    organizations: new Set<string>(),
    events: new Set<string>(),
  };
  for (const set of entitySets) {
    for (const p of set.people) unique.people.add(p.toLowerCase());
    for (const p of set.places) unique.places.add(p.toLowerCase());
    for (const o of set.organizations) unique.organizations.add(o.toLowerCase());
    for (const e of set.events) unique.events.add(e.toLowerCase());
  }
  return [
    '\nEntity extraction summary:',
    `  Unique people: ${unique.people.size}`,
    `  Unique places: ${unique.places.size}`,
    `  Unique organizations: ${unique.organizations.size}`,
    `  Unique events: ${unique.events.size}`,
  ].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/extract-entities.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/gandolh/projects/newspapper && git add src/commands/extract-entities.ts src/commands/extract-entities.test.ts && git commit -m "feat: add formatAggregateSummary helper for extract-entities"
```

---

### Task 3: Implement full `extractEntitiesCommand`

**Files:**
- Modify: `src/commands/extract-entities.ts`

- [ ] **Step 1: Replace the imports and `extractEntitiesCommand` stub**

Replace the top of `src/commands/extract-entities.ts` (the import line and the stub function, keeping `formatSingleArticleSummary` and `formatAggregateSummary`) with:

```typescript
import { manifestManager } from '../storage/manifest.js';
import { articleStorage } from '../storage/articles.js';
import { entityStorage } from '../storage/entities.js';
import { entityExtractor } from '../nlp/entity-extractor.js';
import { logger } from '../utils/logger.js';
import ora from 'ora';
import inquirer from 'inquirer';
```

Then replace the `extractEntitiesCommand` stub at the bottom of the file with:

```typescript
interface ExtractEntitiesOptions {
  method?: string;
  all?: boolean;
}

export async function extractEntitiesCommand(articleId: string | undefined, options: ExtractEntitiesOptions): Promise<void> {
  await manifestManager.load();

  let articleIds: string[];

  if (articleId) {
    articleIds = [articleId];
  } else if (options.all) {
    const entries = await manifestManager.getArticlesByStatus('scraped');
    if (entries.length === 0) {
      logger.warn('No scraped articles found for entity extraction');
      process.exit(0);
    }
    logger.info(`Extracting entities from ${entries.length} articles`);
    articleIds = entries.map(e => e.id);
  } else {
    const entries = await manifestManager.getArticlesByStatus('scraped');
    if (entries.length === 0) {
      logger.warn('No scraped articles found');
      process.exit(0);
    }
    const { selected } = await inquirer.prompt<{ selected: string[] }>([{
      type: 'checkbox',
      name: 'selected',
      message: 'Select articles to extract entities from:',
      choices: entries.map(e => ({ name: e.title, value: e.id })),
    }]);
    if (selected.length === 0) {
      logger.warn('No articles selected');
      process.exit(0);
    }
    articleIds = selected;
  }

  const method = options.method ?? 'compromise';
  const spinner = ora('Extracting entities...').start();
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const extractedSets: EntitySet[] = [];

  for (let i = 0; i < articleIds.length; i++) {
    const id = articleIds[i];
    spinner.text = `Extracting entities (${i + 1}/${articleIds.length})...`;

    try {
      const article = await articleStorage.load(id);
      if (!article) {
        logger.warn(`Article ${id} not found`);
        failed++;
        continue;
      }

      const existing = await entityStorage.load(id);
      if (existing) {
        spinner.stop();
        const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([{
          type: 'confirm',
          name: 'overwrite',
          message: `"${article.title}" already has entities. Overwrite?`,
          default: false,
        }]);
        spinner.start();
        if (!overwrite) {
          skipped++;
          continue;
        }
      }

      const entities = await entityExtractor.extract(article.body, method);
      await entityStorage.save(id, { method, entities });
      extractedSets.push(entities);
      processed++;
    } catch (err) {
      logger.warn(`Failed to extract entities from ${id}: ${(err as Error).message}`);
      failed++;
    }
  }

  const skippedFailed = [
    skipped > 0 ? `${skipped} skipped` : '',
    failed > 0 ? `${failed} failed` : '',
  ].filter(Boolean).join(', ');

  spinner.succeed(`Extracted entities from ${processed} article${processed !== 1 ? 's' : ''}${skippedFailed ? ` (${skippedFailed})` : ''}`);

  if (failed > 0) {
    logger.warn(`Failed to process ${failed} article${failed !== 1 ? 's' : ''}`);
  }

  if (articleIds.length === 1 && extractedSets.length === 1 && articleId) {
    const article = await articleStorage.load(articleId);
    if (article) {
      console.log(formatSingleArticleSummary(article.title, extractedSets[0]));
    }
  } else if (extractedSets.length > 0) {
    console.log(formatAggregateSummary(extractedSets));
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/gandolh/projects/newspapper && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Run full test suite**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
cd /home/gandolh/projects/newspapper && git add src/commands/extract-entities.ts && git commit -m "feat: implement extractEntitiesCommand with interactive selection and overwrite confirmation"
```

---

### Task 4: Final cleanup

**Files:**
- Delete: `docs/todos/03-extract-entities-command.md`

- [ ] **Step 1: Confirm CLI registration in index.ts**

```bash
cd /home/gandolh/projects/newspapper && grep -A 10 "\.command('extract-entities')" src/index.ts
```

Expected: `[article-id]` argument, `--method`, `--all` options, calls `extractEntitiesCommand`.

- [ ] **Step 2: Run full test suite one final time**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 3: Remove the todo file**

```bash
rm /home/gandolh/projects/newspapper/docs/todos/03-extract-entities-command.md
```

- [ ] **Step 4: Final commit**

```bash
cd /home/gandolh/projects/newspapper && git add -A && git commit -m "feat: complete extract-entities command implementation"
```
