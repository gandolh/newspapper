import { llmSummarizer } from './llm-summarizer.js';
import { localSummarizer } from './local-summarizer.js';
import { templateSummarizer } from './template-summarizer.js';
import { logger } from '../utils/logger.js';

export class SummarizerOrchestrator {
  async summarize(articles, method = 'local', options = {}) {
    logger.info(`Using ${method} summarization method`);

    switch (method) {
      case 'llm':
        return await llmSummarizer.summarize(articles, options);
      
      case 'local':
        return await localSummarizer.summarize(articles, options);
      
      case 'nlp':
      case 'template':
        return await templateSummarizer.summarize(articles, options);
      
      default:
        throw new Error(`Unknown summarization method: ${method}`);
    }
  }

  async checkLocalLLM() {
    return await localSummarizer.checkConnection();
  }
}

export const summarizerOrchestrator = new SummarizerOrchestrator();
