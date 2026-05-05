import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { config } from '../utils/config.js';

const SOURCES_PATH = join(config.paths.data, 'sources.json');

export class SourceManager {
  constructor() {
    this.sources = null;
  }

  async load() {
    try {
      const data = await readFile(SOURCES_PATH, 'utf-8');
      this.sources = JSON.parse(data);
      return this.sources;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.sources = [];
        await this.save();
        return this.sources;
      }
      throw error;
    }
  }

  async save() {
    await writeFile(SOURCES_PATH, JSON.stringify(this.sources, null, 2));
  }

  async getAll() {
    if (!this.sources) await this.load();
    return this.sources;
  }

  async getEnabled() {
    if (!this.sources) await this.load();
    return this.sources.filter(source => source.enabled !== false);
  }

  async getById(sourceId) {
    if (!this.sources) await this.load();
    return this.sources.find(source => source.id === sourceId);
  }

  async getByName(sourceName) {
    if (!this.sources) await this.load();
    return this.sources.find(source => 
      source.name.toLowerCase() === sourceName.toLowerCase()
    );
  }

  async add(sourceData) {
    if (!this.sources) await this.load();
    
    const source = {
      id: sourceData.id || sourceData.name.toLowerCase().replace(/\s+/g, '-'),
      name: sourceData.name,
      url: sourceData.url,
      rss: sourceData.rss || null,
      scraperType: sourceData.scraperType || 'http',
      selectors: sourceData.selectors || {},
      enabled: sourceData.enabled !== false
    };
    
    this.sources.push(source);
    await this.save();
    
    return source;
  }

  async update(sourceId, updates) {
    if (!this.sources) await this.load();
    
    const index = this.sources.findIndex(s => s.id === sourceId);
    if (index === -1) {
      throw new Error(`Source ${sourceId} not found`);
    }
    
    this.sources[index] = { ...this.sources[index], ...updates };
    await this.save();
    
    return this.sources[index];
  }

  async delete(sourceId) {
    if (!this.sources) await this.load();
    
    const index = this.sources.findIndex(s => s.id === sourceId);
    if (index === -1) {
      return false;
    }
    
    this.sources.splice(index, 1);
    await this.save();
    
    return true;
  }
}

export const sourceManager = new SourceManager();
