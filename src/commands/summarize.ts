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
