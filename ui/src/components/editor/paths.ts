/**
 * Node paths — the editor's stable handle on a node in the document.
 *
 * A path is the chain of child indices from the document root, so it survives
 * a reformat (which moves every offset) while an offset does not. Offsets are
 * still what the parser and the preview speak, so both directions are here:
 * `pathAtOffset` for cursor → node, `elementAtPath` for node → source range.
 */

import {
  isElement,
  type WzdDocument,
  type WzdElement,
  type WzdNode,
} from '@newspapper/core/wizard';

export type WzdPath = readonly number[];

export function samePath(a: WzdPath | null, b: WzdPath | null): boolean {
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

export function isAncestorPath(ancestor: WzdPath, descendant: WzdPath): boolean {
  if (ancestor.length >= descendant.length) return false;
  return ancestor.every((n, i) => n === descendant[i]);
}

export function parentPath(path: WzdPath): WzdPath | null {
  return path.length ? path.slice(0, -1) : null;
}

/** The sibling list a path indexes into. */
export function childrenAt(doc: WzdDocument, path: WzdPath): WzdNode[] | null {
  let nodes: WzdNode[] = doc.children;
  for (const index of path) {
    const node = nodes[index];
    if (!node || node.kind !== 'element') return null;
    nodes = node.children;
  }
  return nodes;
}

export function nodeAtPath(doc: WzdDocument, path: WzdPath | null): WzdNode | null {
  if (!path || !path.length) return null;
  const siblings = childrenAt(doc, path.slice(0, -1));
  return siblings?.[path[path.length - 1]] ?? null;
}

export function elementAtPath(doc: WzdDocument, path: WzdPath | null): WzdElement | null {
  const node = nodeAtPath(doc, path);
  return node && isElement(node) ? node : null;
}

function search(nodes: readonly WzdNode[], offset: number, prefix: number[]): number[] | null {
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (offset < node.loc.start.offset || offset >= node.loc.end.offset) continue;
    const here = [...prefix, i];
    if (node.kind === 'element') {
      const deeper = search(node.children, offset, here);
      if (deeper) return deeper;
    }
    return here;
  }
  return null;
}

/** The innermost node whose range covers `offset`, as a path. */
export function pathAtOffset(doc: WzdDocument, offset: number): WzdPath | null {
  return search(doc.children, offset, []);
}

/**
 * The innermost *element* at `offset` — what a cursor in a `<Heading>`'s text
 * should select. Climbs out of text and comment nodes.
 */
export function elementPathAtOffset(doc: WzdDocument, offset: number): WzdPath | null {
  let path = pathAtOffset(doc, offset);
  while (path && path.length) {
    if (elementAtPath(doc, path)) return path;
    path = path.slice(0, -1);
  }
  return null;
}

/** The path of the element whose opening tag starts at exactly `offset`. */
export function pathAtStartOffset(doc: WzdDocument, offset: number): WzdPath | null {
  const path = pathAtOffset(doc, offset);
  if (!path) return null;
  const node = nodeAtPath(doc, path);
  return node && node.loc.start.offset === offset ? path : null;
}

/** Every ancestor path of `path`, outermost first, including `path` itself. */
export function ancestorPaths(path: WzdPath): WzdPath[] {
  return path.map((_, i) => path.slice(0, i + 1));
}

/** The nearest enclosing `<Slide>`, as a path. */
export function slidePathFor(doc: WzdDocument, path: WzdPath | null): WzdPath | null {
  if (!path) return null;
  for (const candidate of ancestorPaths(path)) {
    const el = elementAtPath(doc, candidate);
    if (el?.type === 'Slide') return candidate;
  }
  return null;
}

/** Paths of the `<Slide>` elements, in document order. */
export function slidePaths(doc: WzdDocument): WzdPath[] {
  const bodyIndex = doc.children.findIndex((n) => isElement(n) && n.type === 'body');
  if (bodyIndex < 0) return [];
  const body = doc.children[bodyIndex] as WzdElement;
  const out: WzdPath[] = [];
  body.children.forEach((child, i) => {
    if (isElement(child) && child.type === 'Slide') out.push([bodyIndex, i]);
  });
  return out;
}

/** The path of `<body>`, or null when the document has none. */
export function bodyPath(doc: WzdDocument): WzdPath | null {
  const index = doc.children.findIndex((n) => isElement(n) && n.type === 'body');
  return index < 0 ? null : [index];
}
