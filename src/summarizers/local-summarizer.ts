import { readFile } from 'fs/promises';
import { join } from 'path';
import Handlebars from 'handlebars';
import { Ollama } from 'ollama';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

interface Article {
  body: string;
  sourceName?: string;
  [key: string]: unknown;
}

interface SummarizeOptions {
  tone?: string;
  maxSlides?: number;
  emphasis?: string | null;
}

interface Slide {
  type: string;
  [key: string]: unknown;
}

export class LocalSummarizer {
  private ollama: Ollama | null = null;
  private promptTemplate: HandlebarsTemplateDelegate | null = null;

  async init(): Promise<void> {
    if (!this.ollama) {
      this.ollama = new Ollama({ host: config.ollama.host });
    }

    if (!this.promptTemplate) {
      const promptPath = join(config.paths.prompts, 'summarize-local.hbs');
      const promptContent = await readFile(promptPath, 'utf-8');
      this.promptTemplate = Handlebars.compile(promptContent);
    }
  }

  async summarize(articles: Article[], options: SummarizeOptions = {}): Promise<Slide[]> {
    await this.init();

    const { tone = 'analytical', maxSlides = 8, emphasis = null } = options;

    logger.info(`Summarizing ${articles.length} articles with local LLM (tone: ${tone})`);

    const prompt = this.promptTemplate!({
      articles: articles.map(a => ({ ...a, sourceName: a.sourceName || 'Unknown Source', body: a.body.slice(0, 500) })),
      tone,
      maxSlides,
      emphasis
    });

    try {
      const response = await this.ollama!.chat({
        model: config.ollama.model,
        messages: [
          { role: 'system', content: 'You are a news summarizer. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        format: 'json',
        options: { temperature: 0.7 }
      });

      const content = response.message.content;
      const result = JSON.parse(content) as { slides?: Slide[] };

      if (!result.slides || !Array.isArray(result.slides)) {
        throw new Error('Invalid response format from local LLM');
      }

      logger.success(`Generated ${result.slides.length} slides`);
      return result.slides;
    } catch (error) {
      logger.error(`Local LLM summarization failed: ${(error as Error).message}`);
      throw error;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.init();
      const models = await this.ollama!.list();
      const hasModel = models.models.some(m => m.name.includes(config.ollama.model.split(':')[0]));

      if (!hasModel) {
        logger.warn(`Model ${config.ollama.model} not found. Available: ${models.models.map(m => m.name).join(', ')}`);
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`Cannot connect to Ollama: ${(error as Error).message}`);
      return false;
    }
  }
}

export const localSummarizer = new LocalSummarizer();
