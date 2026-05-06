# List Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `src/commands/list.ts` — a command that lists articles, groups, or summaries from the manifest, with optional filtering by status/source/days, outputting either a cli-table3 table or raw JSON.

**Architecture:** Three pure helpers handle the testable logic: `filterByDays` keeps only entries newer than N days, `filterArticlesBySource` matches article entries against a source name using a sources lookup, and `formatStats` builds the footer summary string. The command itself loads the manifest, optionally loads sources, runs filters, then either outputs JSON or builds a cli-table3 table.

**Tech Stack:** TypeScript, cli-table3, manifestManager, sourceManager, logger.

---

### Task 1: Implement `filterByDays` and `filterArticlesBySource` pure helpers (TDD)

**Files:**
- Modify: `src/commands/list.ts`
- Create: `src/commands/list.test.ts`

- [ ] **Step 1: Create the failing test**

Create `src/commands/list.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { filterByDays, filterArticlesBySource } from './list.js';

interface Entry { id: string; date: string; [key: string]: unknown; }

describe('filterByDays', () => {
  const now = new Date('2026-05-06T00:00:00Z');
  const entries: Entry[] = [
    { id: 'a1', date: '2026-04-01T00:00:00Z' },
    { id: 'a2', date: '2026-05-01T00:00:00Z' },
    { id: 'a3', date: '2026-05-05T00:00:00Z' },
  ];

  it('returns entries from within the last N days', () => {
    const result = filterByDays(entries, 7, now);
    expect(result.map(e => e.id)).toEqual(['a2', 'a3']);
  });

  it('returns all entries when days is large', () => {
    const result = filterByDays(entries, 365, now);
    expect(result).toHaveLength(3);
  });

  it('returns empty when no entries are recent enough', () => {
    const result = filterByDays(entries, 1, now);
    expect(result.map(e => e.id)).toEqual(['a3']);
  });
});

interface ArticleEntry extends Entry {
  sourceId: string;
}
interface SourceLike { id: string; name: string; }

describe('filterArticlesBySource', () => {
  const articles: ArticleEntry[] = [
    { id: 'a1', date: '2026-05-01', sourceId: 'src-guardian' },
    { id: 'a2', date: '2026-05-01', sourceId: 'src-nyt' },
    { id: 'a3', date: '2026-05-01', sourceId: 'src-guardian' },
  ];
  const sources: SourceLike[] = [
    { id: 'src-guardian', name: 'Guardian' },
    { id: 'src-nyt', name: 'NYT' },
  ];

  it('filters articles to those matching source name (case-insensitive)', () => {
    const result = filterArticlesBySource(articles, 'guardian', sources);
    expect(result.map(a => a.id)).toEqual(['a1', 'a3']);
  });

  it('returns empty when no source matches', () => {
    const result = filterArticlesBySource(articles, 'bbc', sources);
    expect(result).toHaveLength(0);
  });

  it('returns all articles when sourceName is undefined', () => {
    const result = filterArticlesBySource(articles, undefined, sources);
    expect(result).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/list.test.ts 2>&1
```

Expected: FAIL — `filterByDays` and `filterArticlesBySource` are not functions.

- [ ] **Step 3: Implement helpers in list.ts**

Replace contents of `src/commands/list.ts` with:

```typescript
import { logger } from '../utils/logger.js';

interface Entry { id: string; date: string; [key: string]: unknown; }
interface ArticleEntry extends Entry { sourceId: string; }
interface SourceLike { id: string; name: string; }

export function filterByDays(entries: Entry[], days: number, now: Date = new Date()): Entry[] {
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return entries.filter(e => new Date(e.date).getTime() >= cutoff.getTime());
}

export function filterArticlesBySource(
  articles: ArticleEntry[],
  sourceName: string | undefined,
  sources: SourceLike[]
): ArticleEntry[] {
  if (!sourceName) return articles;
  const matched = sources.find(s => s.name.toLowerCase() === sourceName.toLowerCase());
  if (!matched) return [];
  return articles.filter(a => a.sourceId === matched.id);
}

export async function listCommand(options: Record<string, unknown>): Promise<void> {
  logger.warn('Command not yet implemented');
  void options;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/list.test.ts 2>&1
```

Expected: All 6 tests PASS.

---

### Task 2: Implement `formatStats` pure helper (TDD)

**Files:**
- Modify: `src/commands/list.ts`
- Modify: `src/commands/list.test.ts`

`formatStats` builds the one-line footer shown after the table.

- [ ] **Step 1: Add the failing test**

Append to `src/commands/list.test.ts`:

```typescript
import { formatStats } from './list.js';

describe('formatStats', () => {
  it('reports count and type', () => {
    const result = formatStats(5, 'articles');
    expect(result).toContain('5');
    expect(result).toContain('articles');
  });

  it('reports zero correctly', () => {
    const result = formatStats(0, 'groups');
    expect(result).toContain('0');
    expect(result).toContain('groups');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/list.test.ts 2>&1
```

Expected: FAIL — `formatStats` is not a function.

- [ ] **Step 3: Implement `formatStats` in list.ts**

Add after `filterArticlesBySource` and before `listCommand`:

```typescript
export function formatStats(count: number, type: string): string {
  return `Total: ${count} ${type}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/list.test.ts 2>&1
```

Expected: All 8 tests PASS.

---

### Task 3: Implement full `listCommand`

**Files:**
- Modify: `src/commands/list.ts`

- [ ] **Step 1: Replace list.ts with full implementation**

Replace the entire contents of `src/commands/list.ts` with:

```typescript
import Table from 'cli-table3';
import { logger } from '../utils/logger.js';
import { manifestManager } from '../storage/manifest.js';
import { sourceManager } from '../storage/sources.js';

interface Entry { id: string; date: string; [key: string]: unknown; }
interface ArticleEntry extends Entry { sourceId: string; }
interface SourceLike { id: string; name: string; }

export function filterByDays(entries: Entry[], days: number, now: Date = new Date()): Entry[] {
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return entries.filter(e => new Date(e.date).getTime() >= cutoff.getTime());
}

export function filterArticlesBySource(
  articles: ArticleEntry[],
  sourceName: string | undefined,
  sources: SourceLike[]
): ArticleEntry[] {
  if (!sourceName) return articles;
  const matched = sources.find(s => s.name.toLowerCase() === sourceName.toLowerCase());
  if (!matched) return [];
  return articles.filter(a => a.sourceId === matched.id);
}

export function formatStats(count: number, type: string): string {
  return `Total: ${count} ${type}`;
}

interface ListOptions {
  type?: string;
  status?: string;
  source?: string;
  days?: number;
  format?: string;
}

export async function listCommand(options: ListOptions): Promise<void> {
  const type = options.type ?? 'groups';
  const manifest = await manifestManager.load();

  if (type === 'articles') {
    const sources = await sourceManager.getAll();

    let entries = Object.values(manifest.articles).map(a => ({
      id: a.id,
      date: a.scrapedAt,
      sourceId: a.sourceId,
      title: a.title,
      status: a.status,
      groupId: a.groupId,
      hasEntities: a.hasEntities,
    }));

    if (options.status) entries = entries.filter(a => a.status === options.status);
    if (options.source) entries = filterArticlesBySource(entries, options.source, sources) as typeof entries;
    if (options.days) entries = filterByDays(entries, options.days) as typeof entries;

    if (options.format === 'json') {
      console.log(JSON.stringify(entries, null, 2));
      return;
    }

    if (entries.length === 0) { logger.info('No articles found.'); return; }

    const table = new Table({ head: ['Date', 'Title', 'Source', 'Status', 'Group', 'Entities'], colWidths: [12, 40, 15, 10, 10, 10] });
    for (const a of entries) {
      const src = sources.find(s => s.id === a.sourceId)?.name ?? 'Unknown';
      const date = new Date(a.date).toLocaleDateString();
      const title = a.title.length > 37 ? a.title.slice(0, 36) + '…' : a.title;
      table.push([date, title, src, a.status, a.groupId ? a.groupId.slice(0, 8) + '…' : '—', a.hasEntities ? 'yes' : 'no']);
    }
    console.log(table.toString());
    console.log(formatStats(entries.length, 'articles'));

  } else if (type === 'groups') {
    let entries = Object.values(manifest.groups).map(g => ({
      id: g.id,
      date: g.createdAt,
      status: g.status,
      articleCount: g.articleIds.length,
      summaryId: g.summaryId,
    }));

    if (options.status) entries = entries.filter(g => g.status === options.status);
    if (options.days) entries = filterByDays(entries, options.days) as typeof entries;

    if (options.format === 'json') {
      console.log(JSON.stringify(entries, null, 2));
      return;
    }

    if (entries.length === 0) { logger.info('No groups found.'); return; }

    const table = new Table({ head: ['Date', 'ID', 'Status', 'Articles', 'Summary'], colWidths: [12, 12, 12, 10, 12] });
    for (const g of entries) {
      table.push([
        new Date(g.date).toLocaleDateString(),
        g.id.slice(0, 8) + '…',
        g.status,
        g.articleCount,
        g.summaryId ? g.summaryId.slice(0, 8) + '…' : '—',
      ]);
    }
    console.log(table.toString());
    console.log(formatStats(entries.length, 'groups'));

  } else if (type === 'summaries') {
    let entries = Object.values(manifest.summaries).map(s => ({
      id: s.id,
      date: s.createdAt,
      status: s.status,
      groupId: s.groupId,
      method: s.method,
      tone: s.tone,
      design: s.design,
    }));

    if (options.status) entries = entries.filter(s => s.status === options.status);
    if (options.days) entries = filterByDays(entries, options.days) as typeof entries;

    if (options.format === 'json') {
      console.log(JSON.stringify(entries, null, 2));
      return;
    }

    if (entries.length === 0) { logger.info('No summaries found.'); return; }

    const table = new Table({ head: ['Date', 'ID', 'Group', 'Method', 'Tone', 'Status'], colWidths: [12, 12, 12, 10, 12, 12] });
    for (const s of entries) {
      table.push([
        new Date(s.date).toLocaleDateString(),
        s.id.slice(0, 8) + '…',
        s.groupId.slice(0, 8) + '…',
        s.method,
        s.tone,
        s.status,
      ]);
    }
    console.log(table.toString());
    console.log(formatStats(entries.length, 'summaries'));

  } else {
    logger.error(`Unknown type: "${type}". Use: articles, groups, summaries`);
    process.exit(1);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/gandolh/projects/newspapper && npx tsc --noEmit 2>&1
```

Expected: No errors.

- [ ] **Step 3: Run full test suite**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run 2>&1
```

Expected: All tests PASS (including the 8 in list.test.ts).

---

### Task 4: Final cleanup

- [ ] **Step 1: Verify CLI registration in index.ts**

```bash
grep -A 10 "\.command('list')" /home/gandolh/projects/newspapper/src/index.ts
```

Expected: `--type`, `--status`, `--source`, `--days`, `--format` options, calls `listCommand`.

- [ ] **Step 2: Remove the todo file**

```bash
rm /home/gandolh/projects/newspapper/docs/todos/09-list-command.md
```
