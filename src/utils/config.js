import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || ''
  },
  
  ollama: {
    host: process.env.OLLAMA_HOST || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.2:1b'
  },
  
  scraping: {
    userAgent: process.env.USER_AGENT || 'Newspapper/1.0',
    timeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3
  },
  
  clustering: {
    defaultThreshold: parseFloat(process.env.DEFAULT_SIMILARITY_THRESHOLD) || 0.75,
    minGroupSize: parseInt(process.env.MIN_GROUP_SIZE) || 2
  },
  
  images: {
    format: process.env.IMAGE_FORMAT || 'png',
    quality: parseInt(process.env.IMAGE_QUALITY) || 90,
    size: process.env.IMAGE_SIZE || '1080x1080'
  },
  
  retention: {
    defaultDays: parseInt(process.env.DEFAULT_RETENTION_DAYS) || 30
  },
  
  paths: {
    root: join(__dirname, '../..'),
    data: join(__dirname, '../../data'),
    output: join(__dirname, '../../output'),
    designSystems: join(__dirname, '../../design-systems'),
    prompts: join(__dirname, '../../prompts'),
    templates: join(__dirname, '../../templates')
  }
};
