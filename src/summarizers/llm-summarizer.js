import { readFile } from 'fs/promises';
import { join } from 'path';
import Handlebars from 'handlebars';
import { OpenAI } from 'openai';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export class LLMSummarizer {
  constructor() {
    this.openai = null;
    this.promptTemplate = null;
  }

  async init() {
    if (!config.openai.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: config.openai.apiKey
      });
    }

    if (!this.promptTemplate) {
      const promptPath = join(config.paths.prompts, 'summarize-llm.hbs');
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

    logger.info(`Summarizing ${articles.length} articles with OpenAI (tone: ${tone})`);

    const prompt = this.promptTemplate({
      articles: articles.map(a => ({
        ...a,
        sourceName: a.sourceName || 'Unknown Source'
      })),
      tone,
      maxSlides,
      emphasis
    });

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a news summarizer that creates concise, engaging content for Instagram slides. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      const result = JSON.parse(content);

      if (!result.slides || !Array.isArray(result.slides)) {
        throw new Error('Invalid response format from LLM');
      }

      logger.success(`Generated ${result.slides.length} slides`);
      return result.slides;
    } catch (error) {
      logger.error(`LLM summarization failed: ${error.message}`);
      throw error;
    }
  }
}

export const llmSummarizer = new LLMSummarizer();
