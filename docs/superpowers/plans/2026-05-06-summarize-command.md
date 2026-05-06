# Summarize Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `src/commands/summarize.ts` — a command that generates slide content from a group of articles using one of three methods (llm, local, nlp) with interactive preview, article exclusion, and post-generation actions.

**Architecture:** Load and validate the group, optionally exclude articles, enrich with source names, show a preview table and confirm, optionally check local LLM availability, run `summarizerOrchestrator.summarize()`, save the result via `summaryStorage.save()`, print generated slides, then offer next-action choices. Pure formatting helpers are extracted and tested in isolation (TDD). The command function itself is not unit-tested since it depends entirely on I/O.

**Tech Stack:** TypeScript, inquirer v13, ora v9, cli-table3, summarizerOrchestrator, summaryStorage, groupStorage, articleStorage, sourceManager, manifestManager, logger.

---

### Task 1: Implement `formatSlidePreview` pure helper (TDD)

**Files:**
- Modify: `src/commands/summarize.ts`
- Create: `src/commands/summarize.test.ts`

This helper formats the generated slides into a human-readable console block.

- [ ] **Step 1: Create the test file**

Create `src/commands/summarize.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatSlidePreview } from './summarize.js';

describe('formatSlidePreview', () => {
  it('formats slides with type, text, attribution, and notes', () => {
    const slides = [
      { type: 'title', text: 'Big Headline', notes: '4 articles' },
      { type: 'quote', text: 'We did it.', attribution: 'The Guardian', notes: 'Key quote' },
      { type: 'body', text: 'Lots of context here.' },
    ];
    const result = formatSlidePreview(slides);
    expect(result).toContain('Slide 1/3 [title]');
    expect(result).toContain('Big Headline');
    expect(result).toContain('Notes: 4 articles');
    expect(result).toContain('Slide 2/3 [quote]');
    expect(result).toContain('— The Guardian');
    expect(result).toContain('Slide 3/3 [body]');
  });

  it('omits attribution line when not present', () => {
    const slides = [{ type: 'body', text: 'Some text.' }];
    const result = formatSlidePreview(slides);
    expect(result).not.toContain('—');
  });

  it('omits notes line when not present', () => {
    const slides = [{ type: 'title', text: 'Headline' }];
    const result = formatSlidePreview(slides);
    expect(result).not.toContain('Notes:');
  });

  it('returns empty string for empty slides array', () => {
    expect(formatSlidePreview([])).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/summarize.test.ts 2>&1
```

Expected: FAIL — `formatSlidePreview` is not exported.

- [ ] **Step 3: Implement `formatSlidePreview` in summarize.ts**

Replace the contents of `src/commands/summarize.ts` with:

```typescript
import { logger } from '../utils/logger.js';

interface Slide {
  type: string;
  text: string;
  attribution?: string;
  notes?: string;
  [key: string]: unknown;
}

export function formatSlidePreview(slides: Slide[]): string {
  if (slides.length === 0) return '';
  const sep = '-'.repeat(60);
  const lines: string[] = ['\nGenerated slides:', '='.repeat(60)];
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    lines.push(`\nSlide ${i + 1}/${slides.length} [${slide.type}]`);
    lines.push(sep);
    lines.push(slide.text);
    if (slide.attribution) lines.push(`\n— ${slide.attribution}`);
    if (slide.notes) lines.push(`\nNotes: ${slide.notes}`);
  }
  lines.push('\n' + '='.repeat(60));
  return lines.join('\n');
}

export async function summarizeCommand(groupId: string, options: Record<string, unknown>): Promise<void> {
  logger.warn('Command not yet implemented');
  void options;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/summarize.test.ts 2>&1
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/gandolh/projects/newspapper && git add src/commands/summarize.ts src/commands/summarize.test.ts && git commit -m "feat: add formatSlidePreview helper for summarize command"
```

---

### Task 2: Implement `formatArticleTable` pure helper (TDD)

**Files:**
- Modify: `src/commands/summarize.ts`
- Modify: `src/commands/summarize.test.ts`

This helper builds the articles-to-summarize preview table string.

- [ ] **Step 1: Add test to summarize.test.ts**

Add to the bottom of `src/commands/summarize.test.ts`:

```typescript
import { formatArticleTable } from './summarize.js';

describe('formatArticleTable', () => {
  it('renders a table with index, title, source, word count', () => {
    const articles = [
      { id: 'a1', title: 'Biden climate plan unveiled today', sourceName: 'Guardian', metadata: { wordCount: 1200, language: 'en' }, sourceId: 's1', url: 'http://x', body: '', scrapedAt: '', publishedAt: null },
      { id: 'a2', title: 'Short', sourceName: 'NYT', metadata: { wordCount: 500, language: 'en' }, sourceId: 's2', url: 'http://y', body: '', scrapedAt: '', publishedAt: null },
    ];
    const result = formatArticleTable(articles);
    expect(result).toContain('Guardian');
    expect(result).toContain('1200');
    expect(result).toContain('NYT');
  });

  it('truncates long titles', () => {
    const longTitle = 'A'.repeat(60);
    const articles = [
      { id: 'a1', title: longTitle, sourceName: 'BBC', metadata: { wordCount: 800, language: 'en' }, sourceId: 's1', url: 'http://z', body: '', scrapedAt: '', publishedAt: null },
    ];
    const result = formatArticleTable(articles);
    expect(result).not.toContain(longTitle);
    expect(result).toContain('…');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/summarize.test.ts 2>&1
```

Expected: FAIL — `formatArticleTable` is not exported.

- [ ] **Step 3: Implement `formatArticleTable` in summarize.ts**

Add the following imports and function to `src/commands/summarize.ts`. Replace the import line and add the new function after `formatSlidePreview`:

Replace the top of the file (the single import line):

```typescript
import Table from 'cli-table3';
import { logger } from '../utils/logger.js';
```

Then add after `formatSlidePreview` and before `summarizeCommand`:

```typescript
interface ArticleRow {
  id: string;
  title: string;
  sourceName?: string;
  metadata?: { wordCount?: number; language?: string };
  sourceId: string;
  url: string;
  body: string;
  scrapedAt: string;
  publishedAt?: string | null;
  [key: string]: unknown;
}

export function formatArticleTable(articles: ArticleRow[]): string {
  const table = new Table({
    head: ['#', 'Title', 'Source', 'Words'],
    colWidths: [5, 50, 20, 10],
  });
  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    const title = a.title.length > 47 ? a.title.slice(0, 46) + '…' : a.title;
    table.push([i + 1, title, a.sourceName ?? 'Unknown', a.metadata?.wordCount ?? '-']);
  }
  return table.toString();
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run src/commands/summarize.test.ts 2>&1
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/gandolh/projects/newspapper && git add src/commands/summarize.ts src/commands/summarize.test.ts && git commit -m "feat: add formatArticleTable helper for summarize command"
```

---

### Task 3: Implement full `summarizeCommand`

**Files:**
- Modify: `src/commands/summarize.ts`

Replace the stub and add all imports needed for the full interactive command.

- [ ] **Step 1: Replace summarize.ts with full implementation**

Replace the entire contents of `src/commands/summarize.ts` with:

```typescript
import Table from 'cli-table3';
import { logger } from '../utils/logger.js';
import { manifestManager } from '../storage/manifest.js';
import { articleStorage } from '../storage/articles.js';
import { groupStorage } from '../storage/groups.js';
import { summaryStorage } from '../storage/summaries.js';
import { sourceManager } from '../storage/sources.js';
import { summarizerOrchestrator } from '../summarizers/index.js';
import ora from 'ora';
import inquirer from 'inquirer';

interface Slide {
  type: string;
  text: string;
  attribution?: string;
  notes?: string;
  [key: string]: unknown;
}

interface ArticleRow {
  id: string;
  title: string;
  sourceName?: string;
  metadata?: { wordCount?: number; language?: string };
  sourceId: string;
  url: string;
  body: string;
  scrapedAt: string;
  publishedAt?: string | null;
  [key: string]: unknown;
}

export function formatSlidePreview(slides: Slide[]): string {
  if (slides.length === 0) return '';
  const sep = '-'.repeat(60);
  const lines: string[] = ['\nGenerated slides:', '='.repeat(60)];
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    lines.push(`\nSlide ${i + 1}/${slides.length} [${slide.type}]`);
    lines.push(sep);
    lines.push(slide.text);
    if (slide.attribution) lines.push(`\n— ${slide.attribution}`);
    if (slide.notes) lines.push(`\nNotes: ${slide.notes}`);
  }
  lines.push('\n' + '='.repeat(60));
  return lines.join('\n');
}

export function formatArticleTable(articles: ArticleRow[]): string {
  const table = new Table({
    head: ['#', 'Title', 'Source', 'Words'],
    colWidths: [5, 50, 20, 10],
  });
  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    const title = a.title.length > 47 ? a.title.slice(0, 46) + '…' : a.title;
    table.push([i + 1, title, a.sourceName ?? 'Unknown', a.metadata?.wordCount ?? '-']);
  }
  return table.toString();
}

interface SummarizeOptions {
  method?: string;
  tone?: string;
  design?: string;
  maxSlides?: number;
  emphasis?: string;
  exclude?: string;
}

export async function summarizeCommand(groupId: string, options: SummarizeOptions): Promise<void> {
  await manifestManager.load();

  const group = await groupStorage.load(groupId);
  if (!group) {
    logger.error(`Group ${groupId} not found`);
    logger.info('Run "npm run list --type=groups" to see available groups');
    process.exit(1);
  }

  logger.info(`Summarizing group ${groupId} with ${group.articleIds.length} articles`);

  let articles = await articleStorage.loadMultiple(group.articleIds) as ArticleRow[];

  if (options.exclude) {
    const excludeIds = options.exclude.split(',').map((id: string) => id.trim());
    const before = articles.length;
    articles = articles.filter(a => !excludeIds.includes(a.id));
    logger.info(`Excluded ${before - articles.length} articles`);
  }

  if (articles.length === 0) {
    logger.error('No articles remaining after exclusions');
    process.exit(1);
  }

  const sources = await sourceManager.getAll();
  articles = articles.map(article => ({
    ...article,
    sourceName: sources.find(s => s.id === article.sourceId)?.name ?? 'Unknown Source',
  }));

  console.log('\nArticles to summarize:');
  console.log(formatArticleTable(articles));

  const method = options.method ?? 'local';
  const tone = options.tone ?? 'analytical';

  const { proceed } = await inquirer.prompt<{ proceed: boolean }>([{
    type: 'confirm',
    name: 'proceed',
    message: `Summarize with ${method} method (${tone} tone)?`,
    default: true,
  }]);

  if (!proceed) {
    logger.info('Summarization cancelled');
    process.exit(0);
  }

  if (method === 'local') {
    const checkSpinner = ora('Checking local LLM connection...').start();
    const isAvailable = await summarizerOrchestrator.checkLocalLLM();
    if (!isAvailable) {
      checkSpinner.fail('Local LLM not available');
      logger.error('Make sure Ollama is running: ollama serve');
      logger.error(`And model is pulled: ollama pull ${process.env.OLLAMA_MODEL ?? 'llama3.2:1b'}`);
      process.exit(1);
    }
    checkSpinner.succeed('Local LLM connected');
  }

  const spinner = ora('Generating summary...').start();

  let slides: Slide[];
  let summary: Awaited<ReturnType<typeof summaryStorage.save>>;

  try {
    slides = await summarizerOrchestrator.summarize(articles, method, {
      tone,
      maxSlides: options.maxSlides,
      emphasis: options.emphasis ?? null,
    }) as Slide[];

    spinner.succeed(`Generated ${slides.length} slides`);

    summary = await summaryStorage.save({
      groupId,
      method,
      tone,
      design: options.design ?? 'broadsheet',
      slides,
    });

    logger.success(`Saved summary ${summary.id}`);
  } catch (error) {
    spinner.fail('Summarization failed');
    logger.error((error as Error).message);
    if ((error as Error).message.includes('API key')) {
      logger.info('Set OPENAI_API_KEY in .env file');
    }
    process.exit(1);
  }

  console.log(formatSlidePreview(slides!));

  const { nextAction } = await inquirer.prompt<{ nextAction: string }>([{
    type: 'list',
    name: 'nextAction',
    message: 'What would you like to do?',
    choices: [
      { name: 'Generate images from this summary', value: 'generate' },
      { name: 'Regenerate with different settings', value: 'regenerate' },
      { name: 'Edit slides manually', value: 'edit' },
      { name: 'Done', value: 'done' },
    ],
  }]);

  if (nextAction === 'generate') {
    logger.info(`Run: npm run generate ${groupId}`);
  } else if (nextAction === 'regenerate') {
    logger.info('Regenerate with different --method, --tone, or --emphasis');
  } else if (nextAction === 'edit') {
    logger.info(`Edit: data/summaries/${summary!.id}.json`);
  }

  logger.info('Summarization complete');
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

Expected: All tests PASS (including the 6 in summarize.test.ts).

- [ ] **Step 4: Commit**

```bash
cd /home/gandolh/projects/newspapper && git add src/commands/summarize.ts && git commit -m "feat: implement summarizeCommand with interactive preview and post-action choices"
```

---

### Task 4: Final cleanup

**Files:**
- Delete: `docs/todos/05-summarize-command.md`

- [ ] **Step 1: Verify CLI registration in index.ts**

```bash
grep -A 12 "\.command('summarize')" /home/gandolh/projects/newspapper/src/index.ts
```

Expected: `<group-id>` argument, `--method`, `--tone`, `--design`, `--max-slides`, `--emphasis`, `--exclude` options, calls `summarizeCommand`.

- [ ] **Step 2: Run full test suite one final time**

```bash
cd /home/gandolh/projects/newspapper && npx vitest run 2>&1
```

Expected: All tests PASS.

- [ ] **Step 3: Remove the todo file**

```bash
rm /home/gandolh/projects/newspapper/docs/todos/05-summarize-command.md
```

- [ ] **Step 4: Final commit**

```bash
cd /home/gandolh/projects/newspapper && git add -A && git commit -m "feat: complete summarize command implementation"
```
