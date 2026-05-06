import Table from 'cli-table3';
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

export async function summarizeCommand(groupId: string, options: Record<string, unknown>): Promise<void> {
  logger.warn('Command not yet implemented');
  void options;
}
