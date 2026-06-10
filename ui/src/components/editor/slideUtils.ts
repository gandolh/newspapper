/**
 * Utility helpers for slide manipulation.
 */
import type { SlideBlock, FieldSpec } from '../../lib/types';

/** Convert a SlideBlock to a flat Record for POST /api/preview data param. */
export function slideToData(slide: SlideBlock): Record<string, unknown> {
  const { type: _type, variant: _variant, ...rest } = slide as Record<string, unknown>;
  return rest as Record<string, unknown>;
}

/**
 * Build a default (empty) slide data object from FieldSpec array.
 * Used when inserting a new slide with a given template.
 */
export function defaultsFromFields(
  fields: FieldSpec[],
  variant: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.kind === 'text') out[f.key] = '';
    else if (f.kind === 'textarea') out[f.key] = '';
    else if (f.kind === 'list') out[f.key] = ['', '', ''];
    else if (f.kind === 'pair') out[f.key] = { label: '', body: '' };
  }
  return out;
}

/** Build a new SlideBlock from a variant string and field defaults. */
export function buildNewSlide(
  variant: string,
  fields: FieldSpec[],
): SlideBlock {
  const data = defaultsFromFields(fields, variant);
  const family = variant.split('-')[0] as 'title' | 'body' | 'quote';

  // type is the family
  return { type: family, variant, ...data } as unknown as SlideBlock;
}

/** Extract a short text snippet for display in the slide list. */
export function slideSnippet(slide: SlideBlock): string {
  const s = slide as Record<string, unknown>;
  if (typeof s['text'] === 'string') return s['text'] as string;
  if (typeof s['heading'] === 'string') return s['heading'] as string;
  if (typeof s['quote'] === 'string') return s['quote'] as string;
  return '';
}

/** Returns true if two same-family variant switches can share fields. */
export function canInstantSwitch(fromVariant: string, toVariant: string): boolean {
  // title-statement ↔ title-question share {text}
  if (
    (fromVariant === 'title-statement' || fromVariant === 'title-question') &&
    (toVariant === 'title-statement' || toVariant === 'title-question')
  ) {
    return true;
  }
  // quote family all share {quote, attribution}
  if (fromVariant.startsWith('quote-') && toVariant.startsWith('quote-')) {
    return true;
  }
  return false;
}

/** title-main → title-statement drops the kicker field */
export function titleMainToStatement(slide: SlideBlock): SlideBlock {
  const s = slide as Record<string, unknown>;
  const { kicker: _kicker, ...rest } = s;
  return { ...rest, variant: 'title-statement' } as unknown as SlideBlock;
}

/** Copy shared fields when switching between compatible variants. */
export function switchVariantInstant(slide: SlideBlock, toVariant: string): SlideBlock {
  const s = slide as Record<string, unknown>;
  const toFamily = toVariant.split('-')[0];
  return { ...s, type: toFamily, variant: toVariant } as unknown as SlideBlock;
}
