import nlp from 'compromise';
import { logger } from '../utils/logger.js';
import { db } from '../storage/database.js';

interface EntityResult {
  people: string[];
  places: string[];
  organizations: string[];
  events: string[];
}

// Reject obvious garbage from compromise on non-English text
function isValidEntity(value: string): boolean {
  const v = value.trim();
  if (v.length < 3) return false;
  // starts or ends with punctuation/special chars
  if (/^[^a-zA-ZÀ-ÖØ-öø-ÿ]/.test(v)) return false;
  if (/[.,;:!?()[\]{}"'–—]$/.test(v)) return false;
  // purely numeric
  if (/^\d+$/.test(v)) return false;
  // single word all-lowercase under 4 chars (articles, prepositions leaking through)
  if (/^[a-z]{1,3}$/.test(v)) return false;
  // contains sentence-like fragments (compromise sometimes grabs whole clauses)
  if (v.split(/\s+/).length > 5) return false;
  return true;
}

function cleanEntity(value: string): string {
  return value
    .trim()
    .replace(/^[^a-zA-ZÀ-ÖØ-öø-ÿ0-9]+/, '') // strip leading punctuation
    .replace(/[.,;:!?()\-–—]+$/, '')           // strip trailing punctuation
    .trim();
}

export class EntityExtractor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractEvents(doc: any): string[] {
    const events: string[] = [];
    const eventPatterns = [
      /\b(summit|conference|meeting|election|vote|referendum|protest|strike|war|conflict|crisis|disaster|attack|incident)\b/gi,
      /\b(announced|declared|signed|launched|unveiled|revealed|introduced)\b/gi,
    ];
    const sentences: string[] = doc.sentences().out('array');
    for (const sentence of sentences) {
      for (const pattern of eventPatterns) {
        const matches = sentence.match(pattern);
        if (matches) {
          const words = sentence.split(/\s+/);
          for (const match of matches) {
            const index = words.findIndex((w: string) => w.toLowerCase().includes(match.toLowerCase()));
            if (index !== -1) {
              const context = words.slice(Math.max(0, index - 5), index + 6).join(' ');
              if (context.length > 10 && context.length < 100) events.push(context);
            }
          }
        }
      }
    }
    return events.slice(0, 10);
  }

  async extractAndSaveForArticle(articleId: string, text: string): Promise<void> {
    logger.debug(`Extracting entities for article ${articleId}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = nlp(text) as any;

    const clean = (arr: string[]) =>
      [...new Set(arr.map(cleanEntity).filter(isValidEntity))];

    const entities: EntityResult = {
      people: clean(doc.people().out('array')),
      places: clean(doc.places().out('array')),
      organizations: clean(doc.organizations().out('array')),
      events: clean(this.extractEvents(doc)),
    };

    const save = (type: string, value: string) => {
      const entityId = db.upsertEntity(type, value);
      db.linkArticleEntity(articleId, entityId);
    };

    entities.people.forEach(v => save('person', v));
    entities.places.forEach(v => save('place', v));
    entities.organizations.forEach(v => save('organization', v));
    entities.events.forEach(v => save('event', v));

    logger.debug(
      `Extracted ${entities.people.length} people, ${entities.places.length} places, ` +
      `${entities.organizations.length} orgs, ${entities.events.length} events`
    );
  }
}

export const entityExtractor = new EntityExtractor();
