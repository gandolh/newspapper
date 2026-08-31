/**
 * Drop slots — the only places a drag can land.
 *
 * A slot is a position *between* two existing children of a container. There
 * are no free positions and no coordinates in the document: the layout is
 * flow, so a drop is an index in a child list and nothing more. The canvas
 * turns each slot into a hit area by measuring the child it sits beside; this
 * module decides which slots exist, and the catalogue decides which of them
 * will accept what is being dragged.
 */

import {
  getComponentSpec,
  isElement,
  type WzdDocument,
  type WzdElement,
} from '@newspapper/core/wizard';
import { elementAtPath, type WzdPath } from '../paths.js';

export interface SlotDescriptor {
  /** The container the node lands in. */
  parentPath: WzdPath;
  /** Insertion index within that container's children. */
  index: number;
  /** Source offset of the container element — how the canvas finds its DOM node. */
  containerOffset: number;
  /** The rendered child this slot is measured against; null for an empty container. */
  childOffset: number | null;
  side: 'before' | 'after' | 'inside';
  /** Nesting depth, so a slot inside a nested container wins the overlap. */
  depth: number;
}

/** True when the catalogue permits `childType` as a direct child of `containerType`. */
export function canContain(containerType: string, childType: string): boolean {
  const container = getComponentSpec(containerType);
  const child = getComponentSpec(childType);
  if (!container || !child) return false;
  if (container.children !== 'elements') return false;
  if (container.allowedChildren && !container.allowedChildren.includes(childType)) return false;
  if (child.requiredParent && !child.requiredParent.includes(containerType)) return false;
  return true;
}

function isContainer(el: WzdElement): boolean {
  const spec = getComponentSpec(el.type);
  return spec?.role === 'component' && spec.children === 'elements';
}

/**
 * Every slot inside `rootPath` that would accept `dragType`, innermost last.
 * `rendered` is the set of source offsets that actually produced a DOM node —
 * a component the compiler skipped has no box to measure against.
 */
export function slotsForSubtree(
  doc: WzdDocument,
  rootPath: WzdPath,
  dragType: string | null,
  rendered: ReadonlySet<number>,
): SlotDescriptor[] {
  if (!dragType) return [];
  const out: SlotDescriptor[] = [];

  const visit = (path: WzdPath, depth: number): void => {
    const el = elementAtPath(doc, path);
    if (!el) return;
    if (isContainer(el) && rendered.has(el.loc.start.offset)) {
      const accepts = canContain(el.type, dragType);
      const kids = el.children
        .map((child, index) => ({ child, index }))
        .filter((entry) => isElement(entry.child) && rendered.has(entry.child.loc.start.offset));
      if (accepts) {
        if (!kids.length) {
          out.push({
            parentPath: path,
            index: el.children.length,
            containerOffset: el.loc.start.offset,
            childOffset: null,
            side: 'inside',
            depth,
          });
        } else {
          for (const entry of kids) {
            const childOffset = (entry.child as WzdElement).loc.start.offset;
            out.push({
              parentPath: path,
              index: entry.index,
              containerOffset: el.loc.start.offset,
              childOffset,
              side: 'before',
              depth,
            });
            out.push({
              parentPath: path,
              index: entry.index + 1,
              containerOffset: el.loc.start.offset,
              childOffset,
              side: 'after',
              depth,
            });
          }
        }
      }
    }
    el.children.forEach((child, index) => {
      if (isElement(child)) visit([...path, index], depth + 1);
    });
  };

  visit(rootPath, 0);
  return out.sort((a, b) => a.depth - b.depth);
}
