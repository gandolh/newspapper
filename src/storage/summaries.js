import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../utils/config.js';
import { manifestManager } from './manifest.js';

const SUMMARIES_DIR = join(config.paths.data, 'summaries');

export class SummaryStorage {
  async ensureDirectory() {
    await mkdir(SUMMARIES_DIR, { recursive: true });
  }

  async save(summaryData) {
    await this.ensureDirectory();
    
    const summary = {
      id: uuidv4(),
      groupId: summaryData.groupId,
      method: summaryData.method,
      tone: summaryData.tone,
      design: summaryData.design || 'broadsheet',
      createdAt: new Date().toISOString(),
      slides: summaryData.slides || []
    };
    
    const filePath = join(SUMMARIES_DIR, `${summary.id}.json`);
    await writeFile(filePath, JSON.stringify(summary, null, 2));
    
    await manifestManager.addSummary(summary);
    
    return summary;
  }

  async load(summaryId) {
    const filePath = join(SUMMARIES_DIR, `${summaryId}.json`);
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

  async update(summaryId, updates) {
    const summary = await this.load(summaryId);
    if (!summary) {
      throw new Error(`Summary ${summaryId} not found`);
    }
    
    const updatedSummary = { ...summary, ...updates };
    const filePath = join(SUMMARIES_DIR, `${summaryId}.json`);
    await writeFile(filePath, JSON.stringify(updatedSummary, null, 2));
    
    return updatedSummary;
  }

  async delete(summaryId) {
    const filePath = join(SUMMARIES_DIR, `${summaryId}.json`);
    const { unlink } = await import('fs/promises');
    
    try {
      await unlink(filePath);
      await manifestManager.deleteSummary(summaryId);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async getByGroup(groupId) {
    await manifestManager.load();
    const summaries = Object.values(manifestManager.manifest.summaries)
      .filter(s => s.groupId === groupId);
    
    return await Promise.all(
      summaries.map(s => this.load(s.id))
    );
  }
}

export const summaryStorage = new SummaryStorage();
