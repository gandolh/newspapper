import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

const MANIFEST_PATH = join(config.paths.data, 'manifest.json');

export class ManifestManager {
  constructor() {
    this.manifest = null;
  }

  async load() {
    try {
      const data = await readFile(MANIFEST_PATH, 'utf-8');
      this.manifest = JSON.parse(data);
      return this.manifest;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.manifest = {
          version: '1.0.0',
          articles: {},
          groups: {},
          summaries: {}
        };
        await this.save();
        return this.manifest;
      }
      throw error;
    }
  }

  async save() {
    await writeFile(MANIFEST_PATH, JSON.stringify(this.manifest, null, 2));
  }

  async addArticle(article) {
    if (!this.manifest) await this.load();
    
    this.manifest.articles[article.id] = {
      id: article.id,
      title: article.title,
      sourceId: article.sourceId,
      scrapedAt: article.scrapedAt,
      status: 'scraped',
      groupId: null,
      hasEntities: false
    };
    
    await this.save();
    return this.manifest.articles[article.id];
  }

  async addGroup(group) {
    if (!this.manifest) await this.load();
    
    this.manifest.groups[group.id] = {
      id: group.id,
      createdAt: group.createdAt,
      threshold: group.threshold,
      status: 'draft',
      articleIds: group.articleIds,
      summaryId: null
    };
    
    group.articleIds.forEach(articleId => {
      if (this.manifest.articles[articleId]) {
        this.manifest.articles[articleId].groupId = group.id;
        this.manifest.articles[articleId].status = 'grouped';
      }
    });
    
    await this.save();
    return this.manifest.groups[group.id];
  }

  async addSummary(summary) {
    if (!this.manifest) await this.load();
    
    this.manifest.summaries[summary.id] = {
      id: summary.id,
      groupId: summary.groupId,
      method: summary.method,
      tone: summary.tone,
      design: summary.design,
      createdAt: summary.createdAt,
      status: 'draft'
    };
    
    if (this.manifest.groups[summary.groupId]) {
      this.manifest.groups[summary.groupId].summaryId = summary.id;
      this.manifest.groups[summary.groupId].status = 'summarized';
    }
    
    await this.save();
    return this.manifest.summaries[summary.id];
  }

  async updateArticleStatus(articleId, status) {
    if (!this.manifest) await this.load();
    
    if (this.manifest.articles[articleId]) {
      this.manifest.articles[articleId].status = status;
      await this.save();
    }
  }

  async updateGroupStatus(groupId, status) {
    if (!this.manifest) await this.load();
    
    if (this.manifest.groups[groupId]) {
      this.manifest.groups[groupId].status = status;
      await this.save();
    }
  }

  async updateSummaryStatus(summaryId, status) {
    if (!this.manifest) await this.load();
    
    if (this.manifest.summaries[summaryId]) {
      this.manifest.summaries[summaryId].status = status;
      await this.save();
    }
  }

  async markArticleHasEntities(articleId) {
    if (!this.manifest) await this.load();
    
    if (this.manifest.articles[articleId]) {
      this.manifest.articles[articleId].hasEntities = true;
      await this.save();
    }
  }

  async getArticlesByStatus(status) {
    if (!this.manifest) await this.load();
    
    return Object.values(this.manifest.articles)
      .filter(article => article.status === status);
  }

  async getGroupsByStatus(status) {
    if (!this.manifest) await this.load();
    
    return Object.values(this.manifest.groups)
      .filter(group => group.status === status);
  }

  async getSummariesByStatus(status) {
    if (!this.manifest) await this.load();
    
    return Object.values(this.manifest.summaries)
      .filter(summary => summary.status === status);
  }

  async getArticle(articleId) {
    if (!this.manifest) await this.load();
    return this.manifest.articles[articleId] || null;
  }

  async getGroup(groupId) {
    if (!this.manifest) await this.load();
    return this.manifest.groups[groupId] || null;
  }

  async getSummary(summaryId) {
    if (!this.manifest) await this.load();
    return this.manifest.summaries[summaryId] || null;
  }

  async deleteArticle(articleId) {
    if (!this.manifest) await this.load();
    
    delete this.manifest.articles[articleId];
    await this.save();
  }

  async deleteGroup(groupId) {
    if (!this.manifest) await this.load();
    
    const group = this.manifest.groups[groupId];
    if (group) {
      group.articleIds.forEach(articleId => {
        if (this.manifest.articles[articleId]) {
          this.manifest.articles[articleId].groupId = null;
          this.manifest.articles[articleId].status = 'scraped';
        }
      });
    }
    
    delete this.manifest.groups[groupId];
    await this.save();
  }

  async deleteSummary(summaryId) {
    if (!this.manifest) await this.load();
    
    const summary = this.manifest.summaries[summaryId];
    if (summary && this.manifest.groups[summary.groupId]) {
      this.manifest.groups[summary.groupId].summaryId = null;
      this.manifest.groups[summary.groupId].status = 'reviewed';
    }
    
    delete this.manifest.summaries[summaryId];
    await this.save();
  }
}

export const manifestManager = new ManifestManager();
