/**
 * Structure — `Slide`, `Stack`, `Row`.
 *
 * `Slide` fills the 1080×1080 frame the renderer wraps it in; it never states
 * that size itself, so the same tree previews at any scale.
 */

import type { TNode, TStyle } from '../../types.js';
import {
  alignOf,
  boxNode,
  sizeOf,
  textAlign,
  type WzdComponentRenderer,
  type WzdRenderContext,
} from './context.js';
import {
  WZD_SLIDE_GAP,
  WZD_SLIDE_PADDING,
  WZD_SPACING_BY_SIZE,
  colorToken,
  spacingToken,
} from './style.js';

/** Columns in a `Row` share the width evenly. */
function asColumn(node: TNode): TNode {
  const style: TStyle = { ...(node.style ?? {}), flex: 1, minWidth: '0' };
  return { ...node, style };
}

export const Slide: WzdComponentRenderer = (el, ctx) => {
  const align = alignOf(el, ctx);
  const inner: WzdRenderContext = { ...ctx, align };
  return boxNode(
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      padding: spacingToken(WZD_SLIDE_PADDING),
      gap: spacingToken(WZD_SLIDE_GAP),
      backgroundColor: colorToken('surface'),
      color: colorToken('on-surface'),
      textAlign: textAlign(align),
    },
    ctx.renderChildren(el.children, inner),
  );
};

export const Stack: WzdComponentRenderer = (el, ctx) => {
  const align = alignOf(el, ctx);
  const inner: WzdRenderContext = { ...ctx, align };
  return boxNode(
    {
      display: 'flex',
      flexDirection: 'column',
      gap: spacingToken(WZD_SPACING_BY_SIZE[sizeOf(el)]),
      textAlign: textAlign(align),
    },
    ctx.renderChildren(el.children, inner),
  );
};

export const Row: WzdComponentRenderer = (el, ctx) => {
  const align = alignOf(el, ctx);
  const inner: WzdRenderContext = { ...ctx, align };
  return boxNode(
    {
      display: 'flex',
      flexDirection: 'row',
      gap: spacingToken(WZD_SPACING_BY_SIZE[sizeOf(el)]),
      textAlign: textAlign(align),
    },
    ctx.renderChildren(el.children, inner).map(asColumn),
  );
};
