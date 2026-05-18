import type { Article } from '../storage/articles.js';

const SCHEMA_DOC = `
{
  "title": "<short, punchy headline for the post>",
  "slides": [
    // 2-8 slide blocks. Pick variants that fit the content.
    // Title variants:
    { "type": "title", "variant": "title-main",      "text": "...", "kicker": "optional short label" },
    { "type": "title", "variant": "title-statement", "text": "..." },
    { "type": "title", "variant": "title-question",  "text": "..." },
    // Body variants:
    { "type": "body",  "variant": "body-text",       "heading": "...", "body": "..." },
    { "type": "body",  "variant": "body-list",       "heading": "...", "items": ["...", "..."] },
    { "type": "body",  "variant": "body-comparison", "heading": "...", "left": {"label":"...","body":"..."}, "right": {"label":"...","body":"..."} },
    // Quote variants:
    { "type": "quote", "variant": "quote-classic",   "quote": "...", "attribution": "..." },
    { "type": "quote", "variant": "quote-pullout",   "quote": "...", "attribution": "..." },
    { "type": "quote", "variant": "quote-reaction",  "quote": "...", "attribution": "..." }
  ]
}
`.trim();

export function buildPrompt(articles: Article[]): string {
  const blocks = articles
    .map((a, i) => {
      const trimmedBody = a.body.length > 1200 ? `${a.body.slice(0, 1200)}…` : a.body;
      return [
        `### Article ${i + 1} — source: ${a.source_id}`,
        `URL: ${a.url}`,
        `Title: ${a.title}`,
        `Summary: ${a.summary}`,
        `Body: ${trimmedBody}`,
      ].join('\n');
    })
    .join('\n\n');

  return [
    `You are an editor for an Instagram-style news carousel. Today's articles are below. Write one carousel post that covers the most interesting threads across all of them.`,
    ``,
    `Output rules:`,
    `- Respond with **JSON only**. No markdown fence, no prose before or after.`,
    `- The JSON must match this schema exactly:`,
    ``,
    SCHEMA_DOC,
    ``,
    `- Use between 2 and 8 slides. First slide should be a title variant.`,
    `- Keep slide text tight: titles ≤ 90 characters, body paragraphs ≤ 220 characters, list items ≤ 60 characters.`,
    `- Tone: confident, factual, no clickbait, no hashtags, no emoji.`,
    ``,
    `Articles:`,
    ``,
    blocks,
    ``,
    `Now produce the JSON post.`,
  ].join('\n');
}
