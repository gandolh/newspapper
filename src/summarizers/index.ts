import { llmSummarizer } from './llm-summarizer.js';
import { localSummarizer } from './local-summarizer.js';
import { templateSummarizer } from './template-summarizer.js';
import { logger } from '../utils/logger.js';

interface Article {
  [key: string]: unknown;
}

interface SummarizeOptions {
  tone?: string;
  maxSlides?: number;
  emphasis?: string | null;
}

export class SummarizerOrchestrator {
  async summarize(articles: Article[], method = 'local', options: SummarizeOptions = {}) {
    logger.info(`Using ${method} summarization method`);

    switch (method) {
      case 'llm':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await llmSummarizer.summarize(articles as any, options);
      case 'local':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await localSummarizer.summarize(articles as any, options);
      case 'nlp':
      case 'template':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await templateSummarizer.summarize(articles as any, options);
      default:
        throw new Error(`Unknown summarization method: ${method}`);
    }
  }

  async checkLocalLLM(): Promise<boolean> {
    return await localSummarizer.checkConnection();
  }
}

export const summarizerOrchestrator = new SummarizerOrchestrator();
