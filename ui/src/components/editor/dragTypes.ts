/**
 * What a drag carries, and what it can land on.
 *
 * Pointer interaction is `@use-gesture/react` — see
 * corpus/wiki/decisions-engineering.md "use-gesture handles pointer
 * interaction". The gesture only produces coordinates; the drop model is
 * unchanged and still a slot index in a child list, never a position.
 */

import type { SlotDescriptor } from './preview/slots.js';
import type { WzdPath } from './paths.js';

export type DragPayload =
  /** A component being brought in from the palette. */
  | { kind: 'new'; component: string }
  /** A node already in the document, on its way somewhere else. */
  | { kind: 'move'; path: WzdPath; component: string };

export interface ZoneRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface MeasuredZone {
  key: string;
  slot: SlotDescriptor;
  /** Viewport coordinates, for hit-testing a pointer. */
  client: ZoneRect;
  /** Coordinates inside the slide wrapper, for painting. */
  local: ZoneRect;
  edge: 'top' | 'bottom' | 'left' | 'right' | 'all';
}

export function zoneKey(slideKey: string, slot: SlotDescriptor, edge: string): string {
  return `${slideKey}|${slot.parentPath.join('.')}|${slot.index}|${edge}`;
}

function contains(rect: ZoneRect, x: number, y: number): boolean {
  return (
    x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height
  );
}

/** The innermost zone under the pointer — nested containers win their parent. */
export function zoneAt(zones: readonly MeasuredZone[], x: number, y: number): MeasuredZone | null {
  let best: MeasuredZone | null = null;
  for (const zone of zones) {
    if (!contains(zone.client, x, y)) continue;
    if (!best || zone.slot.depth >= best.slot.depth) best = zone;
  }
  return best;
}
