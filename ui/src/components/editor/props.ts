/**
 * What the inspector needs to know about a selected element that the
 * catalogue does not say outright.
 *
 * `resolveProps` already gives the resolved value of every prop, but `align`
 * is the one prop the compiler *inherits*: an element that does not state one
 * takes the nearest ancestor's, rooted at the slide's `left`. Showing the
 * catalogue default there would have the inspector claim `left` where the
 * render will centre.
 */

import { allowedValues, type WzdDocument, type WzdElement } from '@newspapper/core/wizard';
import { ancestorPaths, elementAtPath, type WzdPath } from './paths.js';

/** The alignment the compiler will resolve for the node at `path`. */
export function inheritedAlign(doc: WzdDocument, path: WzdPath): string {
  let align = 'left';
  for (const candidate of ancestorPaths(path)) {
    const el = elementAtPath(doc, candidate);
    if (!el) continue;
    const values = allowedValues(el.type, 'align');
    const written = el.props['align'];
    if (values && written !== undefined && values.includes(written)) align = written;
  }
  return align;
}

/** An element's own text, as the content field shows it. */
export function textOf(el: WzdElement): string {
  return el.children
    .filter((child) => child.kind === 'text')
    .map((child) => (child as { value: string }).value)
    .join(' ');
}
