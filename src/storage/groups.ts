import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../utils/config.js';
import { manifestManager } from './manifest.js';

const GROUPS_DIR = join(config.paths.data, 'groups');

interface EntitySet {
  people: string[];
  places: string[];
  organizations: string[];
  events: string[];
}

interface GroupData {
  articleIds: string[];
  threshold?: number;
  centroid?: number[] | null;
  commonEntities?: EntitySet;
}

interface Group extends GroupData {
  id: string;
  createdAt: string;
  threshold: number;
  centroid: number[] | null;
  commonEntities: EntitySet;
}

export class GroupStorage {
  async ensureDirectory(): Promise<void> {
    await mkdir(GROUPS_DIR, { recursive: true });
  }

  async save(groupData: GroupData): Promise<Group> {
    await this.ensureDirectory();

    const group: Group = {
      id: uuidv4(),
      articleIds: groupData.articleIds,
      createdAt: new Date().toISOString(),
      threshold: groupData.threshold ?? 0,
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

  async load(groupId: string): Promise<Group | null> {
    const filePath = join(GROUPS_DIR, `${groupId}.json`);
    try {
      const data = await readFile(filePath, 'utf-8');
      return JSON.parse(data) as Group;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async update(groupId: string, updates: Partial<Group>): Promise<Group> {
    const group = await this.load(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const updatedGroup = { ...group, ...updates };
    const filePath = join(GROUPS_DIR, `${groupId}.json`);
    await writeFile(filePath, JSON.stringify(updatedGroup, null, 2));

    return updatedGroup;
  }

  async delete(groupId: string): Promise<boolean> {
    const filePath = join(GROUPS_DIR, `${groupId}.json`);
    const { unlink } = await import('fs/promises');

    try {
      await unlink(filePath);
      await manifestManager.deleteGroup(groupId);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async addArticleToGroup(groupId: string, articleId: string): Promise<Group> {
    const group = await this.load(groupId);
    if (!group) throw new Error(`Group ${groupId} not found`);

    if (!group.articleIds.includes(articleId)) {
      group.articleIds.push(articleId);
      await this.update(groupId, group);
    }

    return group;
  }

  async removeArticleFromGroup(groupId: string, articleId: string): Promise<Group> {
    const group = await this.load(groupId);
    if (!group) throw new Error(`Group ${groupId} not found`);

    group.articleIds = group.articleIds.filter(id => id !== articleId);
    await this.update(groupId, group);

    return group;
  }
}

export const groupStorage = new GroupStorage();
