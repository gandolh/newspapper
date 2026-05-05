import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { config } from '../utils/config.js';

const MANIFEST_PATH = join(config.paths.data, 'manifest.json');

interface ArticleEntry {
  id: string;
  title: string;
  sourceId: string;
  scrapedAt: string;
  status: string;
  groupId: string | null;
  hasEntities: boolean;
}

interface GroupEntry {
  id: string;
  createdAt: string;
  threshold: number;
  status: string;
  articleIds: string[];
  summaryId: string | null;
}

interface SummaryEntry {
  id: string;
  groupId: string;
  method: string;
  tone: string;
  design: string;
  createdAt: string;
  status: string;
}

interface Manifest {
  version: string;
  articles: Record<string, ArticleEntry>;
  groups: Record<string, GroupEntry>;
  summaries: Record<string, SummaryEntry>;
}

export class ManifestManager {
  private manifest: Manifest | null = null;

  async load(): Promise<Manifest> {
    try {
      const data = await readFile(MANIFEST_PATH, 'utf-8');
      this.manifest = JSON.parse(data) as Manifest;
      return this.manifest;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
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

  async save(): Promise<void> {
    await writeFile(MANIFEST_PATH, JSON.stringify(this.manifest, null, 2));
  }

  async addArticle(article: { id: string; title: string; sourceId: string; scrapedAt: string }): Promise<ArticleEntry> {
    if (!this.manifest) await this.load();
    const m = this.manifest!;

    m.articles[article.id] = {
      id: article.id,
      title: article.title,
      sourceId: article.sourceId,
      scrapedAt: article.scrapedAt,
      status: 'scraped',
      groupId: null,
      hasEntities: false
    };

    await this.save();
    return m.articles[article.id];
  }

  async addGroup(group: { id: string; createdAt: string; threshold: number; articleIds: string[] }): Promise<GroupEntry> {
    if (!this.manifest) await this.load();
    const m = this.manifest!;

    m.groups[group.id] = {
      id: group.id,
      createdAt: group.createdAt,
      threshold: group.threshold,
      status: 'draft',
      articleIds: group.articleIds,
      summaryId: null
    };

    group.articleIds.forEach(articleId => {
      if (m.articles[articleId]) {
        m.articles[articleId].groupId = group.id;
        m.articles[articleId].status = 'grouped';
      }
    });

    await this.save();
    return m.groups[group.id];
  }

  async addSummary(summary: { id: string; groupId: string; method: string; tone: string; design: string; createdAt: string }): Promise<SummaryEntry> {
    if (!this.manifest) await this.load();
    const m = this.manifest!;

    m.summaries[summary.id] = {
      id: summary.id,
      groupId: summary.groupId,
      method: summary.method,
      tone: summary.tone,
      design: summary.design,
      createdAt: summary.createdAt,
      status: 'draft'
    };

    if (m.groups[summary.groupId]) {
      m.groups[summary.groupId].summaryId = summary.id;
      m.groups[summary.groupId].status = 'summarized';
    }

    await this.save();
    return m.summaries[summary.id];
  }

  async updateArticleStatus(articleId: string, status: string): Promise<void> {
    if (!this.manifest) await this.load();
    const m = this.manifest!;
    if (m.articles[articleId]) {
      m.articles[articleId].status = status;
      await this.save();
    }
  }

  async updateGroupStatus(groupId: string, status: string): Promise<void> {
    if (!this.manifest) await this.load();
    const m = this.manifest!;
    if (m.groups[groupId]) {
      m.groups[groupId].status = status;
      await this.save();
    }
  }

  async updateSummaryStatus(summaryId: string, status: string): Promise<void> {
    if (!this.manifest) await this.load();
    const m = this.manifest!;
    if (m.summaries[summaryId]) {
      m.summaries[summaryId].status = status;
      await this.save();
    }
  }

  async markArticleHasEntities(articleId: string): Promise<void> {
    if (!this.manifest) await this.load();
    const m = this.manifest!;
    if (m.articles[articleId]) {
      m.articles[articleId].hasEntities = true;
      await this.save();
    }
  }

  async getArticlesByStatus(status: string): Promise<ArticleEntry[]> {
    if (!this.manifest) await this.load();
    return Object.values(this.manifest!.articles).filter(a => a.status === status);
  }

  async getGroupsByStatus(status: string): Promise<GroupEntry[]> {
    if (!this.manifest) await this.load();
    return Object.values(this.manifest!.groups).filter(g => g.status === status);
  }

  async getSummariesByStatus(status: string): Promise<SummaryEntry[]> {
    if (!this.manifest) await this.load();
    return Object.values(this.manifest!.summaries).filter(s => s.status === status);
  }

  async getArticle(articleId: string): Promise<ArticleEntry | null> {
    if (!this.manifest) await this.load();
    return this.manifest!.articles[articleId] || null;
  }

  async getGroup(groupId: string): Promise<GroupEntry | null> {
    if (!this.manifest) await this.load();
    return this.manifest!.groups[groupId] || null;
  }

  async getSummary(summaryId: string): Promise<SummaryEntry | null> {
    if (!this.manifest) await this.load();
    return this.manifest!.summaries[summaryId] || null;
  }

  async deleteArticle(articleId: string): Promise<void> {
    if (!this.manifest) await this.load();
    delete this.manifest!.articles[articleId];
    await this.save();
  }

  async deleteGroup(groupId: string): Promise<void> {
    if (!this.manifest) await this.load();
    const m = this.manifest!;
    const group = m.groups[groupId];
    if (group) {
      group.articleIds.forEach(articleId => {
        if (m.articles[articleId]) {
          m.articles[articleId].groupId = null;
          m.articles[articleId].status = 'scraped';
        }
      });
    }
    delete m.groups[groupId];
    await this.save();
  }

  async deleteSummary(summaryId: string): Promise<void> {
    if (!this.manifest) await this.load();
    const m = this.manifest!;
    const summary = m.summaries[summaryId];
    if (summary && m.groups[summary.groupId]) {
      m.groups[summary.groupId].summaryId = null;
      m.groups[summary.groupId].status = 'reviewed';
    }
    delete m.summaries[summaryId];
    await this.save();
  }
}

export const manifestManager = new ManifestManager();
