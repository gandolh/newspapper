/**
 * TNode interpreter — pure browser-safe module (no Node APIs).
 *
 * This is the compile target for `.wzd` documents (see `core/src/wizard/compile.ts`),
 * not an authoring surface — the JSON template documents this used to interpret,
 * and the type that described them, are gone (see decisions.md "The template
 * system is removed").
 *
 * renderTemplate() → complete self-contained HTML document string from a TNode root.
 * resolveStyle()   → CSS property map for a single TStyle node (also called directly
 *                    by the browser preview — see decisions-engineering.md).
 * validateSlideData() — throws if the data blob handed to renderTemplate isn't usable.
 */

import type { TNode, TStyle, Theme, RenderTemplateOptions } from '../types.js';

// ---------------------------------------------------------------------------
// Unitless CSS properties (no `px` suffix)
// ---------------------------------------------------------------------------
const UNITLESS = new Set([
  'lineHeight',
  'line-height',
  'fontWeight',
  'font-weight',
  'opacity',
  'flex',
  'flexGrow',
  'flex-grow',
  'flexShrink',
  'flex-shrink',
  'zIndex',
  'z-index',
  'order',
  'flexOrder',
  'flex-order',
]);

// ---------------------------------------------------------------------------
// Font-family fallback
//
// Theme typography tokens declare a bare family ("Inter"). resolveStyle emits
// them as an *inline* style on the text node, which outranks the body rule
// below — so a bare family means that when the face fails to load the slide
// lands on Chromium's default, which is a **serif**. The product is a square
// image of text; a silent switch to serif changes what ships.
//
// The stack is appended here rather than stored in the theme JSON: resolveStyle
// is the single funnel every emitted declaration passes through (render and
// browser preview both), so one theme added later cannot forget it.
// ---------------------------------------------------------------------------

/** CSS generic families. A stack ending in one of these is already complete. */
const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',
  'fangsong',
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
]);

/**
 * What an unstacked family falls back to. Also the tail of the body rule in
 * renderTemplate, so the inline styles and the document agree.
 */
const FALLBACK_FAMILY = 'sans-serif';

/** Strip one layer of matching quotes from a family name. */
function unquoteFamily(name: string): string {
  const m = /^(['"])(.*)\1$/.exec(name);
  return m ? m[2] : name;
}

/**
 * Ensure a declared `font-family` ends in a generic.
 *
 * Every family the theme authored is passed through **verbatim** — this appends
 * a tail and nothing else, and in particular does not add quotes. That is now a
 * style choice rather than a constraint: it used to be load-bearing, because
 * the render's typeface guard built its no-Inter control by renaming `'Inter'`
 * in the HTML and quoting the inline family here would have renamed the text
 * along with the `@font-face`, collapsing the control into its subject. The
 * guard's control no longer works that way (brief 71) — it defines no
 * `@font-face` at all and names Inter nowhere, asserted on the finished
 * document — so quoting families here would be safe, if a reason to appears.
 *
 * A stack that already ends in a generic keeps it — that is how a future serif
 * or monospace theme opts out of the sans tail.
 */
export function withFallbackFamily(value: string): string {
  const families = value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
  if (families.length === 0) return FALLBACK_FAMILY;
  const last = unquoteFamily(families[families.length - 1] as string).toLowerCase();
  if (GENERIC_FAMILIES.has(last)) return families.join(',');
  return [...families, FALLBACK_FAMILY].join(',');
}

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

  // Whatever produced it — typography token or an explicit `fontFamily` — the
  // emitted stack must end in a generic, or the failure mode is Times.
  const family = result['font-family'];
  if (family !== undefined) result['font-family'] = withFallbackFamily(family);

  return result;
}

// ---------------------------------------------------------------------------
// Convert a resolved style map to an inline CSS string
// ---------------------------------------------------------------------------

/**
 * Escape a fragment destined for a double-quoted `style="…"` attribute.
 *
 * Style values are data — a theme token, a `$color.*` lookup, a `.wzd`-authored
 * literal — and one containing a `"` would close the attribute early, leaving
 * everything after it to be parsed as markup. Keys go through the same funnel:
 * `toKebab` does not constrain them to identifiers.
 *
 * `&` is replaced first, or the escaping would re-escape its own output. Single
 * quotes are deliberately left alone: the attribute is always double-quoted, so
 * an apostrophe cannot close it, and `font-family:'Inter'` has to survive
 * verbatim. `<` and `>` cannot terminate an attribute value either, but they
 * are escaped anyway — cheap, and it keeps a value from reading as markup to
 * anything less careful than a spec-compliant parser.
 */
function escapeStyle(fragment: string): string {
  return fragment
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function styleToString(styleMap: Record<string, string>): string {
  return Object.entries(styleMap)
    .map(([k, v]) => `${escapeStyle(k)}:${escapeStyle(v)}`)
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

    const items =
      node.source === 'items' && Array.isArray(data['items']) ? (data['items'] as unknown[]) : [];

    const rendered = items
      .map((item, idx) => {
        // Build per-item data context
        const itemData: Record<string, unknown> = {
          ...data,
          i: idx + 1,
          item:
            typeof item === 'object' && item !== null
              ? {
                  ...(data['item'] as Record<string, unknown>),
                  ...(item as Record<string, unknown>),
                  toString: () => JSON.stringify(item),
                }
              : item,
        };
        // Allow {{item}} to resolve to stringified value for non-object items
        if (typeof item !== 'object' || item === null) {
          (itemData['item'] as unknown) = item;
        }
        return node.children.map((c) => renderNode(c, itemData, theme)).join('');
      })
      .join('');

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
    .map(
      ([weight, name]) =>
        `@font-face{font-family:'Inter';font-weight:${weight};src:url('${fontBaseUrl}/Inter-${name}.ttf') format('truetype');}`,
    )
    .join('\n');
}

// ---------------------------------------------------------------------------
// renderTemplate — main export
// ---------------------------------------------------------------------------
export function renderTemplate(
  root: TNode,
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

  const bodyContent = renderNode(root, fullData, theme);
  const fonts = fontFaceCss(opts.fontBaseUrl);

  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><style>${fonts}
*{margin:0;padding:0;box-sizing:border-box;}
body{margin:0;font-family:'Inter',${FALLBACK_FAMILY};}
</style></head><body><div style="width:1080px;height:1080px;overflow:hidden;display:flex;">${bodyContent}</div></body></html>`;
}

// ---------------------------------------------------------------------------
// validateSlideData — guards the `data` argument handed to renderTemplate.
// There is no more per-template field spec to check required-ness against —
// the wizard compiler resolves every binding before a TNode exists, so this
// is just the non-null-object precondition renderTemplate's substitution needs.
// ---------------------------------------------------------------------------
export function validateSlideData(data: unknown): void {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('Slide data must be an object');
  }
}
