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
