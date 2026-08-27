/**
 * Newspapper Wizard (.wzd) — AST shapes.
 *
 * Every node carries a source range so the editor can map between text and
 * tree in both directions. Offsets are 0-based; lines and columns are 1-based.
 */

export interface WzdPosition {
  offset: number;
  line: number;
  column: number;
}

export interface WzdLoc {
  start: WzdPosition;
  end: WzdPosition;
}

export interface WzdAttribute {
  name: string;
  value: string;
  /** `name="value"` including the quotes. */
  loc: WzdLoc;
  nameLoc: WzdLoc;
  /** The value text between the quotes, exclusive of them. */
  valueLoc: WzdLoc;
}

export interface WzdElement {
  kind: 'element';
  /** Tag name as written. Lowercase = document structure, Capitalized = component. */
  type: string;
  /** Flattened `name -> value`, first occurrence wins. Insertion order = source order. */
  props: Record<string, string>;
  /** Every attribute as written, including duplicates, with ranges. */
  attributes: WzdAttribute[];
  children: WzdNode[];
  selfClosing: boolean;
  /** True when a blank line separated this node from its previous sibling. */
  blankLineBefore: boolean;
  /** `<Name ...>` or `<Name ... />`. */
  openTagLoc: WzdLoc;
  /** `</Name>`, or null when self-closing or never closed. */
  closeTagLoc: WzdLoc | null;
  /** The tag name inside the opening tag. */
  nameLoc: WzdLoc;
  /** Opening tag through closing tag. */
  loc: WzdLoc;
}

export interface WzdText {
  kind: 'text';
  /** Whitespace-collapsed, trimmed. This is what the compiler renders. */
  value: string;
  /** The exact source slice covered by `loc`. */
  raw: string;
  blankLineBefore: boolean;
  loc: WzdLoc;
}

export interface WzdComment {
  kind: 'comment';
  /** Whitespace-collapsed, trimmed comment body. */
  value: string;
  raw: string;
  blankLineBefore: boolean;
  loc: WzdLoc;
}

export type WzdNode = WzdElement | WzdText | WzdComment;

export interface WzdDocument {
  kind: 'document';
  /** `<head>` metadata as `field -> text`, e.g. `{ title: 'Budget', date: '2026-08-27' }`. */
  head: Record<string, string>;
  /** Children of `<body>`; empty when there is no `<body>`. */
  body: WzdNode[];
  /** Every top-level node in source order, including `<head>`, `<body>` and strays. */
  children: WzdNode[];
  headElement: WzdElement | null;
  bodyElement: WzdElement | null;
  loc: WzdLoc;
}

export const WZD_DOCUMENT_PARENT = '#document';

export function isElement(node: WzdNode): node is WzdElement {
  return node.kind === 'element';
}

export function isText(node: WzdNode): node is WzdText {
  return node.kind === 'text';
}

export function isComment(node: WzdNode): node is WzdComment {
  return node.kind === 'comment';
}

export function elementChildren(node: WzdElement): WzdElement[] {
  return node.children.filter(isElement);
}

export function textContent(node: WzdElement): string {
  const parts: string[] = [];
  for (const child of node.children) {
    if (child.kind === 'text') parts.push(child.value);
    else if (child.kind === 'element') parts.push(textContent(child));
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export interface WzdVisitorContext {
  /** Ancestor elements, outermost first. Empty at the top level. */
  ancestors: WzdElement[];
  /** The containing element, or null at the top level. */
  parent: WzdElement | null;
  /** Index within the parent's children. */
  index: number;
}

/** Depth-first pre-order walk over a document or a subtree. */
export function walk(
  root: WzdDocument | WzdNode,
  visit: (node: WzdNode, ctx: WzdVisitorContext) => void,
): void {
  const top = root.kind === 'document' ? root.children : [root];
  const ancestors: WzdElement[] = [];
  const step = (nodes: WzdNode[]): void => {
    nodes.forEach((node, index) => {
      visit(node, {
        ancestors: [...ancestors],
        parent: ancestors.length ? ancestors[ancestors.length - 1] : null,
        index,
      });
      if (node.kind === 'element') {
        ancestors.push(node);
        step(node.children);
        ancestors.pop();
      }
    });
  };
  step(top);
}

/** True when `offset` falls inside `loc` (start inclusive, end exclusive). */
export function locContains(loc: WzdLoc, offset: number): boolean {
  return offset >= loc.start.offset && offset < loc.end.offset;
}

/** The innermost node whose range contains `offset` — the editor's cursor→node lookup. */
export function nodeAt(doc: WzdDocument, offset: number): WzdNode | null {
  let found: WzdNode | null = null;
  walk(doc, (node) => {
    if (locContains(node.loc, offset)) {
      if (!found || node.loc.start.offset >= found.loc.start.offset) found = node;
    }
  });
  return found;
}
