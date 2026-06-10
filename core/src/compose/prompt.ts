import type { Article } from '../types.js';

/**
 * VARIANT_SHAPES — describes the exact JSON fields for each slide variant.
 * Exported so tests and slideAi can reference it.
 */
export const VARIANT_SHAPES: Record<string, string> = {
  'title-main':
    '{ "type": "title", "variant": "title-main", "text": "...", "kicker": "optional short label" }',
  'title-statement': '{ "type": "title", "variant": "title-statement", "text": "..." }',
  'title-question': '{ "type": "title", "variant": "title-question", "text": "..." }',
  'body-text':
    '{ "type": "body", "variant": "body-text", "heading": "...", "body": "..." }',
  'body-list':
    '{ "type": "body", "variant": "body-list", "heading": "...", "items": ["...", "...", "..."] }',
  'body-comparison':
    '{ "type": "body", "variant": "body-comparison", "heading": "...", "left": {"label":"...","body":"..."}, "right": {"label":"...","body":"..."} }',
  'quote-classic':
    '{ "type": "quote", "variant": "quote-classic", "quote": "...", "attribution": "..." }',
  'quote-pullout':
    '{ "type": "quote", "variant": "quote-pullout", "quote": "...", "attribution": "..." }',
  'quote-reaction':
    '{ "type": "quote", "variant": "quote-reaction", "quote": "...", "attribution": "..." }',
};

/**
 * DEFAULT_PROMPT — system prompt for the post-composition LLM call.
 * Describes all slide variants, their exact JSON fields, and output rules.
 */
export const DEFAULT_PROMPT = `You are an editor for an Instagram-style news carousel. You will receive today's articles and must produce a single carousel post that covers the most interesting story threads across all of them.

OUTPUT RULES:
- Respond with JSON only. No markdown fences (no \`\`\`), no prose before or after.
- The JSON must match this exact schema:

{
  "title": "<short, punchy headline for the post>",
  "slides": [
    // 2–8 slide blocks. The first slide MUST be a title variant.
    // Choose the variant that best fits each piece of content.
    // ── Title variants ──
    ${VARIANT_SHAPES['title-main']},
    ${VARIANT_SHAPES['title-statement']},
    ${VARIANT_SHAPES['title-question']},
    // ── Body variants ──
    // Use body-text for a single explanatory paragraph.
    ${VARIANT_SHAPES['body-text']},
    // Use body-list when content is naturally enumerable (3–6 items work best).
    ${VARIANT_SHAPES['body-list']},
    // Use body-comparison when two opposing viewpoints, sides, or metrics are present.
    ${VARIANT_SHAPES['body-comparison']},
    // ── Quote variants ──
    // Use quote-classic / quote-pullout / quote-reaction for direct quotes from sources.
    ${VARIANT_SHAPES['quote-classic']},
    ${VARIANT_SHAPES['quote-pullout']},
    ${VARIANT_SHAPES['quote-reaction']}
  ]
}

VARIANT SELECTION GUIDANCE:
- Lists of items, steps, or points → body-list
- Conflicts, comparisons, or contrasting views → body-comparison
- Strong statements or quotes from named sources → quote-classic or quote-pullout
- Rhetorical openings → title-question
- Bold assertions → title-statement

CONTENT RULES:
- Use between 2 and 8 slides total. First slide must be a title variant.
- Keep text tight: title/text fields ≤ 90 characters, body paragraphs ≤ 220 characters, list items ≤ 60 characters.
- Tone: confident, factual, no clickbait, no hashtags, no emoji.
- Pick only the most newsworthy angles. Do not pad with filler slides.`;

/**
 * Build the user prompt: numbered articles with source, title, and trimmed body.
 */
export function buildUserPrompt(articles: Article[]): string {
  const blocks = articles
    .map((a, i) => {
      const trimmedBody = a.body.length > 1200 ? `${a.body.slice(0, 1200)}…` : a.body;
      return [
        `### Article ${i + 1} — source: ${a.sourceName} (${a.sourceId})`,
        `Title: ${a.title}`,
        `Body: ${trimmedBody}`,
      ].join('\n');
    })
    .join('\n\n');

  return `Articles:\n\n${blocks}\n\nNow produce the JSON post.`;
}
