import { readFile } from 'fs/promises';
import { join } from 'path';
import yaml from 'js-yaml';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export class DesignLoader {
  constructor() {
    this.designs = {};
  }

  async load(designName) {
    if (this.designs[designName]) {
      return this.designs[designName];
    }

    const designPath = join(config.paths.designSystems, `${designName}.yaml`);
    
    try {
      const content = await readFile(designPath, 'utf-8');
      const design = yaml.load(content);
      
      this.designs[designName] = design;
      logger.debug(`Loaded design system: ${designName}`);
      
      return design;
    } catch (error) {
      logger.error(`Failed to load design system ${designName}: ${error.message}`);
      throw error;
    }
  }

  async getAvailable() {
    return ['digital-broadsheet', 'warm-industrial'];
  }
}

export const designLoader = new DesignLoader();
