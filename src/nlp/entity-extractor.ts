import nlp from 'compromise';
import { logger } from '../utils/logger.js';

interface EntityResult {
  people: string[];
  places: string[];
  organizations: string[];
  events: string[];
}

export class EntityExtractor {
  async extractWithCompromise(text: string): Promise<EntityResult> {
    logger.debug('Extracting entities with compromise');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = nlp(text) as any;

    const people: string[] = doc.people().out('array');
    const places: string[] = doc.places().out('array');
    const organizations: string[] = doc.organizations().out('array');

    const events = this.extractEvents(doc);

    return {
      people: [...new Set(people)],
      places: [...new Set(places)],
      organizations: [...new Set(organizations)],
      events: [...new Set(events)]
    };
  }

  async extractWithTransformers(text: string): Promise<EntityResult> {
    logger.debug('Extracting entities with transformers (not yet implemented)');
    logger.warn('Transformers-based NER not implemented yet, falling back to compromise');
    return await this.extractWithCompromise(text);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extractEvents(doc: any): string[] {
    const events: string[] = [];

    const eventPatterns = [
      /\b(summit|conference|meeting|election|vote|referendum|protest|strike|war|conflict|crisis|disaster|attack|incident)\b/gi,
      /\b(announced|declared|signed|launched|unveiled|revealed|introduced)\b/gi
    ];

    const sentences: string[] = doc.sentences().out('array');

    for (const sentence of sentences) {
      for (const pattern of eventPatterns) {
        const matches = sentence.match(pattern);
        if (matches) {
          const words = sentence.split(/\s+/);
          const contextWindow = 5;

          for (const match of matches) {
            const index = words.findIndex((w: string) => w.toLowerCase().includes(match.toLowerCase()));
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

  async extract(text: string, method = 'compromise'): Promise<EntityResult> {
    if (method === 'transformers') {
      return await this.extractWithTransformers(text);
    }
    return await this.extractWithCompromise(text);
  }
}

export const entityExtractor = new EntityExtractor();
