import type { Article, PostPayload } from '../types.js';
import type { OllamaConfig } from './types.js';
import { OllamaClient } from './ollama.js';
import { DEFAULT_PROMPT, buildUserPrompt } from './prompt.js';
import { parsePost, ComposeParseError } from './parse.js';

export interface ComposePostOptions {
  theme: string;
  date: string;
  promptOverride?: string;
}

/**
 * Compose a full post from today's articles using Ollama.
 * On parse failure, retries once with the parse error appended; throws ComposeParseError on second failure.
 */
export async function composePost(
  articles: Article[],
  cfg: OllamaConfig,
  opts: ComposePostOptions,
): Promise<PostPayload> {
  const client = new OllamaClient(cfg);
  const systemPrompt = opts.promptOverride ?? DEFAULT_PROMPT;
  const userPrompt = buildUserPrompt(articles);

  // First attempt
  let raw: string;
  try {
    raw = await client.generate(userPrompt, { json: true, system: systemPrompt });
  } catch (err) {
    throw err;
  }

  let firstParseError: ComposeParseError | null = null;
  try {
    return parsePost(raw, opts.date, opts.theme);
  } catch (err) {
    if (!(err instanceof ComposeParseError)) throw err;
    firstParseError = err;
  }

  // Retry once with parse error feedback
  const retryPrompt = `${userPrompt}\n\nYour previous output was invalid: ${firstParseError.message}\n\nPlease output valid JSON only, matching the schema exactly.`;
  const raw2 = await client.generate(retryPrompt, { json: true, system: systemPrompt });

  try {
    return parsePost(raw2, opts.date, opts.theme);
  } catch (err) {
    if (!(err instanceof ComposeParseError)) throw err;
    throw new ComposeParseError(
      `composePost failed after retry: ${err.message}`,
      raw2,
    );
  }
}
