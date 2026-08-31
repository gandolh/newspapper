/**
 * What a component renderer is handed, and the prop resolution every one of
 * them shares.
 *
 * Browser-safe: no Node APIs.
 */

import type { TNode, TStyle, Theme } from '../../types.js';
import type { WzdElement, WzdNode } from '../ast.js';
import { getComponentSpec } from '../catalogue.js';
import { resolveBindings } from '../bindings.js';
import { WZD_TEXT_ALIGN, type WzdAlign, type WzdEmphasis, type WzdSize } from './style.js';

export interface WzdRenderContext {
  theme: Theme;
  /** `<head>` — the binding scope. */
  head: Record<string, string>;
  /** The alignment inherited from the nearest ancestor that set one. */
  align: WzdAlign;
  /** The text size inherited from a `<List>`; `md` elsewhere. */
  size: WzdSize;
  /** 1-based position of the slide being compiled. */
  index: number;
  /** How many slides the document has. */
  total: number;
  /** Prefix an `<Image src>` is resolved against. */
  uploadBaseUrl: string;
  render(node: WzdNode, ctx: WzdRenderContext): TNode | null;
  renderChildren(nodes: readonly WzdNode[], ctx: WzdRenderContext): TNode[];
}

export type WzdComponentRenderer = (el: WzdElement, ctx: WzdRenderContext) => TNode | null;

function specValues(type: string, prop: string): readonly string[] | null {
  const spec = getComponentSpec(type)?.props[prop];
  if (!spec || spec.kind !== 'enum') return null;
  return spec.values ?? null;
}

function specDefault(type: string, prop: string): string {
  return getComponentSpec(type)?.props[prop]?.default ?? '';
}

/** An enum prop as written, or the catalogue default when absent or invalid. */
export function enumProp(el: WzdElement, prop: string): string {
  const values = specValues(el.type, prop);
  const written = el.props[prop];
  if (values && written !== undefined && values.includes(written)) return written;
  return specDefault(el.type, prop);
}

/**
 * Every prop of `el` with defaults applied — what the inspector shows and what
 * the compiler renders from. An enum value outside its scale (a lint error)
 * falls back to the default rather than reaching the tree.
 */
export function resolveProps(el: WzdElement): Record<string, string> {
  const spec = getComponentSpec(el.type);
  if (!spec) return {};
  const resolved: Record<string, string> = {};
  for (const propSpec of Object.values(spec.props)) {
    if (propSpec.kind === 'enum') {
      resolved[propSpec.name] = enumProp(el, propSpec.name);
      continue;
    }
    const written = el.props[propSpec.name];
    if (written !== undefined) resolved[propSpec.name] = written;
    else if (propSpec.default !== undefined) resolved[propSpec.name] = propSpec.default;
  }
  return resolved;
}

export function sizeOf(el: WzdElement): WzdSize {
  return enumProp(el, 'size') as WzdSize;
}

export function emphasisOf(el: WzdElement): WzdEmphasis {
  return enumProp(el, 'emphasis') as WzdEmphasis;
}

/**
 * Alignment is inherited: a component that does not set `align` takes the one
 * its ancestor resolved, so `<Slide align="center">` centres what is inside it
 * without every child restating it.
 */
export function alignOf(el: WzdElement, ctx: WzdRenderContext): WzdAlign {
  const values = specValues(el.type, 'align');
  const written = el.props['align'];
  if (values && written !== undefined && values.includes(written)) return written as WzdAlign;
  return ctx.align;
}

export function textAlign(align: WzdAlign): string {
  return WZD_TEXT_ALIGN[align];
}

/** The text of an element's direct text children, with bindings resolved. */
export function contentOf(el: WzdElement, ctx: WzdRenderContext): string {
  const parts: string[] = [];
  for (const child of el.children) {
    if (child.kind === 'text' && child.value) parts.push(child.value);
  }
  return resolveBindings(parts.join(' '), ctx.head);
}

/**
 * The interpreter drops literal text into HTML unescaped, so the compiler owns
 * escaping. `<` cannot occur in `.wzd` text, but `&` and `>` can.
 */
export function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function textNode(text: string, style: TStyle): TNode {
  return { kind: 'text', text: escapeText(text), style };
}

export function boxNode(style: TStyle, children: TNode[]): TNode {
  return { kind: 'box', style, children };
}
