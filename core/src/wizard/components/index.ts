/**
 * The component library: one renderer per catalogue component, keyed by name.
 *
 * Every renderer is `(element, context) => TNode | null`, built from theme
 * tokens only. Nothing here touches Node APIs, so the browser preview can run
 * the same code the renderer does.
 */

import type { TNode } from '../../types.js';
import type { WzdElement, WzdNode } from '../ast.js';
import { WZD_RENDERABLE_NAMES } from '../catalogue.js';
import { Heading, Image, Item, List, Quote, Stat, Text } from './content.js';
import { Divider, Kicker, PageCounter, Source, Spacer } from './accents.js';
import { Row, Slide, Stack } from './structure.js';
import type { WzdComponentRenderer, WzdRenderContext } from './context.js';

export type { WzdComponentRenderer, WzdRenderContext } from './context.js';
export {
  alignOf,
  contentOf,
  emphasisOf,
  enumProp,
  escapeText,
  resolveProps,
  sizeOf,
} from './context.js';
export * from './style.js';
export { imageUrl } from './content.js';

/** Every renderable component, by name. Keys match `WZD_RENDERABLE_NAMES`. */
export const WZD_RENDERERS: Readonly<Record<string, WzdComponentRenderer>> = Object.freeze({
  Slide,
  Stack,
  Row,
  Heading,
  Text,
  List,
  Item,
  Quote,
  Stat,
  Image,
  Kicker,
  Divider,
  Spacer,
  Source,
  PageCounter,
});

/** The names the library implements — the same set the catalogue publishes. */
export const WZD_RENDERER_NAMES: readonly string[] = WZD_RENDERABLE_NAMES;

export function getRenderer(name: string): WzdComponentRenderer | undefined {
  return Object.prototype.hasOwnProperty.call(WZD_RENDERERS, name)
    ? WZD_RENDERERS[name]
    : undefined;
}

/**
 * Render one node. Comments and stray text produce nothing; an unknown
 * component produces nothing — the linter is what reports either.
 */
export function renderComponent(node: WzdNode, ctx: WzdRenderContext): TNode | null {
  if (node.kind !== 'element') return null;
  const renderer = getRenderer(node.type);
  if (!renderer) return null;
  return renderer(node, ctx);
}

export function renderComponents(nodes: readonly WzdNode[], ctx: WzdRenderContext): TNode[] {
  const out: TNode[] = [];
  for (const node of nodes) {
    const rendered = renderComponent(node, ctx);
    if (rendered) out.push(rendered);
  }
  return out;
}

/** A context with the dispatch wired in — what `compile` starts from. */
export function baseContext(
  init: Omit<WzdRenderContext, 'render' | 'renderChildren'>,
): WzdRenderContext {
  return { ...init, render: renderComponent, renderChildren: renderComponents };
}

export function renderSlide(slide: WzdElement, ctx: WzdRenderContext): TNode {
  const rendered = Slide(slide, ctx);
  if (!rendered) throw new Error(`<${slide.type}> is not a slide.`);
  return rendered;
}
