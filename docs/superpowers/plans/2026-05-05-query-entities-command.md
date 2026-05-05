# Query Entities Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `src/commands/query-entities.ts` — searches articles by entity name/type with a results table, groups summary, and optional related entities and timeline blocks.

**Architecture:** Add `getAll()` to `ManifestManager`, add `--related`/`--timeline` flags to `index.ts`, then implement the command in four phases: validate → filter by date → search entities → display. Pure formatting helpers are tested in isolation.

**Tech Stack:** TypeScript, cli-table3, date-fns, entityStorage, articleStorage, groupStorage, manifestManager, logger.

---

### Task 1: Add `getAll()` to ManifestManager (TDD)

**Files:**
- Modify: `src/storage/manifest.ts`
- Test: `src/storage/manifest.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/storage/manifest.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ManifestManager } from './manifest.js';

describe('ManifestManager.getAll', () => {
  let manager: ManifestManager;

  beforeEach(() => {
    manager = new ManifestManager();
    // Inject manifest directly via the load path by casting
    (manager as unknown as { manifest: unknown }).manifest = {
      version: '1.0.0',
      articles: {
        'abc': { id: 'abc', title: 'Test', sourceId: 's1', scrapedAt: '2026-05-01T00:00:00.000Z', status: 'scraped', groupId: null, hasEntities: false },
      },
      groups: {},
      summaries: {},
    };
  });

  it('returns all articles map', () => {
    const { articles } = manager.getAll();
    expect(Object.keys(articles)).toHaveLength(1);
    expect(articles['abc'].title).toBe('Test');
  });

  it('returns empty articles when manifest not loaded', () => {
    const fresh = new ManifestManager();
    const { articles } = fresh.getAll();
    expect(articles).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/storage/manifest.test.ts
```

Expected: FAIL — `getAll` is not a function.

- [ ] **Step 3: Add `getAll()` to ManifestManager**

In `src/storage/manifest.ts`, add this method inside the `ManifestManager` class, just before the closing `}` of the class (before line 235):

```typescript
  getAll(): { articles: Record<string, ArticleEntry> } {
    return { articles: this.manifest?.articles ?? {} };
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/storage/manifest.test.ts
```

Expected: All 2 tests PASS.

---

### Task 2: Add `--related` and `--timeline` flags to index.ts

**Files:**
- Modify: `src/index.ts:44-54`

- [ ] **Step 1: Update the query-entities command registration**

Replace the `query-entities` block in `src/index.ts` (lines 45–54):

```typescript
program
  .command('query-entities')
  .description('Search for articles by entity')
  .requiredOption('--type <type>', 'Entity type: person, place, organization, event')
  .requiredOption('--name <name>', 'Entity name to search for')
  .option('--days <number>', 'Look back N days', parseInt, 30)
  .option('--related', 'Show frequently mentioned related entities')
  .option('--timeline', 'Show ASCII article timeline')
  .action(async (options) => {
    const { queryEntitiesCommand } = await import('./commands/query-entities.js');
    await queryEntitiesCommand(options);
  });
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/gandolh/projects/newspapper && npx tsc --noEmit
```

Expected: No errors.

---

### Task 3: Implement pure formatting helpers (TDD)

**Files:**
- Modify: `src/commands/query-entities.ts`
- Test: `src/commands/query-entities.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/commands/query-entities.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatRelated, formatTimeline } from './query-entities.js';

describe('formatRelated', () => {
  it('shows top 10 related entities per non-empty category, excluding the searched name', () => {
    const results = [
      {
        articleId: '1',
        matches: ['Biden'],
        allEntities: {
          people: ['Biden', 'Harris', 'Blinken'],
          places: ['Washington'],
          organizations: ['Senate'],
          events: [],
        },
      },
      {
        articleId: '2',
        matches: ['Biden'],
        allEntities: {
          people: ['Biden', 'McCarthy'],
          places: ['New York'],
          organizations: ['Senate'],
          events: [],
        },
      },
    ];
    const out = formatRelated(results, 'Biden');
    expect(out).toContain('Harris');
    expect(out).toContain('Blinken');
    expect(out).toContain('McCarthy');
    expect(out).not.toContain('Biden'); // excluded
    expect(out).toContain('Washington');
    expect(out).toContain('Senate');
    expect(out).not.toContain('Events'); // empty category omitted
  });

  it('returns empty string when no related entities exist', () => {
    const results = [
      { articleId: '1', matches: ['Biden'], allEntities: { people: ['Biden'], places: [], organizations: [], events: [] } },
    ];
    expect(formatRelated(results, 'Biden')).toBe('');
  });
});

describe('formatTimeline', () => {
  it('groups by date and renders bars', () => {
    const articles = [
      { publishedAt: '2026-05-03T10:00:00.000Z', scrapedAt: '2026-05-03T10:00:00.000Z' },
      { publishedAt: '2026-05-03T12:00:00.000Z', scrapedAt: '2026-05-03T12:00:00.000Z' },
      { publishedAt: '2026-05-04T09:00:00.000Z', scrapedAt: '2026-05-04T09:00:00.000Z' },
    ];
    const out = formatTimeline(articles);
    expect(out).toContain('05/03');
    expect(out).toContain('05/04');
    expect(out).toContain('(2)');
    expect(out).toContain('(1)');
    expect(out).toContain('██');
  });

  it('falls back to scrapedAt when publishedAt is absent', () => {
    const articles = [
      { publishedAt: null, scrapedAt: '2026-05-05T10:00:00.000Z' },
    ];
    const out = formatTimeline(articles as never);
    expect(out).toContain('05/05');
  });

  it('returns empty string for empty input', () => {
    expect(formatTimeline([])).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/query-entities.test.ts
```

Expected: FAIL — `formatRelated` and `formatTimeline` not exported.

- [ ] **Step 3: Implement helpers in query-entities.ts**

Replace `src/commands/query-entities.ts` with:

```typescript
import { logger } from '../utils/logger.js';
import { format, subDays } from 'date-fns';
import Table from 'cli-table3';
import { manifestManager } from '../storage/manifest.js';
import { articleStorage } from '../storage/articles.js';
import { groupStorage } from '../storage/groups.js';
import { entityStorage } from '../storage/entities.js';

interface EntitySet {
  people: string[];
  places: string[];
  organizations: string[];
  events: string[];
}

interface SearchResult {
  articleId: string;
  matches: string[];
  allEntities: EntitySet;
}

interface ArticleLike {
  publishedAt?: string | null;
  scrapedAt: string;
}

const TYPE_MAP: Record<string, string> = {
  person: 'people',
  place: 'places',
  organization: 'organizations',
  event: 'events',
};

export function formatRelated(results: SearchResult[], searchedName: string): string {
  const unique: Record<keyof EntitySet, Set<string>> = {
    people: new Set(),
    places: new Set(),
    organizations: new Set(),
    events: new Set(),
  };

  for (const result of results) {
    for (const key of Object.keys(unique) as (keyof EntitySet)[]) {
      for (const entity of result.allEntities[key]) {
        if (entity.toLowerCase() !== searchedName.toLowerCase()) {
          unique[key].add(entity);
        }
      }
    }
  }

  const lines: string[] = [];
  const labels: [keyof EntitySet, string][] = [
    ['people', 'People'],
    ['places', 'Places'],
    ['organizations', 'Organizations'],
    ['events', 'Events'],
  ];

  for (const [key, label] of labels) {
    const items = [...unique[key]].slice(0, 10);
    if (items.length > 0) {
      lines.push(`  ${label}: ${items.join(', ')}`);
    }
  }

  if (lines.length === 0) return '';
  return '\nFrequently mentioned with:\n' + lines.join('\n');
}

export function formatTimeline(articles: ArticleLike[]): string {
  if (articles.length === 0) return '';

  const counts = new Map<string, number>();
  for (const article of articles) {
    const dateStr = article.publishedAt ?? article.scrapedAt;
    const key = format(new Date(dateStr), 'MM/dd');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  const lines = sorted.map(([date, count]) => {
    const bar = '█'.repeat(Math.min(count, 50));
    return `  ${date}: ${bar} (${count})`;
  });

  return '\nTimeline:\n' + lines.join('\n');
}

interface QueryEntitiesOptions {
  type: string;
  name: string;
  days: number;
  related?: boolean;
  timeline?: boolean;
}

export async function queryEntitiesCommand(options: QueryEntitiesOptions): Promise<void> {
  logger.warn('Command not yet implemented');
  void options;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/query-entities.test.ts
```

Expected: All 5 tests PASS.

---

### Task 4: Implement `queryEntitiesCommand`

**Files:**
- Modify: `src/commands/query-entities.ts`

- [ ] **Step 1: Replace the `queryEntitiesCommand` stub with the full implementation**

Replace the `queryEntitiesCommand` function at the bottom of `src/commands/query-entities.ts`:

```typescript
export async function queryEntitiesCommand(options: QueryEntitiesOptions): Promise<void> {
  if (!TYPE_MAP[options.type]) {
    logger.error(`Invalid type. Must be one of: ${Object.keys(TYPE_MAP).join(', ')}`);
    process.exit(1);
  }
  if (!options.name || options.name.trim().length === 0) {
    logger.error('Entity name is required');
    process.exit(1);
  }

  logger.info(`Searching for ${options.type}: "${options.name}"`);

  await manifestManager.load();
  const { articles } = manifestManager.getAll();
  const cutoff = subDays(new Date(), options.days);
  const recent = Object.values(articles).filter(
    a => new Date(a.scrapedAt) >= cutoff
  );

  logger.debug(`Searching in ${recent.length} articles from last ${options.days} days`);

  const results = await entityStorage.searchByEntity(
    TYPE_MAP[options.type],
    options.name,
    recent.map(a => a.id)
  );

  if (results.length === 0) {
    logger.warn(`No articles found mentioning ${options.type} "${options.name}"`);
    logger.info('Try:');
    logger.info('  - Using a different spelling');
    logger.info('  - Increasing --days value');
    logger.info('  - Running entity extraction first: npm run extract-entities --all');
    process.exit(0);
  }

  logger.success(`Found ${results.length} article${results.length !== 1 ? 's' : ''} mentioning "${options.name}"`);

  // Load full article data for table rendering
  const articleData = await articleStorage.loadMultiple(results.map(r => r.articleId));

  // Results table
  const table = new Table({
    head: ['Date', 'Title', 'Source', 'Matches', 'Group'],
    colWidths: [12, 45, 15, 9, 10],
  });

  for (const result of results) {
    const article = articleData.find(a => a?.id === result.articleId);
    if (!article) continue;
    const manifestEntry = articles[result.articleId];
    const groupId = manifestEntry?.groupId;
    const dateStr = article.publishedAt
      ? format(new Date(String(article.publishedAt)), 'MM/dd/yyyy')
      : '—';
    const title = article.title.length > 42
      ? article.title.slice(0, 41) + '…'
      : article.title;
    table.push([
      dateStr,
      title,
      String(article.sourceName ?? 'Unknown'),
      result.matches.length,
      groupId ? groupId.slice(0, 8) + '…' : '—',
    ]);
  }

  console.log('\n' + table.toString());

  // Groups summary
  const groupIds = new Set<string>();
  for (const result of results) {
    const groupId = articles[result.articleId]?.groupId;
    if (groupId) groupIds.add(groupId);
  }

  if (groupIds.size > 0) {
    console.log(`\nFound in ${groupIds.size} group(s):`);
    for (const groupId of groupIds) {
      const group = await groupStorage.load(groupId);
      if (group) {
        console.log(`  ${groupId.slice(0, 8)}…: ${group.articleIds.length} articles`);
      }
    }
  }

  // Optional: related entities
  if (options.related) {
    const related = formatRelated(results, options.name);
    if (related) console.log(related);
    else logger.info('No related entities found');
  }

  // Optional: timeline
  if (options.timeline) {
    const articleLikes = results
      .map(r => articleData.find(a => a?.id === r.articleId))
      .filter((a): a is NonNullable<typeof a> => a !== null && a !== undefined)
      .map(a => ({ publishedAt: a.publishedAt as string | null, scrapedAt: a.scrapedAt }));
    const timeline = formatTimeline(articleLikes);
    if (timeline) console.log(timeline);
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

---

### Task 5: Final cleanup

**Files:**
- Delete: `docs/todos/04-query-entities-command.md`

- [ ] **Step 1: Confirm CLI options in index.ts**

```bash
cd /home/gandolh/projects/newspapper && grep -A 12 "\.command('query-entities')" src/index.ts
```

Expected: `--type`, `--name`, `--days`, `--related`, `--timeline` all present.

- [ ] **Step 2: Run full test suite one final time**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 3: Remove the todo file**

```bash
rm /home/gandolh/projects/newspapper/docs/todos/04-query-entities-command.md
```
