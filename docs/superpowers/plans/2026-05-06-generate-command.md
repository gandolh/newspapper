# Generate Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `src/commands/generate.ts` — a command that renders summary slides to PNG images using Playwright, writes a metadata.json file, and updates the manifest.

**Architecture:** Load group and summary (using the most-recent summary for the group if no `--summary-id` is given), create an output directory, call `screenshotRenderer.renderSlides()`, write metadata.json with article/source details, update the manifest summary status to `'generated'`, then print next-step instructions. Two pure helpers — `buildMetadata` and `formatNextSteps` — are extracted for TDD; the rest is I/O orchestration that is not unit-tested.

**Tech Stack:** TypeScript, ora v9, screenshotRenderer (Playwright + sharp), summaryStorage, groupStorage, articleStorage, sourceManager, manifestManager, config, fs/promises, logger.

---

### Task 1: Implement `buildMetadata` pure helper (TDD)

**Files:**
- Modify: `src/commands/generate.ts`
- Create: `src/commands/generate.test.ts`

`buildMetadata` assembles the plain object that gets serialised to `metadata.json`. Pure function, no I/O.

- [ ] **Step 1: Create the failing test**

Create `src/commands/generate.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildMetadata } from './generate.js';

describe('buildMetadata', () => {
  it('includes all required top-level fields', () => {
    const result = buildMetadata({
      groupId: 'grp-1',
      summaryId: 'sum-1',
      design: 'broadsheet',
      method: 'local',
      tone: 'analytical',
      slideCount: 4,
      articles: [],
      sources: [],
    });
    expect(result.groupId).toBe('grp-1');
    expect(result.summaryId).toBe('sum-1');
    expect(result.design).toBe('broadsheet');
    expect(result.method).toBe('local');
    expect(result.tone).toBe('analytical');
    expect(result.slideCount).toBe(4);
    expect(typeof result.generatedAt).toBe('string');
  });

  it('maps articles to title/source/url/author/publishedAt', () => {
    const articles = [
      { id: 'a1', title: 'Story', sourceId: 'src-1', url: 'http://x', author: 'Bob', publishedAt: '2026-01-01', body: '', scrapedAt: '' },
    ];
    const sources = [{ id: 'src-1', name: 'Guardian', url: '', rss: null, scraperType: 'http', selectors: {}, enabled: true }];
    const result = buildMetadata({ groupId: 'g', summaryId: 's', design: 'd', method: 'm', tone: 't', slideCount: 1, articles, sources });
    expect(result.articles).toHaveLength(1);
    expect(result.articles[0].title).toBe('Story');
    expect(result.articles[0].source).toBe('Guardian');
    expect(result.articles[0].url).toBe('http://x');
    expect(result.articles[0].author).toBe('Bob');
    expect(result.articles[0].publishedAt).toBe('2026-01-01');
  });

  it('falls back to "Unknown" when source is not found', () => {
    const articles = [
      { id: 'a1', title: 'Story', sourceId: 'missing', url: 'http://x', author: null, publishedAt: undefined, body: '', scrapedAt: '' },
    ];
    const result = buildMetadata({ groupId: 'g', summaryId: 's', design: 'd', method: 'm', tone: 't', slideCount: 1, articles, sources: [] });
    expect(result.articles[0].source).toBe('Unknown');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/generate.test.ts 2>&1
```

Expected: FAIL — `buildMetadata` is not a function.

- [ ] **Step 3: Implement `buildMetadata` in generate.ts**

Replace the contents of `src/commands/generate.ts` with:

```typescript
import { logger } from '../utils/logger.js';

interface ArticleInput {
  id: string;
  title: string;
  sourceId: string;
  url: string;
  author?: string | null;
  publishedAt?: string | null;
  body: string;
  scrapedAt: string;
  [key: string]: unknown;
}

interface SourceInput {
  id: string;
  name: string;
  url: string;
  rss: string | null;
  scraperType: string;
  selectors: Record<string, string>;
  enabled: boolean;
}

interface BuildMetadataInput {
  groupId: string;
  summaryId: string;
  design: string;
  method: string;
  tone: string;
  slideCount: number;
  articles: ArticleInput[];
  sources: SourceInput[];
}

interface Metadata {
  groupId: string;
  summaryId: string;
  generatedAt: string;
  design: string;
  method: string;
  tone: string;
  slideCount: number;
  articles: { title: string; source: string; url: string; author: string | null | undefined; publishedAt: string | null | undefined }[];
}

export function buildMetadata(input: BuildMetadataInput): Metadata {
  return {
    groupId: input.groupId,
    summaryId: input.summaryId,
    generatedAt: new Date().toISOString(),
    design: input.design,
    method: input.method,
    tone: input.tone,
    slideCount: input.slideCount,
    articles: input.articles.map(article => ({
      title: article.title,
      source: input.sources.find(s => s.id === article.sourceId)?.name ?? 'Unknown',
      url: article.url,
      author: article.author,
      publishedAt: article.publishedAt,
    })),
  };
}

export async function generateCommand(groupId: string, options: Record<string, unknown>): Promise<void> {
  logger.warn('Command not yet implemented');
  void options;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/generate.test.ts 2>&1
```

Expected: All 3 tests PASS.

---

### Task 2: Implement `formatNextSteps` pure helper (TDD)

**Files:**
- Modify: `src/commands/generate.ts`
- Modify: `src/commands/generate.test.ts`

`formatNextSteps` returns the next-steps string shown after generation.

- [ ] **Step 1: Add the failing test**

Append to `src/commands/generate.test.ts`:

```typescript
import { formatNextSteps } from './generate.js';

describe('formatNextSteps', () => {
  it('contains the group id and output dir in each relevant line', () => {
    const result = formatNextSteps('grp-1', '/output/grp-1');
    expect(result).toContain('/output/grp-1');
    expect(result).toContain('grp-1');
    expect(result).toContain('export');
    expect(result).toContain('summarize');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/generate.test.ts 2>&1
```

Expected: FAIL — `formatNextSteps` is not a function.

- [ ] **Step 3: Implement `formatNextSteps` in generate.ts**

Add after `buildMetadata` and before `generateCommand` in `src/commands/generate.ts`:

```typescript
export function formatNextSteps(groupId: string, outputDir: string): string {
  return [
    '\nNext steps:',
    `  1. Review images: ${outputDir}/slides/`,
    `  2. Export package: npm run export ${groupId}`,
    `  3. Or regenerate with different design:`,
    `     npm run summarize ${groupId} --design=industrial`,
  ].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/generate.test.ts 2>&1
```

Expected: All 4 tests PASS.

---

### Task 3: Implement full `generateCommand`

**Files:**
- Modify: `src/commands/generate.ts`

Replace the stub with the full orchestration logic.

- [ ] **Step 1: Replace generate.ts with full implementation**

Replace the entire contents of `src/commands/generate.ts` with:

```typescript
import { logger } from '../utils/logger.js';
import { manifestManager } from '../storage/manifest.js';
import { groupStorage } from '../storage/groups.js';
import { summaryStorage } from '../storage/summaries.js';
import { articleStorage } from '../storage/articles.js';
import { sourceManager } from '../storage/sources.js';
import { screenshotRenderer } from '../renderer/screenshot.js';
import { mkdir, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import { config } from '../utils/config.js';
import ora from 'ora';

interface ArticleInput {
  id: string;
  title: string;
  sourceId: string;
  url: string;
  author?: string | null;
  publishedAt?: string | null;
  body: string;
  scrapedAt: string;
  [key: string]: unknown;
}

interface SourceInput {
  id: string;
  name: string;
  url: string;
  rss: string | null;
  scraperType: string;
  selectors: Record<string, string>;
  enabled: boolean;
}

interface BuildMetadataInput {
  groupId: string;
  summaryId: string;
  design: string;
  method: string;
  tone: string;
  slideCount: number;
  articles: ArticleInput[];
  sources: SourceInput[];
}

interface Metadata {
  groupId: string;
  summaryId: string;
  generatedAt: string;
  design: string;
  method: string;
  tone: string;
  slideCount: number;
  articles: { title: string; source: string; url: string; author: string | null | undefined; publishedAt: string | null | undefined }[];
}

export function buildMetadata(input: BuildMetadataInput): Metadata {
  return {
    groupId: input.groupId,
    summaryId: input.summaryId,
    generatedAt: new Date().toISOString(),
    design: input.design,
    method: input.method,
    tone: input.tone,
    slideCount: input.slideCount,
    articles: input.articles.map(article => ({
      title: article.title,
      source: input.sources.find(s => s.id === article.sourceId)?.name ?? 'Unknown',
      url: article.url,
      author: article.author,
      publishedAt: article.publishedAt,
    })),
  };
}

export function formatNextSteps(groupId: string, outputDir: string): string {
  return [
    '\nNext steps:',
    `  1. Review images: ${outputDir}/slides/`,
    `  2. Export package: npm run export ${groupId}`,
    `  3. Or regenerate with different design:`,
    `     npm run summarize ${groupId} --design=industrial`,
  ].join('\n');
}

interface GenerateOptions {
  summaryId?: string;
  format?: string;
  quality?: number;
  size?: string;
}

export async function generateCommand(groupId: string, options: GenerateOptions): Promise<void> {
  const group = await groupStorage.load(groupId);
  if (!group) {
    logger.error(`Group ${groupId} not found`);
    process.exit(1);
  }

  let summaryId = options.summaryId;
  if (!summaryId) {
    const summaries = (await summaryStorage.getByGroup(groupId)).filter(Boolean);
    if (summaries.length === 0) {
      logger.error(`No summary found for group ${groupId}`);
      logger.info(`Run: npm run summarize ${groupId}`);
      process.exit(1);
    }
    summaries.sort((a, b) =>
      new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime()
    );
    summaryId = summaries[0]!.id;
  }

  const summary = await summaryStorage.load(summaryId);
  if (!summary) {
    logger.error(`Summary ${summaryId} not found`);
    process.exit(1);
  }

  logger.info(`Generating ${summary.slides.length} slides for group ${groupId}`);
  logger.info(`Design: ${summary.design}, Method: ${summary.method}, Tone: ${summary.tone}`);

  const outputDir = join(config.paths.output, groupId);
  await mkdir(outputDir, { recursive: true });
  await mkdir(join(outputDir, 'slides'), { recursive: true });

  const spinner = ora('Rendering slides...').start();

  let imagePaths: string[];
  try {
    imagePaths = await screenshotRenderer.renderSlides(
      summary.slides,
      summary.design,
      outputDir
    );
    spinner.succeed(`Generated ${imagePaths.length} images`);

    let totalSize = 0;
    for (const imagePath of imagePaths) {
      const stats = await stat(imagePath);
      totalSize += stats.size;
    }
    logger.info(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    logger.success(`Images saved to: ${outputDir}/slides/`);
  } catch (error) {
    spinner.fail('Image generation failed');
    logger.error((error as Error).message);
    process.exit(1);
  } finally {
    await screenshotRenderer.close();
  }

  const articles = await articleStorage.loadMultiple(group.articleIds) as ArticleInput[];
  const sources = await sourceManager.getAll();

  const metadata = buildMetadata({
    groupId,
    summaryId,
    design: summary.design,
    method: summary.method,
    tone: summary.tone,
    slideCount: summary.slides.length,
    articles,
    sources,
  });

  await writeFile(join(outputDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  logger.info('Metadata saved');

  await manifestManager.load();
  await manifestManager.updateSummaryStatus(summaryId, 'generated');

  console.log(formatNextSteps(groupId, outputDir));
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

Expected: All tests PASS (including the 4 in generate.test.ts).

---

### Task 4: Final cleanup

- [ ] **Step 1: Verify CLI registration in index.ts**

```bash
grep -A 10 "\.command('generate')" /home/gandolh/projects/newspapper/src/index.ts
```

Expected: `<group-id>` argument, `--summary-id`, `--format`, `--quality`, `--size` options, calls `generateCommand`.

- [ ] **Step 2: Run full test suite one final time**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run 2>&1
```

Expected: All tests PASS.

- [ ] **Step 3: Remove the todo file**

```bash
rm /home/gandolh/projects/newspapper/docs/todos/06-generate-command.md
```
