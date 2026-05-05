# Group Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `src/commands/group.ts` — an interactive TUI command that clusters scraped articles and lets the user accept, skip, modify, merge, or stop reviewing each cluster.

**Architecture:** Load scraped articles from the manifest, run embedding or entity clustering, then loop through clusters showing a table + entities + keywords and prompting the user per cluster. Groups saved during the session feed the merge target list.

**Tech Stack:** TypeScript, inquirer v13 (ESM), ora v9, cli-table3, articleClusterer, groupStorage, manifestManager, entityStorage, logger.

---

### Task 1: Write keyword extraction utility (TDD)

**Files:**
- Modify: `src/commands/group.ts`

The keyword algorithm:
1. Flatten all entity values from `commonEntities` → entity terms (preserve original casing)
2. Tokenize all article titles: lowercase, split on `/\W+/`, filter stop words and tokens shorter than 3 chars
3. Count frequency across titles
4. Sort by frequency descending
5. Merge: entity terms first (deduplicated, case-insensitive), then fill remaining slots from title terms (skip duplicates of entity terms)
6. Cap at 10

Stop words set: `a, an, the, in, of, and, to, for, is, are, was, were, that, this, with, by, on, at, from, as, it, its, be, has, have, had, will, would, said, says, new, over, after, about, but, not, or, who, what, when, how, their, they, been, more, also, into, than, up, out, no, he, she, we, us, you, his, her, our`

- [ ] **Step 1: Write the failing test**

Create `src/commands/group.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { extractKeywords } from './group.js';

describe('extractKeywords', () => {
  it('returns entity terms first then title-derived terms, capped at 10', () => {
    const articles = [
      { id: '1', title: 'Biden announces new climate policy initiative', body: '' },
      { id: '2', title: 'White House unveils climate legislation plan', body: '' },
      { id: '3', title: 'Biden climate plan details emerge from Washington', body: '' },
    ];
    const commonEntities = {
      people: ['Biden'],
      places: ['Washington', 'United States'],
      organizations: [],
      events: [],
    };
    const keywords = extractKeywords(articles, commonEntities);
    expect(keywords).toContain('Biden');
    expect(keywords).toContain('Washington');
    expect(keywords).toContain('climate');
    expect(keywords.length).toBeLessThanOrEqual(10);
    // entity terms come before title terms
    expect(keywords.indexOf('Biden')).toBeLessThan(keywords.indexOf('climate'));
  });

  it('deduplicates entity terms and title terms case-insensitively', () => {
    const articles = [
      { id: '1', title: 'biden wins election', body: '' },
    ];
    const commonEntities = { people: ['Biden'], places: [], organizations: [], events: [] };
    const keywords = extractKeywords(articles, commonEntities);
    const bidenCount = keywords.filter(k => k.toLowerCase() === 'biden').length;
    expect(bidenCount).toBe(1);
  });

  it('caps at 10 keywords', () => {
    const articles = [
      { id: '1', title: 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda', body: '' },
    ];
    const commonEntities = { people: [], places: [], organizations: [], events: [] };
    const keywords = extractKeywords(articles, commonEntities);
    expect(keywords.length).toBeLessThanOrEqual(10);
  });

  it('handles empty entities and titles gracefully', () => {
    const articles = [{ id: '1', title: '', body: '' }];
    const commonEntities = { people: [], places: [], organizations: [], events: [] };
    expect(extractKeywords(articles, commonEntities)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/group.test.ts
```

Expected: FAIL — `extractKeywords` is not exported from `group.ts`.

- [ ] **Step 3: Implement `extractKeywords` in group.ts**

Replace the contents of `src/commands/group.ts` with:

```typescript
import { logger } from '../utils/logger.js';

interface Article {
  id: string;
  title: string;
  body: string;
  [key: string]: unknown;
}

interface EntitySet {
  people: string[];
  places: string[];
  organizations: string[];
  events: string[];
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'of', 'and', 'to', 'for', 'is', 'are', 'was',
  'were', 'that', 'this', 'with', 'by', 'on', 'at', 'from', 'as', 'it',
  'its', 'be', 'has', 'have', 'had', 'will', 'would', 'said', 'says',
  'new', 'over', 'after', 'about', 'but', 'not', 'or', 'who', 'what',
  'when', 'how', 'their', 'they', 'been', 'more', 'also', 'into', 'than',
  'up', 'out', 'no', 'he', 'she', 'we', 'us', 'you', 'his', 'her', 'our',
]);

export function extractKeywords(articles: Article[], commonEntities: EntitySet): string[] {
  const entityTerms = [
    ...commonEntities.people,
    ...commonEntities.places,
    ...commonEntities.organizations,
    ...commonEntities.events,
  ];

  const entityLower = new Set(entityTerms.map(e => e.toLowerCase()));

  const freq = new Map<string, number>();
  for (const article of articles) {
    const tokens = article.title.toLowerCase().split(/\W+/).filter(
      t => t.length >= 3 && !STOP_WORDS.has(t) && !entityLower.has(t)
    );
    for (const token of tokens) {
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
  }

  const titleTerms = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term);

  const result: string[] = [];
  const seen = new Set<string>();

  for (const term of entityTerms) {
    if (!seen.has(term.toLowerCase())) {
      seen.add(term.toLowerCase());
      result.push(term);
      if (result.length === 10) return result;
    }
  }

  for (const term of titleTerms) {
    if (!seen.has(term.toLowerCase())) {
      seen.add(term.toLowerCase());
      result.push(term);
      if (result.length === 10) return result;
    }
  }

  return result;
}

export async function groupCommand(options: Record<string, unknown>): Promise<void> {
  logger.warn('Command not yet implemented');
  void options;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/group.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/gandolh/projects/newspapper && git add src/commands/group.ts src/commands/group.test.ts && git commit -m "feat: add extractKeywords utility for group command"
```

---

### Task 2: Implement the display helpers (table + entities + keywords)

**Files:**
- Modify: `src/commands/group.ts`

These are pure display functions — no side effects, easy to reason about separately.

- [ ] **Step 1: Write the failing test**

Add to `src/commands/group.test.ts`:

```typescript
import { renderClusterHeader, renderEntitiesAndKeywords } from './group.js';

describe('renderClusterHeader', () => {
  it('returns a formatted header string', () => {
    const out = renderClusterHeader(3, 10, 4);
    expect(out).toContain('Group 3/10');
    expect(out).toContain('4 articles');
  });
});

describe('renderEntitiesAndKeywords', () => {
  it('returns empty string when no entities and no keywords', () => {
    const entities = { people: [], places: [], organizations: [], events: [] };
    const result = renderEntitiesAndKeywords(entities, []);
    expect(result).toBe('');
  });

  it('includes people and places when present', () => {
    const entities = { people: ['Biden'], places: ['Washington'], organizations: [], events: [] };
    const result = renderEntitiesAndKeywords(entities, ['climate', 'policy']);
    expect(result).toContain('Biden');
    expect(result).toContain('Washington');
    expect(result).toContain('climate, policy');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/group.test.ts
```

Expected: FAIL — `renderClusterHeader` and `renderEntitiesAndKeywords` not exported.

- [ ] **Step 3: Implement display helpers in group.ts**

Add these exported functions after `extractKeywords` in `src/commands/group.ts`:

```typescript
export function renderClusterHeader(index: number, total: number, articleCount: number): string {
  const sep = '='.repeat(60);
  return `\n${sep}\nGroup ${index}/${total} — ${articleCount} articles\n${sep}`;
}

export function renderEntitiesAndKeywords(entities: EntitySet, keywords: string[]): string {
  const lines: string[] = [];
  const hasEntities =
    entities.people.length > 0 ||
    entities.places.length > 0 ||
    entities.organizations.length > 0 ||
    entities.events.length > 0;

  if (hasEntities) {
    lines.push('\nCommon entities:');
    if (entities.people.length > 0) lines.push(`  People: ${entities.people.join(', ')}`);
    if (entities.places.length > 0) lines.push(`  Places: ${entities.places.join(', ')}`);
    if (entities.organizations.length > 0) lines.push(`  Organizations: ${entities.organizations.join(', ')}`);
    if (entities.events.length > 0) lines.push(`  Events: ${entities.events.join(', ')}`);
  }

  if (keywords.length > 0) {
    lines.push(`\nKeywords: ${keywords.join(', ')}`);
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/group.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/gandolh/projects/newspapper && git add src/commands/group.ts src/commands/group.test.ts && git commit -m "feat: add cluster display helpers for group command"
```

---

### Task 3: Implement `groupCommand` — load & cluster phase

**Files:**
- Modify: `src/commands/group.ts`

- [ ] **Step 1: Add imports to group.ts**

Replace the import block at the top of `src/commands/group.ts` with:

```typescript
import { manifestManager } from '../storage/manifest.js';
import { articleStorage } from '../storage/articles.js';
import { groupStorage } from '../storage/groups.js';
import { entityStorage } from '../storage/entities.js';
import { articleClusterer } from '../nlp/clustering.js';
import { logger } from '../utils/logger.js';
import ora from 'ora';
import Table from 'cli-table3';
import inquirer from 'inquirer';
```

- [ ] **Step 2: Add GroupCommandOptions interface and update groupCommand signature**

Replace the `groupCommand` stub with:

```typescript
interface GroupCommandOptions {
  threshold?: number;
  method?: string;
  minGroupSize?: number;
}

export async function groupCommand(options: GroupCommandOptions): Promise<void> {
  await manifestManager.load();
  const ungroupedEntries = await manifestManager.getArticlesByStatus('scraped');

  if (ungroupedEntries.length === 0) {
    logger.warn('No ungrouped articles found');
    logger.info('Run "npm run scrape" first to fetch articles');
    process.exit(0);
  }

  logger.info(`Found ${ungroupedEntries.length} ungrouped articles`);

  const articles = await articleStorage.loadMultiple(ungroupedEntries.map(a => a.id));
  const validArticles = articles.filter((a): a is NonNullable<typeof a> => a !== null);

  if (validArticles.length === 0) {
    logger.error('Could not load article data');
    process.exit(1);
  }

  const spinner = ora('Clustering articles...').start();

  let clusters;
  try {
    if (options.method === 'entities') {
      clusters = await articleClusterer.clusterByEntities(validArticles, entityStorage);
    } else {
      clusters = await articleClusterer.clusterArticles(validArticles, options.threshold ?? null);
    }
  } catch (err) {
    spinner.fail('Clustering failed');
    logger.error((err as Error).message);
    process.exit(1);
  }

  spinner.succeed(`Created ${clusters.length} potential groups`);

  if (clusters.length === 0) {
    logger.warn('No clusters formed. Try lowering the threshold.');
    process.exit(0);
  }

  // Review loop handled in next task — placeholder
  logger.info(`${clusters.length} clusters ready for review`);
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/gandolh/projects/newspapper && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Run existing tests to confirm no regressions**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/gandolh/projects/newspapper && git add src/commands/group.ts && git commit -m "feat: implement load and cluster phase of group command"
```

---

### Task 4: Implement the TUI review loop — accept, skip, stop

**Files:**
- Modify: `src/commands/group.ts`

- [ ] **Step 1: Replace the placeholder comment in `groupCommand` with the review loop**

Replace the lines from `// Review loop handled in next task — placeholder` to the end of `groupCommand` with:

```typescript
  const savedGroups: Awaited<ReturnType<typeof groupStorage.save>>[] = [];
  const minGroupSize = options.minGroupSize ?? 2;

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];

    console.log(renderClusterHeader(i + 1, clusters.length, cluster.articles.length));

    // Table
    const table = new Table({ head: ['#', 'Title', 'Source', 'Date'], colWidths: [4, 48, 20, 13] });
    for (const [idx, article] of cluster.articles.entries()) {
      const title = article.title.length > 45 ? article.title.slice(0, 44) + '…' : article.title;
      const source = String(article.sourceName ?? 'Unknown');
      const date = article.publishedAt ? new Date(String(article.publishedAt)).toLocaleDateString() : '—';
      table.push([idx + 1, title, source, date]);
    }
    console.log(table.toString());

    // Entities + keywords
    const emptyEntities = { people: [], places: [], organizations: [], events: [] };
    const entities = cluster.commonEntities ?? emptyEntities;
    const keywords = extractKeywords(cluster.articles, entities);
    console.log(renderEntitiesAndKeywords(entities, keywords));

    const { action } = await inquirer.prompt<{ action: string }>([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do with this group?',
      choices: [
        { name: 'Accept and save', value: 'accept' },
        { name: 'Skip (don\'t save)', value: 'skip' },
        { name: 'Remove articles from group', value: 'remove' },
        { name: 'Merge with previous group', value: 'merge' },
        { name: 'Stop reviewing', value: 'stop' },
      ],
    }]);

    if (action === 'stop') break;

    if (action === 'skip') continue;

    if (action === 'accept') {
      const group = await groupStorage.save({
        articleIds: cluster.articleIds,
        threshold: options.threshold,
        centroid: cluster.centroid,
        commonEntities: entities,
      });
      savedGroups.push(group);
      logger.success(`Saved group ${group.id}`);
      continue;
    }

    if (action === 'remove') {
      const { articlesToRemove } = await inquirer.prompt<{ articlesToRemove: string[] }>([{
        type: 'checkbox',
        name: 'articlesToRemove',
        message: 'Select articles to remove:',
        choices: cluster.articles.map((a, idx) => ({ name: `${idx + 1}. ${a.title}`, value: a.id })),
      }]);

      const remaining = cluster.articles.filter(a => !articlesToRemove.includes(a.id));
      if (remaining.length >= minGroupSize) {
        const group = await groupStorage.save({
          articleIds: remaining.map(a => a.id),
          threshold: options.threshold,
          centroid: cluster.centroid,
          commonEntities: entities,
        });
        savedGroups.push(group);
        logger.success(`Saved modified group ${group.id}`);
      } else {
        logger.warn('Too few articles remaining, group not saved');
      }
      continue;
    }

    if (action === 'merge') {
      await handleMerge(cluster.articles, savedGroups);
    }
  }

  const finalGroups = await manifestManager.getGroupsByStatus('draft');
  logger.success(`\nGrouping complete! Created ${finalGroups.length} group(s)`);
  logger.info('Next: npm run summarize <group-id>');
}
```

- [ ] **Step 2: Add `handleMerge` function above `groupCommand`**

Add this function above the `groupCommand` function (after the display helpers):

```typescript
async function handleMerge(
  clusterArticles: Article[],
  savedGroups: { id: string; articleIds: string[] }[]
): Promise<void> {
  if (savedGroups.length === 0) {
    logger.warn('No groups saved yet in this session — nothing to merge into');
    return;
  }

  const groupChoices = savedGroups.map(g => ({
    name: `${g.articleIds.length} articles — ID: ${g.id.slice(0, 8)}…`,
    value: g.id,
  }));
  groupChoices.push({ name: 'Other (enter ID manually)', value: '__other__' });

  const { targetId } = await inquirer.prompt<{ targetId: string }>([{
    type: 'list',
    name: 'targetId',
    message: 'Merge into which group?',
    choices: groupChoices,
  }]);

  let resolvedId = targetId;
  if (targetId === '__other__') {
    const { manualId } = await inquirer.prompt<{ manualId: string }>([{
      type: 'input',
      name: 'manualId',
      message: 'Enter group ID:',
      validate: (v: string) => v.trim().length > 0 || 'ID cannot be empty',
    }]);
    resolvedId = manualId.trim();

    const existing = await groupStorage.load(resolvedId);
    if (!existing) {
      logger.warn(`Group ${resolvedId} not found — merge aborted`);
      return;
    }
  }

  for (const article of clusterArticles) {
    await groupStorage.addArticleToGroup(resolvedId, article.id);
    await manifestManager.updateArticleStatus(article.id, 'grouped');
  }
  logger.success(`Merged ${clusterArticles.length} article(s) into group ${resolvedId}`);
}
```

- [ ] **Step 3: Update the Article interface to include sourceName and publishedAt**

The `Article` interface in group.ts uses `[key: string]: unknown` for extra fields. The table renders `article.sourceName` and `article.publishedAt`. Since they are covered by the index signature, no change is needed — the cast `String(article.sourceName ?? 'Unknown')` handles it safely.

Verify TypeScript compiles:

```bash
cd /home/gandolh/projects/newspapper && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Run all tests**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/gandolh/projects/newspapper && git add src/commands/group.ts && git commit -m "feat: implement TUI review loop for group command"
```

---

### Task 5: Final cleanup — remove the todo file and update docs

**Files:**
- Delete: `docs/todos/02-group-command.md`
- Verify: `src/commands/group.ts` is complete

- [ ] **Step 1: Confirm the command is registered correctly in index.ts**

```bash
cd /home/gandolh/projects/newspapper && grep -A 10 "\.command('group')" src/index.ts
```

Expected: Options `--threshold`, `--method`, `--min-group-size` are wired and call `groupCommand`.

- [ ] **Step 2: Run the full test suite one final time**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 3: Remove the todo file**

```bash
rm /home/gandolh/projects/newspapper/docs/todos/02-group-command.md
```

- [ ] **Step 4: Final commit**

```bash
cd /home/gandolh/projects/newspapper && git add -A && git commit -m "feat: complete group command implementation"
```
