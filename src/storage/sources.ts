import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { config } from '../utils/config.js';

const SOURCES_PATH = join(config.paths.data, 'sources.json');

export interface Source {
  id: string;
  name: string;
  url: string;
  rss: string | null;
  scraperType: string;
  selectors: Record<string, string>;
  enabled: boolean;
}

export class SourceManager {
  private sources: Source[] | null = null;

  async load(): Promise<Source[]> {
    try {
      const data = await readFile(SOURCES_PATH, 'utf-8');
      this.sources = JSON.parse(data) as Source[];
      return this.sources;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.sources = [];
        await this.save();
        return this.sources;
      }
      throw error;
    }
  }

  async save(): Promise<void> {
    await writeFile(SOURCES_PATH, JSON.stringify(this.sources, null, 2));
  }

  async getAll(): Promise<Source[]> {
    if (!this.sources) await this.load();
    return this.sources!;
  }

  async getEnabled(): Promise<Source[]> {
    if (!this.sources) await this.load();
    return this.sources!.filter(source => source.enabled !== false);
  }

  async getById(sourceId: string): Promise<Source | undefined> {
    if (!this.sources) await this.load();
    return this.sources!.find(source => source.id === sourceId);
  }

  async getByName(sourceName: string): Promise<Source | undefined> {
    if (!this.sources) await this.load();
    return this.sources!.find(source =>
      source.name.toLowerCase() === sourceName.toLowerCase()
    );
  }

  async add(sourceData: Partial<Source> & { name: string; url: string }): Promise<Source> {
    if (!this.sources) await this.load();

    const source: Source = {
      id: sourceData.id || sourceData.name.toLowerCase().replace(/\s+/g, '-'),
      name: sourceData.name,
      url: sourceData.url,
      rss: sourceData.rss || null,
      scraperType: sourceData.scraperType || 'http',
      selectors: sourceData.selectors || {},
      enabled: sourceData.enabled !== false
    };

    this.sources!.push(source);
    await this.save();

    return source;
  }

  async update(sourceId: string, updates: Partial<Source>): Promise<Source> {
    if (!this.sources) await this.load();

    const index = this.sources!.findIndex(s => s.id === sourceId);
    if (index === -1) {
      throw new Error(`Source ${sourceId} not found`);
    }

    this.sources![index] = { ...this.sources![index], ...updates };
    await this.save();

    return this.sources![index];
  }

  async delete(sourceId: string): Promise<boolean> {
    if (!this.sources) await this.load();

    const index = this.sources!.findIndex(s => s.id === sourceId);
    if (index === -1) {
      return false;
    }

    this.sources!.splice(index, 1);
    await this.save();

    return true;
  }
}

export const sourceManager = new SourceManager();
