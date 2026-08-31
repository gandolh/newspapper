/**
 * Content — `Heading`, `Text`, `List`, `Item`, `Quote`, `Stat`, `Image`.
 */

import type { TNode } from '../../types.js';
import { isElement } from '../ast.js';
import {
  alignOf,
  boxNode,
  contentOf,
  emphasisOf,
  sizeOf,
  textAlign,
  textNode,
  type WzdComponentRenderer,
  type WzdRenderContext,
} from './context.js';
import {
  WZD_CAPTION_COLOR,
  WZD_CAPTION_TYPOGRAPHY,
  WZD_FRACTION_BY_SIZE,
  WZD_IMAGE_ASPECT,
  WZD_LIST_GAP_BY_SIZE,
  WZD_SPACING_BY_SIZE,
  WZD_TEXT_COLORS,
  WZD_TYPOGRAPHY_SCALES,
  colorToken,
  roundedToken,
  spacingToken,
} from './style.js';

/** A run of words: a typography token, a colour token, an alignment. */
function words(
  el: Parameters<WzdComponentRenderer>[0],
  ctx: WzdRenderContext,
  text: string,
): TNode {
  return textNode(text, {
    typography: WZD_TYPOGRAPHY_SCALES[el.type][sizeOf(el)],
    color: colorToken(WZD_TEXT_COLORS[emphasisOf(el)]),
    textAlign: textAlign(alignOf(el, ctx)),
  });
}

export const Heading: WzdComponentRenderer = (el, ctx) => words(el, ctx, contentOf(el, ctx));

export const Text: WzdComponentRenderer = (el, ctx) => words(el, ctx, contentOf(el, ctx));

export const List: WzdComponentRenderer = (el, ctx) => {
  const size = sizeOf(el);
  const align = alignOf(el, ctx);
  const inner: WzdRenderContext = { ...ctx, align, size };
  return boxNode(
    {
      display: 'flex',
      flexDirection: 'column',
      gap: spacingToken(WZD_LIST_GAP_BY_SIZE[size]),
      textAlign: textAlign(align),
    },
    ctx.renderChildren(el.children.filter(isElement), inner),
  );
};

/** The bullet is content, so it costs nothing in tokens. */
const BULLET = '•';

export const Item: WzdComponentRenderer = (el, ctx) => {
  const typography = WZD_TYPOGRAPHY_SCALES['Item'][ctx.size];
  const color = colorToken(WZD_TEXT_COLORS[emphasisOf(el)]);
  return boxNode(
    {
      display: 'flex',
      flexDirection: 'row',
      gap: spacingToken(WZD_SPACING_BY_SIZE['sm']),
      textAlign: textAlign(ctx.align),
    },
    [
      textNode(BULLET, { typography, color: colorToken(WZD_CAPTION_COLOR) }),
      textNode(contentOf(el, ctx), { typography, color, flex: 1 }),
    ],
  );
};

export const Quote: WzdComponentRenderer = (el, ctx) => {
  const align = alignOf(el, ctx);
  const children: TNode[] = [
    textNode(contentOf(el, ctx), {
      typography: WZD_TYPOGRAPHY_SCALES['Quote'][sizeOf(el)],
      color: colorToken(WZD_TEXT_COLORS[emphasisOf(el)]),
      textAlign: textAlign(align),
    }),
  ];
  const by = el.props['by'];
  if (by) {
    children.push(
      textNode(`— ${by}`, {
        typography: WZD_CAPTION_TYPOGRAPHY,
        color: colorToken(WZD_CAPTION_COLOR),
        textAlign: textAlign(align),
      }),
    );
  }
  return boxNode(
    {
      display: 'flex',
      flexDirection: 'column',
      gap: spacingToken(WZD_SPACING_BY_SIZE['sm']),
      textAlign: textAlign(align),
    },
    children,
  );
};

export const Stat: WzdComponentRenderer = (el, ctx) => {
  const align = alignOf(el, ctx);
  const children: TNode[] = [
    textNode(contentOf(el, ctx), {
      typography: WZD_TYPOGRAPHY_SCALES['Stat'][sizeOf(el)],
      color: colorToken(WZD_TEXT_COLORS[emphasisOf(el)]),
      textAlign: textAlign(align),
    }),
  ];
  const label = el.props['label'];
  if (label) {
    children.push(
      textNode(label, {
        typography: WZD_CAPTION_TYPOGRAPHY,
        color: colorToken(WZD_CAPTION_COLOR),
        textTransform: 'uppercase',
        textAlign: textAlign(align),
      }),
    );
  }
  return boxNode(
    {
      display: 'flex',
      flexDirection: 'column',
      gap: spacingToken(WZD_SPACING_BY_SIZE['xs']),
      textAlign: textAlign(align),
    },
    children,
  );
};

/** `src` names an upload; the compiler only prefixes it. */
export function imageUrl(src: string, baseUrl: string): string {
  const prefix = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const path = /^([a-z]+:)?\/\//i.test(src) || src.startsWith('/') ? src : `${prefix}/${src}`;
  return `url('${path.replace(/'/g, '%27')}')`;
}

export const Image: WzdComponentRenderer = (el, ctx) => {
  const src = el.props['src'];
  if (!src) return null;
  const align = alignOf(el, ctx);
  return boxNode(
    {
      width: WZD_FRACTION_BY_SIZE[sizeOf(el)],
      aspectRatio: WZD_IMAGE_ASPECT,
      borderRadius: roundedToken('md'),
      overflow: 'hidden',
      backgroundColor: colorToken('surface-container'),
      backgroundImage: imageUrl(src, ctx.uploadBaseUrl),
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      marginLeft: align === 'left' ? '0' : 'auto',
      marginRight: align === 'right' ? '0' : 'auto',
    },
    [],
  );
};
