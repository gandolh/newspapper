/**
 * A compiled `TNode` tree carries `<Image>` refs as `backgroundImage:
 * url('/uploads/<ref>')` — a path, not something the render browser can
 * fetch, since `htmlToJpeg` hands Chromium a self-contained HTML string with
 * no origin to resolve a path against.
 *
 * This walks a compiled tree and turns every such reference into the
 * absolute URL the render browser can actually load, via the same
 * `resolveUploadSrc` brief 56 built for exactly this: it validates the ref
 * and refuses anything that isn't one (a stray `http://` or `file://` slipped
 * into markup does not get a free pass to an arbitrary origin — it comes out
 * as no image at all).
 */

import type { TNode, TStyle } from '../types.js';
import { resolveUploadSrc } from '../uploads/index.js';

const CSS_URL = /^url\((['"]?)(.*)\1\)$/;

function resolveBackgroundImage(style: TStyle | undefined, baseUrl: string): TStyle | undefined {
  const raw = style?.['backgroundImage'];
  if (typeof raw !== 'string') return style;

  const match = CSS_URL.exec(raw);
  if (!match) return style;

  const resolved = resolveUploadSrc(match[2], baseUrl);
  const { backgroundImage: _drop, ...rest } = style as Record<string, string | number>;
  if (!resolved) return rest;
  return { ...rest, backgroundImage: `url('${resolved.replace(/'/g, '%27')}')` };
}

/** Resolve every `<Image>` reference in a compiled slide tree, recursively. */
export function resolveImageUrls(node: TNode, baseUrl: string): TNode {
  switch (node.kind) {
    case 'box':
      return {
        ...node,
        style: resolveBackgroundImage(node.style, baseUrl),
        children: node.children?.map((child) => resolveImageUrls(child, baseUrl)),
      };
    case 'repeat':
      return {
        ...node,
        style: resolveBackgroundImage(node.style, baseUrl),
        children: node.children.map((child) => resolveImageUrls(child, baseUrl)),
      };
    case 'text':
      return node;
  }
}
