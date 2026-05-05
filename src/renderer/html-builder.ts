import { readFile } from 'fs/promises';
import { join } from 'path';
import Handlebars from 'handlebars';
import { designLoader } from './design-loader.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

interface Slide {
  type: string;
  [key: string]: unknown;
}

export class HtmlBuilder {
  private templates: Record<string, HandlebarsTemplateDelegate> = {};

  async loadTemplate(designName: string, slideType: string): Promise<HandlebarsTemplateDelegate> {
    const key = `${designName}-${slideType}`;

    if (this.templates[key]) {
      return this.templates[key];
    }

    const templatePath = join(config.paths.templates, designName, `${slideType}.html`);

    try {
      const content = await readFile(templatePath, 'utf-8');
      this.templates[key] = Handlebars.compile(content);
      return this.templates[key];
    } catch (error) {
      logger.error(`Failed to load template ${designName}/${slideType}: ${(error as Error).message}`);
      throw error;
    }
  }

  async buildSlide(slide: Slide, designName: string, slideNumber: number, totalSlides: number): Promise<string> {
    const design = await designLoader.load(designName) as Record<string, unknown>;
    const template = await this.loadTemplate(designName, slide.type);

    const data = {
      ...slide,
      design,
      slideNumber,
      totalSlides,
      colors: design.colors,
      typography: design.typography,
      spacing: design.spacing,
      shapes: design.shapes || {}
    };

    return template(data);
  }

  async buildAllSlides(slides: Slide[], designName: string): Promise<string[]> {
    logger.info(`Building ${slides.length} slides with ${designName} design`);

    const htmlSlides: string[] = [];

    for (let i = 0; i < slides.length; i++) {
      const html = await this.buildSlide(slides[i], designName, i + 1, slides.length);
      htmlSlides.push(html);
    }

    return htmlSlides;
  }

  generateFontLinks(designName: string): string {
    if (designName === 'digital-broadsheet') {
      return `
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Newsreader:wght@400;600;700&family=Space+Grotesk:wght@400;500&display=swap" rel="stylesheet">
      `;
    } else if (designName === 'warm-industrial') {
      return `
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@700;800&family=Manrope:wght@400;700&display=swap" rel="stylesheet">
      `;
    }
    return '';
  }
}

export const htmlBuilder = new HtmlBuilder();
