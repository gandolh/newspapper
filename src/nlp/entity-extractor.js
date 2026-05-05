import nlp from 'compromise';
import { logger } from '../utils/logger.js';

export class EntityExtractor {
  async extractWithCompromise(text) {
    logger.debug('Extracting entities with compromise');
    
    const doc = nlp(text);
    
    const people = doc.people().out('array');
    const places = doc.places().out('array');
    const organizations = doc.organizations().out('array');
    
    const events = this.extractEvents(doc);
    
    return {
      people: [...new Set(people)],
      places: [...new Set(places)],
      organizations: [...new Set(organizations)],
      events: [...new Set(events)]
    };
  }

  async extractWithTransformers(text) {
    logger.debug('Extracting entities with transformers (not yet implemented)');
    
    logger.warn('Transformers-based NER not implemented yet, falling back to compromise');
    return await this.extractWithCompromise(text);
  }

  extractEvents(doc) {
    const events = [];
    
    const eventPatterns = [
      /\b(summit|conference|meeting|election|vote|referendum|protest|strike|war|conflict|crisis|disaster|attack|incident)\b/gi,
      /\b(announced|declared|signed|launched|unveiled|revealed|introduced)\b/gi
    ];
    
    const sentences = doc.sentences().out('array');
    
    for (const sentence of sentences) {
      for (const pattern of eventPatterns) {
        const matches = sentence.match(pattern);
        if (matches) {
          const words = sentence.split(/\s+/);
          const contextWindow = 5;
          
          for (const match of matches) {
            const index = words.findIndex(w => w.toLowerCase().includes(match.toLowerCase()));
            if (index !== -1) {
              const start = Math.max(0, index - contextWindow);
              const end = Math.min(words.length, index + contextWindow + 1);
              const context = words.slice(start, end).join(' ');
              
              if (context.length > 10 && context.length < 100) {
                events.push(context);
              }
            }
          }
        }
      }
    }
    
    return events.slice(0, 10);
  }

  async extract(text, method = 'compromise') {
    if (method === 'transformers') {
      return await this.extractWithTransformers(text);
    }
    return await this.extractWithCompromise(text);
  }
}

export const entityExtractor = new EntityExtractor();
