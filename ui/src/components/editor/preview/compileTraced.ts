/**
 * The preview's compile: core's compile, with a breadcrumb on every node.
 *
 * The preview runs the *same* component library, the same context factory and
 * the same style resolution the Chromium renderer runs — importing them from
 * `@newspapper/core/wizard`, which is browser-safe by construction. The only
 * thing added here is a source offset stamped into each produced `TNode`, so a
 * click in the preview can name the element it came from.
 *
 * The offset rides in the node's own style map rather than a side table
 * because `Row` clones its children's styles, which a `Map` keyed on node
 * identity would not survive. `compileTraced.test.ts` asserts the tree is
 * identical to `compile()`'s once the stamp is removed.
 */

import {
  baseContext,
  lint,
  missingThemeTokens,
  renderComponent,
  slideElements,
  WZD_COMPILE_DEFAULTS,
  type WzdDiagnostic,
  type WzdDocument,
  type WzdNode,
  type WzdRenderContext,
} from '@newspapper/core/wizard';
import type { TNode, TStyle, Theme } from '@newspapper/core/templates';

/** Custom-property name, so it resolves to an inert CSS declaration if it leaks. */
export const WZD_SRC_KEY = '--wzd-src';

export interface TracedCompile {
  slides: TNode[];
  head: Record<string, string>;
  diagnostics: WzdDiagnostic[];
  /** Set when the theme itself cannot drive the component library at all. */
  themeError: string | null;
}

function stamp(node: TNode, offset: number): TNode {
  return { ...node, style: { ...(node.style ?? {}), [WZD_SRC_KEY]: offset } } as TNode;
}

function tracedRender(node: WzdNode, ctx: WzdRenderContext): TNode | null {
  const rendered = renderComponent(node, ctx);
  if (!rendered || node.kind !== 'element') return rendered;
  return stamp(rendered, node.loc.start.offset);
}

function tracedChildren(nodes: readonly WzdNode[], ctx: WzdRenderContext): TNode[] {
  const out: TNode[] = [];
  for (const node of nodes) {
    const rendered = tracedRender(node, ctx);
    if (rendered) out.push(rendered);
  }
  return out;
}

/** The source offset a node was stamped with, or null for a node core produced. */
export function sourceOffsetOf(node: TNode): number | null {
  const raw = node.style?.[WZD_SRC_KEY];
  return typeof raw === 'number' ? raw : null;
}

/** The node's style with the stamp removed — what `resolveStyle` must see. */
export function styleWithoutStamp(node: TNode): TStyle {
  if (!node.style || !(WZD_SRC_KEY in node.style)) return node.style ?? {};
  const copy: TStyle = { ...node.style };
  delete copy[WZD_SRC_KEY];
  return copy;
}

export function compileTraced(
  doc: WzdDocument,
  theme: Theme,
  options: { uploadBaseUrl?: string } = {},
): TracedCompile {
  const diagnostics = lint(doc);
  const missing = missingThemeTokens(theme);
  if (missing.length) {
    return {
      slides: [],
      head: { ...doc.head },
      diagnostics,
      themeError: `Theme "${theme.name}" is missing tokens the component library needs: ${missing.join(', ')}.`,
    };
  }

  const elements = slideElements(doc);
  const total = elements.length;
  const slides = elements.map((el, i) => {
    const ctx: WzdRenderContext = {
      ...baseContext({
        theme,
        head: doc.head,
        align: 'left',
        size: 'md',
        index: i + 1,
        total,
        uploadBaseUrl: options.uploadBaseUrl ?? WZD_COMPILE_DEFAULTS.uploadBaseUrl,
      }),
      render: tracedRender,
      renderChildren: tracedChildren,
    };
    const rendered = tracedRender(el, ctx);
    if (!rendered) throw new Error(`<${el.type}> is not a slide.`);
    return rendered;
  });

  return { slides, head: { ...doc.head }, diagnostics, themeError: null };
}
