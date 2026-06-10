import type { PostPayload } from '../types.js';
import type { OllamaConfig } from './types.js';
import { OllamaClient } from './ollama.js';
import { ComposeParseError } from './parse.js';

export interface CaptionResult {
  caption: string;
  hashtags: string[];
}

const CAPTION_SYSTEM = `You are a social media copywriter. You will receive a news post (title and slide texts) and must produce an Instagram caption for it.

OUTPUT RULES:
- Respond with JSON only. No markdown fences, no prose before or after.
- The JSON must match exactly:
  { "caption": "...", "hashtags": ["tag1", "tag2", ...] }
- caption: 1–2 short paragraphs. Engaging but factual. No emoji.
- hashtags: 5–10 items. Each item is a bare word or phrase — NO leading # character, no spaces within a tag (use CamelCase or run-together). They will be prefixed with # at display time.`;

function buildCaptionPrompt(post: PostPayload): string {
  const slideTexts = post.slides
    .map((s, i) => {
      if (s.type === 'title') return `Slide ${i + 1} (title): ${s.text}`;
      if (s.type === 'quote') return `Slide ${i + 1} (quote): "${s.quote}" — ${s.attribution}`;
      if (s.variant === 'body-text') return `Slide ${i + 1}: ${s.heading} — ${s.body}`;
      if (s.variant === 'body-list') return `Slide ${i + 1}: ${s.heading} — ${s.items.join('; ')}`;
      if (s.variant === 'body-comparison') {
        return `Slide ${i + 1}: ${s.heading} — ${s.left.label}: ${s.left.body} vs ${s.right.label}: ${s.right.body}`;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');

  return `Post title: ${post.title}\n\nSlides:\n${slideTexts}\n\nNow produce the JSON caption.`;
}

function normalizeHashtags(raw: unknown[]): string[] {
  return raw
    .filter((t) => typeof t === 'string')
    .map((t) => {
      let tag = (t as string).trim();
      // Strip any leading # characters
      tag = tag.replace(/^#+/, '');
      // Strip spaces
      tag = tag.replace(/\s+/g, '');
      return tag;
    })
    .filter((t) => t.length > 0);
}

function parseCaptionResponse(raw: string): CaptionResult {
  // Strip fenced blocks if present
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonStr = fenced ? fenced[1].trim() : raw.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Try to find JSON object in response
    const first = jsonStr.indexOf('{');
    const last = jsonStr.lastIndexOf('}');
    if (first !== -1 && last > first) {
      try {
        parsed = JSON.parse(jsonStr.slice(first, last + 1));
      } catch {
        throw new ComposeParseError('generateCaption: invalid JSON in response', raw);
      }
    } else {
      throw new ComposeParseError('generateCaption: no JSON object found in response', raw);
    }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ComposeParseError('generateCaption: response is not an object', raw);
  }
  const obj = parsed as Record<string, unknown>;

  if (typeof obj['caption'] !== 'string' || obj['caption'].length === 0) {
    throw new ComposeParseError('generateCaption: missing or empty caption', raw);
  }
  if (!Array.isArray(obj['hashtags'])) {
    throw new ComposeParseError('generateCaption: hashtags must be an array', raw);
  }

  return {
    caption: obj['caption'],
    hashtags: normalizeHashtags(obj['hashtags']),
  };
}

/**
 * Generate an Instagram caption and hashtags for a composed post.
 * Hashtags are stored bare (no leading #).
 */
export async function generateCaption(
  post: PostPayload,
  cfg: OllamaConfig,
): Promise<CaptionResult> {
  const client = new OllamaClient(cfg);
  const userPrompt = buildCaptionPrompt(post);

  const raw = await client.generate(userPrompt, { json: true, system: CAPTION_SYSTEM });

  try {
    return parseCaptionResponse(raw);
  } catch (err) {
    if (!(err instanceof ComposeParseError)) throw err;
    // Retry once
    const retryPrompt = `${userPrompt}\n\nYour previous output was invalid: ${err.message}\nOutput valid JSON only.`;
    const raw2 = await client.generate(retryPrompt, { json: true, system: CAPTION_SYSTEM });
    return parseCaptionResponse(raw2);
  }
}
