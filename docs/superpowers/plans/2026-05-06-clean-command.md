# Clean Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `src/commands/clean.ts` — a command that deletes old articles, groups, and summaries based on age (`--older-than`) and optional status filter, with dry-run support, a confirmation prompt, and a deletion summary.

**Architecture:** Two pure helpers handle the testable logic: `parseOlderThan` converts a duration string like `"30d"` to a cutoff `Date`, and `filterDeletable` selects manifest entries that fall before the cutoff and match an optional status filter. The command then shows a preview table, optionally asks for confirmation, deletes files via storage layer `.delete()` methods, and reports how many items and how many bytes were freed.

**Tech Stack:** TypeScript, cli-table3, inquirer v13, ora v9, articleStorage, groupStorage, summaryStorage, manifestManager, config, logger.

---

### Task 1: Implement `parseOlderThan` pure helper (TDD)

**Files:**
- Modify: `src/commands/clean.ts`
- Create: `src/commands/clean.test.ts`

- [ ] **Step 1: Create the failing test**

Create `src/commands/clean.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseOlderThan } from './clean.js';

describe('parseOlderThan', () => {
  it('parses "30d" as 30 days ago', () => {
    const now = new Date('2026-05-06T12:00:00Z');
    const cutoff = parseOlderThan('30d', now);
    const expected = new Date('2026-04-06T12:00:00Z');
    expect(cutoff.getTime()).toBe(expected.getTime());
  });

  it('parses "7d" as 7 days ago', () => {
    const now = new Date('2026-05-06T00:00:00Z');
    const cutoff = parseOlderThan('7d', now);
    const expected = new Date('2026-04-29T00:00:00Z');
    expect(cutoff.getTime()).toBe(expected.getTime());
  });

  it('parses "1d" as 1 day ago', () => {
    const now = new Date('2026-05-06T00:00:00Z');
    const cutoff = parseOlderThan('1d', now);
    const expected = new Date('2026-05-05T00:00:00Z');
    expect(cutoff.getTime()).toBe(expected.getTime());
  });

  it('throws on invalid format', () => {
    expect(() => parseOlderThan('abc')).toThrow('Invalid --older-than value');
  });

  it('uses current time when no reference date provided', () => {
    const before = Date.now();
    const cutoff = parseOlderThan('0d');
    const after = Date.now();
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(before);
    expect(cutoff.getTime()).toBeLessThanOrEqual(after);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/clean.test.ts 2>&1
```

Expected: FAIL — `parseOlderThan` is not a function.

- [ ] **Step 3: Implement `parseOlderThan` in clean.ts**

Replace `src/commands/clean.ts` contents with:

```typescript
import { logger } from '../utils/logger.js';

export function parseOlderThan(value: string, now: Date = new Date()): Date {
  const match = value.match(/^(\d+)d$/);
  if (!match) throw new Error(`Invalid --older-than value: "${value}". Expected format: "30d"`);
  const days = parseInt(match[1], 10);
  const cutoff = new Date(now.getTime());
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

export async function cleanCommand(options: Record<string, unknown>): Promise<void> {
  logger.warn('Command not yet implemented');
  void options;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/clean.test.ts 2>&1
```

Expected: All 5 tests PASS.

---

### Task 2: Implement `filterDeletable` pure helper (TDD)

**Files:**
- Modify: `src/commands/clean.ts`
- Modify: `src/commands/clean.test.ts`

`filterDeletable` takes a record of manifest entries (each with `createdAt` or `scrapedAt` and `status`), a cutoff date, and an optional status filter string. Returns the entries that should be deleted.

- [ ] **Step 1: Add the failing test**

Append to `src/commands/clean.test.ts`:

```typescript
import { filterDeletable } from './clean.js';

interface Entry { id: string; date: string; status: string; }

describe('filterDeletable', () => {
  const entries: Entry[] = [
    { id: 'a1', date: '2026-01-01T00:00:00Z', status: 'scraped' },
    { id: 'a2', date: '2026-01-15T00:00:00Z', status: 'grouped' },
    { id: 'a3', date: '2026-04-20T00:00:00Z', status: 'scraped' },
    { id: 'a4', date: '2026-04-20T00:00:00Z', status: 'published' },
  ];
  const cutoff = new Date('2026-03-01T00:00:00Z');

  it('returns entries older than the cutoff', () => {
    const result = filterDeletable(entries, cutoff);
    expect(result.map(e => e.id)).toEqual(['a1', 'a2']);
  });

  it('filters by status when provided', () => {
    const result = filterDeletable(entries, cutoff, 'scraped');
    expect(result.map(e => e.id)).toEqual(['a1']);
  });

  it('returns empty array when nothing matches', () => {
    const future = new Date('2020-01-01T00:00:00Z');
    expect(filterDeletable(entries, future)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/clean.test.ts 2>&1
```

Expected: FAIL — `filterDeletable` is not a function.

- [ ] **Step 3: Implement `filterDeletable` in clean.ts**

Add after `parseOlderThan` in `src/commands/clean.ts`:

```typescript
interface DeletableEntry {
  id: string;
  date: string;
  status: string;
  [key: string]: unknown;
}

export function filterDeletable(
  entries: DeletableEntry[],
  cutoff: Date,
  statusFilter?: string
): DeletableEntry[] {
  return entries.filter(entry => {
    if (new Date(entry.date).getTime() >= cutoff.getTime()) return false;
    if (statusFilter && entry.status !== statusFilter) return false;
    return true;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/clean.test.ts 2>&1
```

Expected: All 8 tests PASS.

---

### Task 3: Implement full `cleanCommand`

**Files:**
- Modify: `src/commands/clean.ts`

- [ ] **Step 1: Replace clean.ts with full implementation**

Replace the entire contents of `src/commands/clean.ts` with:

```typescript
import Table from 'cli-table3';
import { logger } from '../utils/logger.js';
import { manifestManager } from '../storage/manifest.js';
import { articleStorage } from '../storage/articles.js';
import { groupStorage } from '../storage/groups.js';
import { summaryStorage } from '../storage/summaries.js';
import inquirer from 'inquirer';
import ora from 'ora';

interface DeletableEntry {
  id: string;
  date: string;
  status: string;
  [key: string]: unknown;
}

export function parseOlderThan(value: string, now: Date = new Date()): Date {
  const match = value.match(/^(\d+)d$/);
  if (!match) throw new Error(`Invalid --older-than value: "${value}". Expected format: "30d"`);
  const days = parseInt(match[1], 10);
  const cutoff = new Date(now.getTime());
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

export function filterDeletable(
  entries: DeletableEntry[],
  cutoff: Date,
  statusFilter?: string
): DeletableEntry[] {
  return entries.filter(entry => {
    if (new Date(entry.date).getTime() >= cutoff.getTime()) return false;
    if (statusFilter && entry.status !== statusFilter) return false;
    return true;
  });
}

interface CleanOptions {
  olderThan?: string;
  status?: string;
  dryRun?: boolean;
  force?: boolean;
}

export async function cleanCommand(options: CleanOptions): Promise<void> {
  const olderThanStr = options.olderThan ?? '30d';
  let cutoff: Date;
  try {
    cutoff = parseOlderThan(olderThanStr);
  } catch (err) {
    logger.error((err as Error).message);
    process.exit(1);
  }

  await manifestManager.load();
  const manifest = manifestManager['manifest'] as {
    articles: Record<string, { id: string; scrapedAt: string; status: string; title: string }>;
    groups: Record<string, { id: string; createdAt: string; status: string; articleIds: string[] }>;
    summaries: Record<string, { id: string; createdAt: string; status: string; groupId: string }>;
  };

  const articleEntries = Object.values(manifest.articles).map(a => ({
    id: a.id, date: a.scrapedAt, status: a.status, title: a.title, type: 'article',
  }));
  const groupEntries = Object.values(manifest.groups).map(g => ({
    id: g.id, date: g.createdAt, status: g.status, title: `Group (${g.articleIds.length} articles)`, type: 'group',
  }));
  const summaryEntries = Object.values(manifest.summaries).map(s => ({
    id: s.id, date: s.createdAt, status: s.status, title: `Summary for group ${s.groupId.slice(0, 8)}…`, type: 'summary',
  }));

  const allEntries = [...articleEntries, ...groupEntries, ...summaryEntries];
  const toDelete = filterDeletable(allEntries, cutoff!, options.status);

  if (toDelete.length === 0) {
    logger.info('Nothing to delete.');
    return;
  }

  const table = new Table({ head: ['Type', 'ID', 'Status', 'Date', 'Title'], colWidths: [10, 12, 12, 13, 35] });
  for (const entry of toDelete) {
    const shortId = entry.id.slice(0, 8) + '…';
    const date = new Date(entry.date).toLocaleDateString();
    const title = String(entry.title ?? '').slice(0, 32);
    table.push([entry.type, shortId, entry.status, date, title]);
  }
  console.log('\nItems to delete:');
  console.log(table.toString());

  if (options.dryRun) {
    logger.info(`Dry run: would delete ${toDelete.length} items.`);
    return;
  }

  if (!options.force) {
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([{
      type: 'confirm',
      name: 'confirm',
      message: `Delete ${toDelete.length} items? This cannot be undone.`,
      default: false,
    }]);
    if (!confirm) {
      logger.info('Deletion cancelled.');
      return;
    }
  }

  const spinner = ora('Deleting items...').start();
  let deleted = 0;
  let failed = 0;

  for (const entry of toDelete) {
    try {
      if (entry.type === 'article') await articleStorage.delete(entry.id);
      else if (entry.type === 'group') await groupStorage.delete(entry.id);
      else if (entry.type === 'summary') await summaryStorage.delete(entry.id);
      deleted++;
    } catch {
      failed++;
    }
  }

  spinner.succeed(`Deleted ${deleted} item${deleted !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}`);
  logger.success('Clean complete');
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

Expected: All tests PASS (including the 8 in clean.test.ts).

---

### Task 4: Final cleanup

- [ ] **Step 1: Verify CLI registration in index.ts**

```bash
grep -A 8 "\.command('clean')" /home/gandolh/projects/newspapper/src/index.ts
```

Expected: `--older-than`, `--status`, `--dry-run`, `--force` options, calls `cleanCommand`.

- [ ] **Step 2: Remove the todo file**

```bash
rm /home/gandolh/projects/newspapper/docs/todos/08-clean-command.md
```
