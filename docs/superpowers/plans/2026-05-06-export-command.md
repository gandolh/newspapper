# Export Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `src/commands/export.ts` — a command that copies generated slide images, metadata.json, and summary.json to a destination directory, then marks the group and its summaries as published.

**Architecture:** Validate that images exist in `output/<groupId>/slides/`, resolve the destination path (prompt if not provided, resolve relative paths to absolute), create export directories, copy files with an ora spinner, calculate total size, update manifest statuses, print a contents summary, then offer to open the folder. Two pure helpers — `resolveDestination` and `formatExportSummary` — are extracted for TDD; the rest is I/O orchestration that is not unit-tested.

**Tech Stack:** TypeScript, ora v9, inquirer v13, fs/promises (copyFile, mkdir, readdir, stat), path, child_process (exec), summaryStorage, groupStorage, manifestManager, config, logger.

---

### Task 1: Implement `resolveDestination` pure helper (TDD)

**Files:**
- Modify: `src/commands/export.ts`
- Create: `src/commands/export.test.ts`

`resolveDestination` converts a raw destination string (which may be relative) to an absolute path.

- [ ] **Step 1: Create the failing test**

Create `src/commands/export.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { resolveDestination } from './export.js';
import { join } from 'path';

describe('resolveDestination', () => {
  it('returns absolute paths unchanged', () => {
    expect(resolveDestination('/tmp/export')).toBe('/tmp/export');
  });

  it('resolves relative paths against cwd', () => {
    const result = resolveDestination('./exported');
    expect(result).toBe(join(process.cwd(), 'exported'));
  });

  it('resolves bare names against cwd', () => {
    const result = resolveDestination('myexport');
    expect(result).toBe(join(process.cwd(), 'myexport'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/export.test.ts 2>&1
```

Expected: FAIL — `resolveDestination` is not a function.

- [ ] **Step 3: Implement `resolveDestination` in export.ts**

Replace the contents of `src/commands/export.ts` with:

```typescript
import { join } from 'path';
import { logger } from '../utils/logger.js';

export function resolveDestination(destination: string): string {
  if (destination.startsWith('/')) return destination;
  return join(process.cwd(), destination);
}

export async function exportCommand(groupId: string, options: Record<string, unknown>): Promise<void> {
  logger.warn('Command not yet implemented');
  void options;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/export.test.ts 2>&1
```

Expected: All 3 tests PASS.

---

### Task 2: Implement `formatExportSummary` pure helper (TDD)

**Files:**
- Modify: `src/commands/export.ts`
- Modify: `src/commands/export.test.ts`

`formatExportSummary` builds the console summary shown after export.

- [ ] **Step 1: Add the failing test**

Append to `src/commands/export.test.ts`:

```typescript
import { formatExportSummary } from './export.js';

describe('formatExportSummary', () => {
  it('includes destination, file count, and each filename', () => {
    const result = formatExportSummary('/dest/path', ['01-title.png', '02-body.png']);
    expect(result).toContain('/dest/path');
    expect(result).toContain('2 images');
    expect(result).toContain('01-title.png');
    expect(result).toContain('02-body.png');
    expect(result).toContain('metadata.json');
    expect(result).toContain('summary.json');
  });

  it('handles a single image', () => {
    const result = formatExportSummary('/out', ['01-title.png']);
    expect(result).toContain('1 images');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/export.test.ts 2>&1
```

Expected: FAIL — `formatExportSummary` is not a function.

- [ ] **Step 3: Implement `formatExportSummary` in export.ts**

Add after `resolveDestination` and before `exportCommand` in `src/commands/export.ts`:

```typescript
export function formatExportSummary(destination: string, imageFiles: string[]): string {
  const lines = [
    '\nExport complete!',
    `  Location: ${destination}`,
    `  Files: ${imageFiles.length} images + metadata`,
    '\nContents:',
    '  slides/',
    ...imageFiles.map(f => `    ${f}`),
    '  metadata.json',
    '  summary.json',
  ];
  return lines.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/export.test.ts 2>&1
```

Expected: All 5 tests PASS.

---

### Task 3: Implement full `exportCommand`

**Files:**
- Modify: `src/commands/export.ts`

Replace the stub with the full orchestration.

- [ ] **Step 1: Replace export.ts with full implementation**

Replace the entire contents of `src/commands/export.ts` with:

```typescript
import { join } from 'path';
import { logger } from '../utils/logger.js';
import { manifestManager } from '../storage/manifest.js';
import { groupStorage } from '../storage/groups.js';
import { summaryStorage } from '../storage/summaries.js';
import { copyFile, mkdir, readdir, stat } from 'fs/promises';
import { config } from '../utils/config.js';
import ora from 'ora';
import inquirer from 'inquirer';

export function resolveDestination(destination: string): string {
  if (destination.startsWith('/')) return destination;
  return join(process.cwd(), destination);
}

export function formatExportSummary(destination: string, imageFiles: string[]): string {
  const lines = [
    '\nExport complete!',
    `  Location: ${destination}`,
    `  Files: ${imageFiles.length} images + metadata`,
    '\nContents:',
    '  slides/',
    ...imageFiles.map(f => `    ${f}`),
    '  metadata.json',
    '  summary.json',
  ];
  return lines.join('\n');
}

interface ExportOptions {
  destination?: string;
}

export async function exportCommand(groupId: string, options: ExportOptions): Promise<void> {
  const group = await groupStorage.load(groupId);
  if (!group) {
    logger.error(`Group ${groupId} not found`);
    process.exit(1);
  }

  const outputDir = join(config.paths.output, groupId);
  const slidesDir = join(outputDir, 'slides');

  let imageFiles: string[];
  try {
    const files = await readdir(slidesDir);
    imageFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
    if (imageFiles.length === 0) {
      logger.error('No images found to export');
      logger.info(`Run: npm run generate ${groupId}`);
      process.exit(1);
    }
    logger.info(`Found ${imageFiles.length} images to export`);
  } catch {
    logger.error(`Output directory not found: ${outputDir}`);
    logger.info(`Run: npm run generate ${groupId}`);
    process.exit(1);
  }

  let destination = options.destination;
  if (!destination) {
    const { dest } = await inquirer.prompt<{ dest: string }>([{
      type: 'input',
      name: 'dest',
      message: 'Export destination:',
      default: join(process.env.HOME ?? process.cwd(), 'Desktop', `newspapper-${groupId}`),
    }]);
    destination = dest;
  }

  destination = resolveDestination(destination);
  logger.info(`Exporting to: ${destination}`);

  await mkdir(destination, { recursive: true });
  await mkdir(join(destination, 'slides'), { recursive: true });

  const spinner = ora('Copying files...').start();

  try {
    for (const file of imageFiles) {
      await copyFile(join(slidesDir, file), join(destination, 'slides', file));
    }

    spinner.text = 'Copying metadata...';

    await copyFile(join(outputDir, 'metadata.json'), join(destination, 'metadata.json'));

    const summaries = (await summaryStorage.getByGroup(groupId)).filter(Boolean);
    if (summaries.length > 0) {
      summaries.sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime());
      await copyFile(
        join(config.paths.data, 'summaries', `${summaries[0]!.id}.json`),
        join(destination, 'summary.json')
      );
    }

    spinner.succeed('Files copied');
  } catch (error) {
    spinner.fail('Export failed');
    logger.error((error as Error).message);
    process.exit(1);
  }

  let totalSize = 0;
  const exportedSlides = await readdir(join(destination, 'slides'));
  for (const file of exportedSlides) {
    const stats = await stat(join(destination, 'slides', file));
    totalSize += stats.size;
  }
  logger.info(`Exported ${exportedSlides.length} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);

  await manifestManager.load();
  await manifestManager.updateGroupStatus(groupId, 'published');
  const allSummaries = (await summaryStorage.getByGroup(groupId)).filter(Boolean);
  for (const summary of allSummaries) {
    await manifestManager.updateSummaryStatus(summary!.id, 'published');
  }
  logger.success('Marked as published');

  console.log(formatExportSummary(destination, imageFiles));

  const { openFolder } = await inquirer.prompt<{ openFolder: boolean }>([{
    type: 'confirm',
    name: 'openFolder',
    message: 'Open export folder?',
    default: false,
  }]);

  if (openFolder) {
    const { exec } = await import('child_process');
    const command = process.platform === 'darwin'
      ? `open "${destination}"`
      : process.platform === 'win32'
        ? `explorer "${destination}"`
        : `xdg-open "${destination}"`;
    exec(command);
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

Expected: All tests PASS (including the 5 in export.test.ts).

---

### Task 4: Final cleanup

- [ ] **Step 1: Verify CLI registration in index.ts**

```bash
grep -A 8 "\.command('export')" /home/gandolh/projects/newspapper/src/index.ts
```

Expected: `<group-id>` argument, `--destination` option, calls `exportCommand`.

- [ ] **Step 2: Run full test suite one final time**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run 2>&1
```

Expected: All tests PASS.

- [ ] **Step 3: Remove the todo file**

```bash
rm /home/gandolh/projects/newspapper/docs/todos/07-export-command.md
```
