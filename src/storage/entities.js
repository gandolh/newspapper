import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { config } from '../utils/config.js';
import { manifestManager } from './manifest.js';

const ENTITIES_DIR = join(config.paths.data, 'entities');

export class EntityStorage {
  async ensureDirectory() {
    await mkdir(ENTITIES_DIR, { recursive: true });
  }

  async save(articleId, entitiesData) {
    await this.ensureDirectory();
    
    const entities = {
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

  async load(articleId) {
    const filePath = join(ENTITIES_DIR, `${articleId}.json`);
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
    const entities = await Promise.all(
      articleIds.map(id => this.load(id))
    );
    return entities.filter(entity => entity !== null);
  }

  async delete(articleId) {
    const filePath = join(ENTITIES_DIR, `${articleId}.json`);
    const { unlink } = await import('fs/promises');
    
    try {
      await unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async searchByEntity(entityType, entityName, articleIds = null) {
    await manifestManager.load();
    
    const articlesWithEntities = articleIds 
      ? articleIds.filter(id => manifestManager.manifest.articles[id]?.hasEntities)
      : Object.keys(manifestManager.manifest.articles)
          .filter(id => manifestManager.manifest.articles[id].hasEntities);
    
    const results = [];
    
    for (const articleId of articlesWithEntities) {
      const entities = await this.load(articleId);
      if (!entities) continue;
      
      const entityList = entities.entities[entityType] || [];
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
