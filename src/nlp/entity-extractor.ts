import { Ollama } from "ollama";
import { config } from "../utils/config.js";
import { logger } from "../utils/logger.js";
import { db } from "../storage/database.js";

interface EntityResult {
  people: string[];
  places: string[];
  organizations: string[];
  events: string[];
}

const EMPTY: EntityResult = {
  people: [],
  places: [],
  organizations: [],
  events: [],
};

const SYSTEM_PROMPT = `You are a named entity recognition system. Extract entities from the given text.
Return only valid JSON with these exact keys: people, places, organizations, events.
Each key maps to an array of strings. Arrays may be empty. No markdown, no explanation.`;

function buildPrompt(text: string): string {
  return `Extract named entities from this text:\n\n${text.slice(0, 1000)}\n\nReturn JSON: {"people":[],"places":[],"organizations":[],"events":[]}`;
}

function parseResponse(raw: string): EntityResult {
  try {
    const stripped = raw
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(stripped) as Partial<EntityResult>;
    const clean = (arr: unknown): string[] =>
      Array.isArray(arr)
        ? arr
            .filter(
              (v): v is string => typeof v === "string" && v.trim().length >= 2,
            )
            .map((v) => v.trim())
        : [];
    return {
      people: clean(parsed.people),
      places: clean(parsed.places),
      organizations: clean(parsed.organizations),
      events: clean(parsed.events),
    };
  } catch {
    return EMPTY;
  }
}

export class EntityExtractor {
  private ollama: Ollama | null = null;

  private getOllama(): Ollama {
    if (!this.ollama) {
      this.ollama = new Ollama({
        host: config.ollama.host,
        ...(config.ollama.apiKey
          ? { headers: { Authorization: `Bearer ${config.ollama.apiKey}` } }
          : {}),
      });
    }
    return this.ollama;
  }

  async extractAndSaveForArticle(
    articleId: string,
    text: string,
  ): Promise<void> {
    logger.debug(`Extracting entities for article ${articleId}`);

    let entities = EMPTY;
    try {
      const response = await this.getOllama().chat({
        model: config.ollama.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildPrompt(text) },
        ],
        options: { temperature: 0 },
      });
      entities = parseResponse(response.message.content);
    } catch (err) {
      logger.warn(
        `Ollama entity extraction failed for ${articleId}: ${(err as Error).message}`,
      );
      return;
    }

    const save = (type: string, value: string) => {
      const entityId = db.upsertEntity(type, value);
      db.linkArticleEntity(articleId, entityId);
    };

    entities.people.forEach((v) => save("person", v));
    entities.places.forEach((v) => save("place", v));
    entities.organizations.forEach((v) => save("organization", v));
    entities.events.forEach((v) => save("event", v));

    logger.debug(
      `Extracted ${entities.people.length} people, ${entities.places.length} places, ` +
        `${entities.organizations.length} orgs, ${entities.events.length} events`,
    );
  }
}

export const entityExtractor = new EntityExtractor();
