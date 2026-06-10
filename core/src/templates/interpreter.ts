/**
 * Template interpreter — pure browser-safe module (no Node APIs).
 *
 * renderTemplate() → complete self-contained HTML document string.
 * resolveStyle()   → CSS property map for a single TStyle node (re-exported for the visual builder).
 * validateTemplateDoc() / validateSlideData() — throw with field-level messages on bad input.
 */

import type { TemplateDoc, TNode, TStyle, Theme, RenderTemplateOptions, FieldSpec } from '../types.js';

// ---------------------------------------------------------------------------
// Unitless CSS properties (no `px` suffix)
// ---------------------------------------------------------------------------
const UNITLESS = new Set([
  'lineHeight', 'line-height',
  'fontWeight', 'font-weight',
  'opacity',
  'flex', 'flexGrow', 'flex-grow',
  'flexShrink', 'flex-shrink',
  'zIndex', 'z-index',
  'order',
  'flexOrder', 'flex-order',
]);

// ---------------------------------------------------------------------------
// camelCase → kebab-case
// ---------------------------------------------------------------------------
function toKebab(key: string): string {
  return key.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
}

// ---------------------------------------------------------------------------
// HTML-escape a string value
// ---------------------------------------------------------------------------
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Resolve a single style value: token ref, number → px, pass-through
// ---------------------------------------------------------------------------
function resolveValue(key: string, value: string | number, theme: Theme): string {
  if (typeof value === 'number') {
    const kebab = toKebab(key);
    if (UNITLESS.has(key) || UNITLESS.has(kebab)) return String(value);
    return `${value}px`;
  }
  if (typeof value === 'string' && value.startsWith('$')) {
    // token ref: "$color.primary", "$spacing.lg", "$rounded.md"
    const parts = value.slice(1).split('.');
    const group = parts[0];
    const tokenKey = parts.slice(1).join('.');
    if (group === 'color') {
      const resolved = theme.colors[tokenKey];
      if (resolved === undefined) throw new Error(`Unknown color token: ${value}`);
      return resolved;
    }
    if (group === 'spacing') {
      const resolved = theme.spacing[tokenKey];
      if (resolved === undefined) throw new Error(`Unknown spacing token: ${value}`);
      return resolved;
    }
    if (group === 'rounded') {
      const resolved = theme.rounded[tokenKey];
      if (resolved === undefined) throw new Error(`Unknown rounded token: ${value}`);
      return resolved;
    }
    throw new Error(`Unknown token group "${group}" in: ${value}`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// resolveStyle — exported so the visual builder can reuse it
// ---------------------------------------------------------------------------
export function resolveStyle(style: TStyle, theme: Theme): Record<string, string> {
  const result: Record<string, string> = {};

  // Handle typography expansion first
  const typographyKey = style['typography'];
  if (typographyKey !== undefined) {
    const typKey = String(typographyKey);
    const typToken = theme.typography[typKey];
    if (!typToken) throw new Error(`Unknown typography token: ${typKey}`);
    // Expand typography fields
    for (const [k, v] of Object.entries(typToken)) {
      if (v !== undefined && v !== '') {
        result[toKebab(k)] = v;
      }
    }
  }

  // Process all other keys
  for (const [rawKey, rawValue] of Object.entries(style)) {
    if (rawKey === 'typography') continue; // already handled above
    const resolved = resolveValue(rawKey, rawValue, theme);
    const cssKey = toKebab(rawKey);
    result[cssKey] = resolved; // explicit keys override typography expansion
  }

  return result;
}

// ---------------------------------------------------------------------------
// Convert a resolved style map to an inline CSS string
// ---------------------------------------------------------------------------
function styleToString(styleMap: Record<string, string>): string {
  return Object.entries(styleMap)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}

// ---------------------------------------------------------------------------
// Dot-path binding resolution
// Supports: {{name}}, {{item.label}}, {{_index}}, {{_total}}, {{_date}}
// ---------------------------------------------------------------------------
function resolvePath(path: string, data: Record<string, unknown>): string {
  const parts = path.split('.');
  let cur: unknown = data;
  for (const part of parts) {
    if (cur === null || cur === undefined) return '';
    cur = (cur as Record<string, unknown>)[part];
  }
  if (cur === null || cur === undefined) return '';
  return String(cur);
}

// ---------------------------------------------------------------------------
// Substitute {{binding}} tokens in a text string
// ---------------------------------------------------------------------------
function substituteBindings(text: string, data: Record<string, unknown>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
    const trimmed = path.trim();
    const value = resolvePath(trimmed, data);
    return escapeHtml(value);
  });
}

// ---------------------------------------------------------------------------
// Render a single TNode to HTML string
// ---------------------------------------------------------------------------
function renderNode(node: TNode, data: Record<string, unknown>, theme: Theme): string {
  if (node.kind === 'box') {
    const styleMap = node.style ? resolveStyle(node.style, theme) : {};
    const cssStr = styleToString(styleMap);
    const styleAttr = cssStr ? ` style="${cssStr}"` : '';
    const children = (node.children ?? []).map((c) => renderNode(c, data, theme)).join('');
    return `<div${styleAttr}>${children}</div>`;
  }

  if (node.kind === 'text') {
    const styleMap = node.style ? resolveStyle(node.style, theme) : {};
    const cssStr = styleToString(styleMap);
    const styleAttr = cssStr ? ` style="${cssStr}"` : '';
    const content = substituteBindings(node.text, data);
    return `<div${styleAttr}>${content}</div>`;
  }

  if (node.kind === 'repeat') {
    const styleMap = node.style ? resolveStyle(node.style, theme) : {};
    const cssStr = styleToString(styleMap);
    const styleAttr = cssStr ? ` style="${cssStr}"` : '';

    const items = (node.source === 'items' && Array.isArray(data['items']))
      ? (data['items'] as unknown[])
      : [];

    const rendered = items.map((item, idx) => {
      // Build per-item data context
      const itemData: Record<string, unknown> = {
        ...data,
        i: idx + 1,
        item: typeof item === 'object' && item !== null
          ? { ...data['item'] as Record<string, unknown>, ...(item as Record<string, unknown>), toString: () => JSON.stringify(item) }
          : item,
      };
      // Allow {{item}} to resolve to stringified value for non-object items
      if (typeof item !== 'object' || item === null) {
        (itemData['item'] as unknown) = item;
      }
      return node.children.map((c) => renderNode(c, itemData, theme)).join('');
    }).join('');

    return `<div${styleAttr}>${rendered}</div>`;
  }

  // Should never reach here with correct types
  const exhaustive: never = node;
  throw new Error(`Unknown node kind: ${JSON.stringify(exhaustive)}`);
}

// ---------------------------------------------------------------------------
// Font face CSS
// ---------------------------------------------------------------------------
function fontFaceCss(fontBaseUrl: string): string {
  const weights: Array<[string, string]> = [
    ['400', 'Regular'],
    ['500', 'Medium'],
    ['600', 'SemiBold'],
    ['700', 'Bold'],
    ['800', 'ExtraBold'],
    ['900', 'Black'],
  ];
  return weights
    .map(([weight, name]) => `@font-face{font-family:'Inter';font-weight:${weight};src:url('${fontBaseUrl}/Inter-${name}.ttf') format('truetype');}`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// renderTemplate — main export
// ---------------------------------------------------------------------------
export function renderTemplate(
  doc: TemplateDoc,
  data: Record<string, unknown>,
  theme: Theme,
  opts: RenderTemplateOptions,
): string {
  // Inject built-ins into data
  const fullData: Record<string, unknown> = {
    ...data,
    _index: opts.index,
    _total: opts.total,
    _date: (data['_date'] as string | undefined) ?? '',
  };

  const bodyContent = renderNode(doc.root, fullData, theme);
  const fonts = fontFaceCss(opts.fontBaseUrl);

  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><style>${fonts}
*{margin:0;padding:0;box-sizing:border-box;}
body{margin:0;font-family:'Inter',sans-serif;}
</style></head><body><div style="width:1080px;height:1080px;overflow:hidden;display:flex;">${bodyContent}</div></body></html>`;
}

// ---------------------------------------------------------------------------
// validateTemplateDoc — throws with field-level messages
// ---------------------------------------------------------------------------
export function validateTemplateDoc(doc: unknown): TemplateDoc {
  if (typeof doc !== 'object' || doc === null) throw new Error('TemplateDoc must be an object');
  const d = doc as Record<string, unknown>;

  const errors: string[] = [];

  if (typeof d['id'] !== 'string' || !d['id']) errors.push('id: required string');
  if (typeof d['theme'] !== 'string' || !d['theme']) errors.push('theme: required string');
  if (!['title', 'body', 'quote'].includes(d['family'] as string)) errors.push(`family: must be 'title'|'body'|'quote', got ${JSON.stringify(d['family'])}`);
  if (typeof d['name'] !== 'string' || !d['name']) errors.push('name: required string');
  if (!Array.isArray(d['fields'])) errors.push('fields: must be an array');
  if (typeof d['sample'] !== 'object' || d['sample'] === null || Array.isArray(d['sample'])) errors.push('sample: must be an object');
  if (typeof d['root'] !== 'object' || d['root'] === null) errors.push('root: must be a TNode object');

  if (errors.length) throw new Error(`Invalid TemplateDoc:\n  ${errors.join('\n  ')}`);

  // Validate fields array
  if (Array.isArray(d['fields'])) {
    for (let i = 0; i < (d['fields'] as unknown[]).length; i++) {
      const f = (d['fields'] as unknown[])[i] as Record<string, unknown>;
      if (typeof f['key'] !== 'string') errors.push(`fields[${i}].key: required string`);
      if (typeof f['label'] !== 'string') errors.push(`fields[${i}].label: required string`);
      if (!['text', 'textarea', 'list', 'pair'].includes(f['kind'] as string))
        errors.push(`fields[${i}].kind: must be text|textarea|list|pair`);
      if (typeof f['required'] !== 'boolean') errors.push(`fields[${i}].required: must be boolean`);
    }
  }

  if (errors.length) throw new Error(`Invalid TemplateDoc fields:\n  ${errors.join('\n  ')}`);

  return doc as TemplateDoc;
}

// ---------------------------------------------------------------------------
// validateSlideData — checks required fields per FieldSpec
// ---------------------------------------------------------------------------
export function validateSlideData(doc: TemplateDoc, data: unknown): void {
  if (typeof data !== 'object' || data === null) throw new Error('Slide data must be an object');
  const d = data as Record<string, unknown>;
  const errors: string[] = [];

  for (const field of doc.fields as FieldSpec[]) {
    if (!field.required) continue;
    const value = d[field.key];
    if (value === undefined || value === null || value === '') {
      errors.push(`${field.key}: required field is missing or empty`);
    } else if (field.kind === 'list' && !Array.isArray(value)) {
      errors.push(`${field.key}: expected array for list field`);
    } else if (field.kind === 'pair') {
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push(`${field.key}: expected object with {label, body} for pair field`);
      }
    }
  }

  if (errors.length) throw new Error(`Invalid slide data for template "${doc.id}":\n  ${errors.join('\n  ')}`);
}
