import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../utils/config.js';
import { manifestManager } from './manifest.js';

const GROUPS_DIR = join(config.paths.data, 'groups');

export class GroupStorage {
  async ensureDirectory() {
    await mkdir(GROUPS_DIR, { recursive: true });
  }

  async save(groupData) {
    await this.ensureDirectory();
    
    const group = {
      id: uuidv4(),
      articleIds: groupData.articleIds,
      createdAt: new Date().toISOString(),
      threshold: groupData.threshold,
      centroid: groupData.centroid || null,
      commonEntities: groupData.commonEntities || {
        people: [],
        places: [],
        organizations: [],
        events: []
      }
    };
    
    const filePath = join(GROUPS_DIR, `${group.id}.json`);
    await writeFile(filePath, JSON.stringify(group, null, 2));
    
    await manifestManager.addGroup(group);
    
    return group;
  }

  async load(groupId) {
    const filePath = join(GROUPS_DIR, `${groupId}.json`);
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

  async update(groupId, updates) {
    const group = await this.load(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }
    
    const updatedGroup = { ...group, ...updates };
    const filePath = join(GROUPS_DIR, `${groupId}.json`);
    await writeFile(filePath, JSON.stringify(updatedGroup, null, 2));
    
    return updatedGroup;
  }

  async delete(groupId) {
    const filePath = join(GROUPS_DIR, `${groupId}.json`);
    const { unlink } = await import('fs/promises');
    
    try {
      await unlink(filePath);
      await manifestManager.deleteGroup(groupId);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async addArticleToGroup(groupId, articleId) {
    const group = await this.load(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }
    
    if (!group.articleIds.includes(articleId)) {
      group.articleIds.push(articleId);
      await this.update(groupId, group);
    }
    
    return group;
  }

  async removeArticleFromGroup(groupId, articleId) {
    const group = await this.load(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }
    
    group.articleIds = group.articleIds.filter(id => id !== articleId);
    await this.update(groupId, group);
    
    return group;
  }
}

export const groupStorage = new GroupStorage();
