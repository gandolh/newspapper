import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { config } from '../utils/config.js';
import { manifestManager } from './manifest.js';

const ENTITIES_DIR = join(config.paths.data, 'entities');

interface EntitySet {
  people: string[];
  places: string[];
  organizations: string[];
  events: string[];
}

interface EntitiesData {
  method: string;
  entities: EntitySet;
}

interface EntityRecord extends EntitiesData {
  articleId: string;
  extractedAt: string;
}

interface SearchResult {
  articleId: string;
  matches: string[];
  allEntities: EntitySet;
}

export class EntityStorage {
  async ensureDirectory(): Promise<void> {
    await mkdir(ENTITIES_DIR, { recursive: true });
  }

  async save(articleId: string, entitiesData: EntitiesData): Promise<EntityRecord> {
    await this.ensureDirectory();

    const entities: EntityRecord = {
      articleId,
      method: entitiesData.method,
      extractedAt: new Date().toISOString(),
      entities: {
        people: entitiesData.entities.people || [],
        places: entitiesData.entities.places || [],
        organizations: entitiesData.entities.organizations || [],
        events: entitiesData.entities.events || []
      }
    };

    const filePath = join(ENTITIES_DIR, `${articleId}.json`);
    await writeFile(filePath, JSON.stringify(entities, null, 2));

    await manifestManager.markArticleHasEntities(articleId);

    return entities;
  }

  async load(articleId: string): Promise<EntityRecord | null> {
    const filePath = join(ENTITIES_DIR, `${articleId}.json`);
    try {
      const data = await readFile(filePath, 'utf-8');
      return JSON.parse(data) as EntityRecord;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async loadMultiple(articleIds: string[]): Promise<EntityRecord[]> {
    const entities = await Promise.all(articleIds.map(id => this.load(id)));
    return entities.filter((e): e is EntityRecord => e !== null);
  }

  async delete(articleId: string): Promise<boolean> {
    const filePath = join(ENTITIES_DIR, `${articleId}.json`);
    const { unlink } = await import('fs/promises');

    try {
      await unlink(filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async searchByEntity(entityType: string, entityName: string, articleIds: string[] | null = null): Promise<SearchResult[]> {
    const manifest = await manifestManager.load();

    const articlesWithEntities = articleIds
      ? articleIds.filter(id => manifest.articles[id]?.hasEntities)
      : Object.keys(manifest.articles).filter(id => manifest.articles[id].hasEntities);

    const results: SearchResult[] = [];

    for (const articleId of articlesWithEntities) {
      const entities = await this.load(articleId);
      if (!entities) continue;

      const entityList: string[] = (entities.entities as unknown as Record<string, string[]>)[entityType] || [];
      const matches = entityList.filter(e =>
        e.toLowerCase().includes(entityName.toLowerCase())
      );

      if (matches.length > 0) {
        results.push({
          articleId,
          matches,
          allEntities: entities.entities
        });
      }
    }

    return results;
  }
}

export const entityStorage = new EntityStorage();
