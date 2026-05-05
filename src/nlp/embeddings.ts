import { pipeline } from '@xenova/transformers';
import { logger } from '../utils/logger.js';

export class EmbeddingGenerator {
  private model: Awaited<ReturnType<typeof pipeline>> | null = null;
  private modelName = 'Xenova/all-MiniLM-L6-v2';

  async init(): Promise<void> {
    if (!this.model) {
      logger.info('Loading embedding model (this may take a moment on first run)...');
      this.model = await pipeline('feature-extraction', this.modelName);
      logger.success('Embedding model loaded');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    await this.init();

    const maxLength = 512;
    const truncatedText = text.slice(0, maxLength * 4);

    const output = await this.model!(truncatedText, {
      pooling: 'mean',
      normalize: true
    });

    return Array.from(output.data as number[]);
  }

  async generateArticleEmbedding(article: { title: string; body: string }): Promise<number[]> {
    const text = `${article.title}\n\n${article.body.slice(0, 1000)}`;
    return await this.generateEmbedding(text);
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    await this.init();

    const embeddings: number[][] = [];
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const embeddingGenerator = new EmbeddingGenerator();
