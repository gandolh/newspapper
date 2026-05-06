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
