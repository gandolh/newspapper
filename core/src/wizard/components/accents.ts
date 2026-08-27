/**
 * Accents and the one generated component — `Kicker`, `Divider`, `Spacer`,
 * `Source`, `PageCounter`.
 */

import {
  alignOf,
  boxNode,
  contentOf,
  emphasisOf,
  sizeOf,
  textAlign,
  textNode,
  type WzdComponentRenderer,
} from './context.js';
import {
  WZD_FRACTION_BY_SIZE,
  WZD_RULE_COLORS,
  WZD_SPACING_BY_SIZE,
  WZD_TEXT_COLORS,
  WZD_TYPOGRAPHY_SCALES,
  colorToken,
  spacingToken,
} from './style.js';

export const Kicker: WzdComponentRenderer = (el, ctx) =>
  textNode(contentOf(el, ctx), {
    typography: WZD_TYPOGRAPHY_SCALES['Kicker'][sizeOf(el)],
    color: colorToken(WZD_TEXT_COLORS[emphasisOf(el)]),
    textTransform: 'uppercase',
    textAlign: textAlign(alignOf(el, ctx)),
  });

export const Source: WzdComponentRenderer = (el, ctx) =>
  textNode(contentOf(el, ctx), {
    typography: WZD_TYPOGRAPHY_SCALES['Source'][sizeOf(el)],
    color: colorToken(WZD_TEXT_COLORS[emphasisOf(el)]),
    textAlign: textAlign(alignOf(el, ctx)),
  });

/**
 * A rule. Its thickness is the theme's border width; `size` sets how far
 * across the column it runs.
 */
export const Divider: WzdComponentRenderer = (el, ctx) =>
  boxNode(
    {
      width: WZD_FRACTION_BY_SIZE[sizeOf(el)],
      height: ctx.theme.shapes.borderWidth,
      flexShrink: 0,
      backgroundColor: colorToken(WZD_RULE_COLORS[emphasisOf(el)]),
    },
    [],
  );

export const Spacer: WzdComponentRenderer = (el) =>
  boxNode({ height: spacingToken(WZD_SPACING_BY_SIZE[sizeOf(el)]), flexShrink: 0 }, []);

/**
 * `2/5`. Both numbers come from the document's slide list at compile time, so
 * the tree is correct on its own — the interpreter's `_index`/`_total`
 * bindings are not needed and nothing has to be threaded through the preview.
 */
export const PageCounter: WzdComponentRenderer = (el, ctx) =>
  textNode(`${ctx.index}/${ctx.total}`, {
    typography: WZD_TYPOGRAPHY_SCALES['PageCounter'][sizeOf(el)],
    color: colorToken(WZD_TEXT_COLORS[emphasisOf(el)]),
    textAlign: textAlign(alignOf(el, ctx)),
    marginTop: 'auto',
  });
