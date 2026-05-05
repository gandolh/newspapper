import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../utils/config.js';
import { manifestManager } from './manifest.js';

const ARTICLES_DIR = join(config.paths.data, 'articles');

export class ArticleStorage {
  async ensureDirectory() {
    await mkdir(ARTICLES_DIR, { recursive: true });
  }

  async save(articleData) {
    await this.ensureDirectory();
    
    const article = {
      id: uuidv4(),
      sourceId: articleData.sourceId,
      url: articleData.url,
      title: articleData.title,
      author: articleData.author || null,
      publishedAt: articleData.publishedAt || new Date().toISOString(),
      scrapedAt: new Date().toISOString(),
      body: articleData.body,
      image: articleData.image || null,
      metadata: {
        wordCount: articleData.body ? articleData.body.split(/\s+/).length : 0,
        language: articleData.language || 'en',
        ...articleData.metadata
      }
    };
    
    const filePath = join(ARTICLES_DIR, `${article.id}.json`);
    await writeFile(filePath, JSON.stringify(article, null, 2));
    
    await manifestManager.addArticle(article);
    
    return article;
  }

  async load(articleId) {
    const filePath = join(ARTICLES_DIR, `${articleId}.json`);
    try {
      const data = await readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async loadMultiple(articleIds) {
    const articles = await Promise.all(
      articleIds.map(id => this.load(id))
    );
    return articles.filter(article => article !== null);
  }

  async delete(articleId) {
    const filePath = join(ARTICLES_DIR, `${articleId}.json`);
    const { unlink } = await import('fs/promises');
    
    try {
      await unlink(filePath);
      await manifestManager.deleteArticle(articleId);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async update(articleId, updates) {
    const article = await this.load(articleId);
    if (!article) {
      throw new Error(`Article ${articleId} not found`);
    }
    
    const updatedArticle = { ...article, ...updates };
    const filePath = join(ARTICLES_DIR, `${articleId}.json`);
    await writeFile(filePath, JSON.stringify(updatedArticle, null, 2));
    
    return updatedArticle;
  }
}

export const articleStorage = new ArticleStorage();
