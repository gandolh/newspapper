import type { Article, SlideBlock } from '../types.js';
import type { OllamaConfig } from './types.js';
import { OllamaClient } from './ollama.js';
import { parseSlide, ComposeParseError } from './parse.js';
import { VARIANT_SHAPES } from './prompt.js';

export type SlideAiAction =
  | { action: 'shorter' }
  | { action: 'punchier' }
  | { action: 'regenerate'; articles: Article[] }
  | { action: 'remap'; targetVariant: SlideBlock['variant'] };

const SLIDE_AI_SYSTEM = `You are a slide editor for an Instagram-style news carousel. You will receive a slide and an instruction. Apply the instruction and return the modified slide as JSON only. No markdown fences, no prose. The JSON must exactly match the required slide variant shape.`;

function slideToJson(slide: SlideBlock): string {
  return JSON.stringify(slide, null, 2);
}

function buildShorterPrompt(slide: SlideBlock): string {
  return `Rewrite this slide to be shorter. Keep the same variant and all the same fields, but reduce the text length. Return the complete slide JSON.\n\nCurrent slide:\n${slideToJson(slide)}\n\nExpected shape:\n${VARIANT_SHAPES[slide.variant]}\n\nReturn only the JSON slide.`;
}

function buildPunchierPrompt(slide: SlideBlock): string {
  return `Rewrite this slide to be more punchy and impactful. Keep the same variant and all the same fields. Return the complete slide JSON.\n\nCurrent slide:\n${slideToJson(slide)}\n\nExpected shape:\n${VARIANT_SHAPES[slide.variant]}\n\nReturn only the JSON slide.`;
}

function buildRegeneratePrompt(slide: SlideBlock, articles: Article[]): string {
  const articleBlocks = articles
    .map((a, i) => {
      const trimmedBody = a.body.length > 800 ? `${a.body.slice(0, 800)}…` : a.body;
      return `Article ${i + 1}: ${a.title}\n${trimmedBody}`;
    })
    .join('\n\n');

  return `Rewrite this slide using the provided articles. Keep the same variant. Return the complete slide JSON.\n\nCurrent slide:\n${slideToJson(slide)}\n\nExpected shape:\n${VARIANT_SHAPES[slide.variant]}\n\nArticles:\n${articleBlocks}\n\nReturn only the JSON slide.`;
}

function buildRemapPrompt(slide: SlideBlock, targetVariant: SlideBlock['variant']): string {
  const targetShape = VARIANT_SHAPES[targetVariant];
  return `Convert this slide to the target variant. Preserve the meaning and content but adapt the structure to fit the new variant's fields.\n\nCurrent slide:\n${slideToJson(slide)}\n\nTarget variant: ${targetVariant}\nTarget shape:\n${targetShape}\n\nReturn only the JSON slide matching the target shape exactly.`;
}

async function generateSlide(
  client: OllamaClient,
  prompt: string,
): Promise<SlideBlock> {
  const raw = await client.generate(prompt, { json: true, system: SLIDE_AI_SYSTEM });

  // Extract JSON from response
  let jsonStr = raw.trim();
  const fenced = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) jsonStr = fenced[1].trim();
  // Find the JSON object boundaries
  const first = jsonStr.indexOf('{');
  const last = jsonStr.lastIndexOf('}');
  if (first !== -1 && last > first) {
    jsonStr = jsonStr.slice(first, last + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new ComposeParseError('slideAi: invalid JSON in response', raw);
  }

  return parseSlide(parsed);
}

/**
 * Per-slide AI actions: shorter, punchier, regenerate, remap.
 * Validates the returned slide; retries once on invalid, then throws.
 */
export async function slideAi(
  slide: SlideBlock,
  req: SlideAiAction,
  cfg: OllamaConfig,
): Promise<SlideBlock> {
  const client = new OllamaClient(cfg);

  let prompt: string;
  switch (req.action) {
    case 'shorter':
      prompt = buildShorterPrompt(slide);
      break;
    case 'punchier':
      prompt = buildPunchierPrompt(slide);
      break;
    case 'regenerate':
      prompt = buildRegeneratePrompt(slide, req.articles);
      break;
    case 'remap':
      prompt = buildRemapPrompt(slide, req.targetVariant);
      break;
  }

  const isRemap = req.action === 'remap';
  const targetVariant = isRemap ? req.targetVariant : undefined;

  async function attempt(p: string): Promise<SlideBlock> {
    const result = await generateSlide(client, p);
    // For remap: enforce that the returned slide actually has the target variant.
    if (isRemap && targetVariant !== undefined && result.variant !== targetVariant) {
      throw new ComposeParseError(
        `slideAi remap: expected variant "${targetVariant}" but got "${result.variant}"`,
        JSON.stringify(result),
      );
    }
    return result;
  }

  try {
    return await attempt(prompt);
  } catch (err) {
    if (!(err instanceof ComposeParseError)) throw err;
    // Retry once with error feedback
    const retryPrompt = `${prompt}\n\nYour previous output was invalid: ${err.message}\nReturn only the JSON slide matching the required shape.`;
    return await attempt(retryPrompt);
  }
}
