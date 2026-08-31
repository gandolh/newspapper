/**
 * Every visual edit, as a pure `source -> source` function.
 *
 * The markup text is the single source of truth, so an edit is: parse, mutate
 * the tree, print it back through the formatter. Nothing here holds state and
 * nothing writes text by hand — the result of any of these is exactly what a
 * person would have typed, because the formatter is what typed it.
 *
 * A source that does not parse is returned unchanged: the visual panes are
 * disabled while the document is broken, and a broken document must never be
 * silently rewritten.
 */

import {
  format,
  formatDocument,
  getComponentSpec,
  isElement,
  parse,
  WZD_HEAD_FIELDS,
  type WzdAttribute,
  type WzdDocument,
  type WzdElement,
  type WzdLoc,
  type WzdNode,
  type WzdText,
} from '@newspapper/core/wizard';
import { childrenAt, elementAtPath, isAncestorPath, type WzdPath } from './paths.js';

const ZERO: WzdLoc = {
  start: { offset: 0, line: 1, column: 1 },
  end: { offset: 0, line: 1, column: 1 },
};

/**
 * `<` cannot appear in `.wzd` text and the formatter owns line breaks, so text
 * arriving from an input is flattened before it reaches the tree.
 */
export function sanitizeText(value: string): string {
  return value.replace(/</g, '').replace(/\s+/g, ' ').trim();
}

/**
 * A prop value is delimited by `"` or `'`; a value carrying both cannot be
 * written in `.wzd` at all, so the double quotes give way.
 */
export function sanitizeAttrValue(value: string): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.includes('"') && flat.includes("'") ? flat.replace(/"/g, "'") : flat;
}

function attr(name: string, value: string): WzdAttribute {
  return { name, value, loc: ZERO, nameLoc: ZERO, valueLoc: ZERO };
}

function text(value: string): WzdText {
  return { kind: 'text', value: sanitizeText(value), raw: value, blankLineBefore: false, loc: ZERO };
}

export function makeElement(
  type: string,
  props: Record<string, string> = {},
  children: WzdNode[] = [],
): WzdElement {
  const entries = Object.entries(props).map(([k, v]) => [k, sanitizeAttrValue(v)] as const);
  return {
    kind: 'element',
    type,
    props: Object.fromEntries(entries),
    attributes: entries.map(([k, v]) => attr(k, v)),
    children,
    selfClosing: getComponentSpec(type)?.void ?? children.length === 0,
    blankLineBefore: false,
    openTagLoc: ZERO,
    closeTagLoc: null,
    nameLoc: ZERO,
    loc: ZERO,
  };
}

/** The element a palette drop inserts — enough content to be visible at once. */
export function starterElement(name: string): WzdElement {
  switch (name) {
    case 'Slide':
      return makeElement('Slide', {}, [makeElement('Heading', {}, [text('New slide')])]);
    case 'Stack':
      return makeElement('Stack', {}, [makeElement('Text', {}, [text('Stacked copy')])]);
    case 'Row':
      return makeElement('Row', {}, [
        makeElement('Text', {}, [text('Left column')]),
        makeElement('Text', {}, [text('Right column')]),
      ]);
    case 'List':
      return makeElement('List', {}, [
        makeElement('Item', {}, [text('First point')]),
        makeElement('Item', {}, [text('Second point')]),
      ]);
    case 'Item':
      return makeElement('Item', {}, [text('Another point')]);
    case 'Quote':
      return makeElement('Quote', { by: 'Someone worth quoting' }, [
        text('The line you want people to remember.'),
      ]);
    case 'Stat':
      return makeElement('Stat', { label: 'What it counts' }, [text('42')]);
    case 'Image':
      return makeElement('Image', { src: '' });
    case 'Heading':
      return makeElement('Heading', {}, [text('A heading')]);
    case 'Text':
      return makeElement('Text', {}, [text('A paragraph of body copy.')]);
    case 'Kicker':
      return makeElement('Kicker', {}, [text('Kicker')]);
    case 'Source':
      return makeElement('Source', {}, [text('Source name')]);
    default:
      return makeElement(name);
  }
}

/**
 * Parse, mutate, reprint. `mutate` returns false to abandon the edit, in which
 * case the source comes back untouched.
 */
export function applyEdit(source: string, mutate: (doc: WzdDocument) => boolean): string {
  const parsed = parse(source);
  if (parsed.errors.length) return source;
  if (!mutate(parsed.doc)) return source;
  // Reformatting the printed text guarantees the result is canonical even when
  // a mutation produced something the printer prints differently on a second pass.
  return format(formatDocument(parsed.doc));
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

function propInsertIndex(el: WzdElement, name: string): number {
  const order = Object.keys(getComponentSpec(el.type)?.props ?? {});
  const rank = order.indexOf(name);
  if (rank < 0) return el.attributes.length;
  for (let i = 0; i < el.attributes.length; i += 1) {
    const otherRank = order.indexOf(el.attributes[i].name);
    if (otherRank < 0 || otherRank > rank) return i;
  }
  return el.attributes.length;
}

function writeProp(el: WzdElement, name: string, value: string | null): void {
  const kept = el.attributes.filter((a) => a.name !== name);
  if (value === null) {
    el.attributes.splice(0, el.attributes.length, ...kept);
    delete el.props[name];
    return;
  }
  const clean = sanitizeAttrValue(value);
  const existing = el.attributes.findIndex((a) => a.name === name);
  el.attributes.splice(0, el.attributes.length, ...kept);
  const at = existing >= 0 ? Math.min(existing, el.attributes.length) : propInsertIndex(el, name);
  el.attributes.splice(at, 0, attr(name, clean));
  el.props[name] = clean;
}

/** Set a prop, or remove it when `value` is null or empty. */
export function setProp(
  source: string,
  path: WzdPath,
  name: string,
  value: string | null,
): string {
  return applyEdit(source, (doc) => {
    const el = elementAtPath(doc, path);
    if (!el) return false;
    writeProp(el, name, value === null || value === '' ? null : value);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Text content
// ---------------------------------------------------------------------------

/** Replace an element's text content. Only meaningful for `children: 'text'`. */
export function setTextContent(source: string, path: WzdPath, value: string): string {
  return applyEdit(source, (doc) => {
    const el = elementAtPath(doc, path);
    if (!el) return false;
    const clean = sanitizeText(value);
    el.children = clean ? [text(clean)] : [];
    return true;
  });
}

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

/** Insert `node` as child `index` of the element at `parentPath`. */
export function insertNode(
  source: string,
  parentPath: WzdPath,
  index: number,
  node: WzdNode,
): string {
  return applyEdit(source, (doc) => {
    const siblings = childrenAt(doc, parentPath);
    if (!siblings) return false;
    siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, node);
    return true;
  });
}

export function insertComponent(
  source: string,
  parentPath: WzdPath,
  index: number,
  name: string,
  props: Record<string, string> = {},
): string {
  const node = starterElement(name);
  for (const [k, v] of Object.entries(props)) writeProp(node, k, v);
  return insertNode(source, parentPath, index, node);
}

export function removeNode(source: string, path: WzdPath): string {
  return applyEdit(source, (doc) => {
    const siblings = childrenAt(doc, path.slice(0, -1));
    if (!siblings) return false;
    const index = path[path.length - 1];
    if (index < 0 || index >= siblings.length) return false;
    siblings.splice(index, 1);
    return true;
  });
}

export function duplicateNode(source: string, path: WzdPath): string {
  return applyEdit(source, (doc) => {
    const siblings = childrenAt(doc, path.slice(0, -1));
    if (!siblings) return false;
    const index = path[path.length - 1];
    const node = siblings[index];
    if (!node) return false;
    siblings.splice(index + 1, 0, structuredClone(node));
    return true;
  });
}

/**
 * Move a node into a slot. `toIndex` is a slot between the target's existing
 * children — the only kind of drop this editor has, because the layout is flow.
 */
export function moveNode(
  source: string,
  from: WzdPath,
  toParent: WzdPath,
  toIndex: number,
): string {
  if (!from.length) return source;
  if (isAncestorPath(from, toParent) || from.join() === toParent.join()) return source;
  return applyEdit(source, (doc) => {
    const fromSiblings = childrenAt(doc, from.slice(0, -1));
    const target = childrenAt(doc, toParent);
    if (!fromSiblings || !target) return false;
    const fromIndex = from[from.length - 1];
    const node = fromSiblings[fromIndex];
    if (!node) return false;
    let at = Math.max(0, Math.min(toIndex, target.length));
    if (fromSiblings === target) {
      if (at === fromIndex || at === fromIndex + 1) return false;
      if (at > fromIndex) at -= 1;
    }
    fromSiblings.splice(fromIndex, 1);
    target.splice(at, 0, node);
    return true;
  });
}

/** Move a node one slot earlier or later among its siblings. */
export function nudgeNode(source: string, path: WzdPath, delta: -1 | 1): string {
  if (!path.length) return source;
  const index = path[path.length - 1];
  return moveNode(source, path, path.slice(0, -1), delta < 0 ? index - 1 : index + 2);
}

// ---------------------------------------------------------------------------
// <head>
// ---------------------------------------------------------------------------

function headElement(doc: WzdDocument): WzdElement | null {
  const found = doc.children.find((n) => isElement(n) && n.type === 'head');
  return found ? (found as WzdElement) : null;
}

/** Set a `<head>` field, creating `<head>` and the field element as needed. */
export function setHeadField(source: string, field: string, value: string): string {
  return applyEdit(source, (doc) => {
    const clean = sanitizeText(value);
    let head = headElement(doc);
    if (!head) {
      if (!clean) return false;
      head = makeElement('head');
      doc.children.unshift(head);
    }
    const existing = head.children.findIndex((n) => isElement(n) && n.type === field);
    if (!clean) {
      if (existing < 0) return false;
      head.children.splice(existing, 1);
      return true;
    }
    if (existing >= 0) {
      (head.children[existing] as WzdElement).children = [text(clean)];
      return true;
    }
    const rank = WZD_HEAD_FIELDS.indexOf(field as (typeof WZD_HEAD_FIELDS)[number]);
    let at = head.children.length;
    if (rank >= 0) {
      at = head.children.findIndex((n) => {
        if (!isElement(n)) return false;
        const other = WZD_HEAD_FIELDS.indexOf(n.type as (typeof WZD_HEAD_FIELDS)[number]);
        return other < 0 || other > rank;
      });
      if (at < 0) at = head.children.length;
    }
    head.children.splice(at, 0, makeElement(field, {}, [text(clean)]));
    return true;
  });
}

/**
 * Where `moveNode` will leave the node — the same index adjustment it makes,
 * so the editor can keep the moved node selected.
 */
export function movedPath(from: WzdPath, toParent: WzdPath, toIndex: number): WzdPath {
  let at = toIndex;
  if (from.slice(0, -1).join() === toParent.join()) {
    const fromIndex = from[from.length - 1];
    if (at > fromIndex) at -= 1;
  }
  return [...toParent, Math.max(0, at)];
}
