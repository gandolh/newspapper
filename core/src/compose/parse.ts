import type { PostPayload, SlideBlock } from '../types.js';

export class ComposeParseError extends Error {
  constructor(
    message: string,
    public raw: string,
  ) {
    super(message);
    this.name = 'ComposeParseError';
  }
}

export function parsePost(raw: string, date: string, theme: string): PostPayload {
  const json = extractJson(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new ComposeParseError(`invalid JSON: ${(err as Error).message}`, raw);
  }
  if (!isRecord(parsed)) throw new ComposeParseError('top level not an object', raw);

  const title = parsed['title'];
  const slides = parsed['slides'];
  if (typeof title !== 'string' || title.length === 0) {
    throw new ComposeParseError('missing or empty `title`', raw);
  }
  if (!Array.isArray(slides)) throw new ComposeParseError('`slides` must be an array', raw);
  if (slides.length < 2 || slides.length > 8) {
    throw new ComposeParseError(`slide count out of range (got ${slides.length}, need 2–8)`, raw);
  }

  const validated: SlideBlock[] = slides.map((s, i) => validateSlide(s, i, raw));
  return { date, title, theme, slides: validated };
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return raw.trim();
  return raw.slice(first, last + 1);
}

/**
 * Parse and validate a single slide value (for use in slideAi and tests).
 * Throws ComposeParseError on invalid input.
 */
export function parseSlide(value: unknown): SlideBlock {
  const raw = JSON.stringify(value);
  return validateSlide(value, 0, raw);
}

function validateSlide(s: unknown, index: number, raw: string): SlideBlock {
  if (!isRecord(s)) throw new ComposeParseError(`slide ${index}: not an object`, raw);
  const type = s['type'];
  const variant = s['variant'];
  if (typeof type !== 'string' || typeof variant !== 'string') {
    throw new ComposeParseError(`slide ${index}: missing type/variant`, raw);
  }

  if (type === 'title') {
    requireString(s, 'text', index, raw);
    if (!['title-main', 'title-statement', 'title-question'].includes(variant)) {
      throw new ComposeParseError(`slide ${index}: unknown title variant '${variant}'`, raw);
    }
    return {
      type: 'title',
      variant: variant as 'title-main' | 'title-statement' | 'title-question',
      text: s['text'] as string,
      ...(typeof s['kicker'] === 'string' ? { kicker: s['kicker'] } : {}),
    };
  }

  if (type === 'body') {
    requireString(s, 'heading', index, raw);
    if (variant === 'body-text') {
      requireString(s, 'body', index, raw);
      return { type: 'body', variant: 'body-text', heading: s['heading'] as string, body: s['body'] as string };
    }
    if (variant === 'body-list') {
      const items = s['items'];
      if (!Array.isArray(items) || items.length === 0 || !items.every((x) => typeof x === 'string')) {
        throw new ComposeParseError(`slide ${index}: body-list needs string[] items`, raw);
      }
      return { type: 'body', variant: 'body-list', heading: s['heading'] as string, items: items as string[] };
    }
    if (variant === 'body-comparison') {
      const left = s['left'];
      const right = s['right'];
      if (!isRecord(left) || !isRecord(right) || typeof left['label'] !== 'string' || typeof left['body'] !== 'string' || typeof right['label'] !== 'string' || typeof right['body'] !== 'string') {
        throw new ComposeParseError(`slide ${index}: body-comparison needs {label,body} on left and right`, raw);
      }
      return {
        type: 'body',
        variant: 'body-comparison',
        heading: s['heading'] as string,
        left: { label: left['label'], body: left['body'] },
        right: { label: right['label'], body: right['body'] },
      };
    }
    throw new ComposeParseError(`slide ${index}: unknown body variant '${variant}'`, raw);
  }

  if (type === 'quote') {
    requireString(s, 'quote', index, raw);
    requireString(s, 'attribution', index, raw);
    if (!['quote-classic', 'quote-pullout', 'quote-reaction'].includes(variant)) {
      throw new ComposeParseError(`slide ${index}: unknown quote variant '${variant}'`, raw);
    }
    return {
      type: 'quote',
      variant: variant as 'quote-classic' | 'quote-pullout' | 'quote-reaction',
      quote: s['quote'] as string,
      attribution: s['attribution'] as string,
    };
  }

  throw new ComposeParseError(`slide ${index}: unknown type '${type}'`, raw);
}

function requireString(obj: Record<string, unknown>, key: string, index: number, raw: string): void {
  if (typeof obj[key] !== 'string' || (obj[key] as string).length === 0) {
    throw new ComposeParseError(`slide ${index}: missing or empty '${key}'`, raw);
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}
