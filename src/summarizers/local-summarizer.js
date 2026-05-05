import { readFile } from 'fs/promises';
import { join } from 'path';
import Handlebars from 'handlebars';
import { Ollama } from 'ollama';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export class LocalSummarizer {
  constructor() {
    this.ollama = null;
    this.promptTemplate = null;
  }

  async init() {
    if (!this.ollama) {
      this.ollama = new Ollama({
        host: config.ollama.host
      });
    }

    if (!this.promptTemplate) {
      const promptPath = join(config.paths.prompts, 'summarize-local.hbs');
      const promptContent = await readFile(promptPath, 'utf-8');
      this.promptTemplate = Handlebars.compile(promptContent);
    }
  }

  async summarize(articles, options = {}) {
    await this.init();

    const {
      tone = 'analytical',
      maxSlides = 8,
      emphasis = null
    } = options;

    logger.info(`Summarizing ${articles.length} articles with local LLM (tone: ${tone})`);

    const prompt = this.promptTemplate({
      articles: articles.map(a => ({
        ...a,
        sourceName: a.sourceName || 'Unknown Source',
        body: a.body.slice(0, 500)
      })),
      tone,
      maxSlides,
      emphasis
    });

    try {
      const response = await this.ollama.chat({
        model: config.ollama.model,
        messages: [
          {
            role: 'system',
            content: 'You are a news summarizer. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        format: 'json',
        options: {
          temperature: 0.7
        }
      });

      const content = response.message.content;
      const result = JSON.parse(content);

      if (!result.slides || !Array.isArray(result.slides)) {
        throw new Error('Invalid response format from local LLM');
      }

      logger.success(`Generated ${result.slides.length} slides`);
      return result.slides;
    } catch (error) {
      logger.error(`Local LLM summarization failed: ${error.message}`);
      throw error;
    }
  }

  async checkConnection() {
    try {
      await this.init();
      const models = await this.ollama.list();
      const hasModel = models.models.some(m => m.name.includes(config.ollama.model.split(':')[0]));
      
      if (!hasModel) {
        logger.warn(`Model ${config.ollama.model} not found. Available models: ${models.models.map(m => m.name).join(', ')}`);
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error(`Cannot connect to Ollama: ${error.message}`);
      return false;
    }
  }
}

export const localSummarizer = new LocalSummarizer();
