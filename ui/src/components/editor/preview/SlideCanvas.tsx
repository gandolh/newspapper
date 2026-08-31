/**
 * One slide, at 1080×1080, scaled down by a CSS transform.
 *
 * The drop targets live in an overlay outside the transform: each slot from
 * `slots.ts` is measured against the DOM box of the child it sits beside, so a
 * drop never invents a position — it picks a gap in the flow. Measuring
 * happens once when a drag starts, since nothing in the slide moves while it
 * is in flight, and the rectangles go up to the editor in viewport
 * coordinates, which is the space the pointer speaks.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TNode, Theme } from '@newspapper/core/templates';
import TNodeView, { type NodeGestures } from './TNodeView.js';
import type { SlotDescriptor } from './slots.js';
import { zoneKey, type MeasuredZone } from '../dragTypes.js';
import styles from './SlideCanvas.module.css';

export const SLIDE_SIZE = 1080;

export interface SlideCanvasProps {
  slideKey: string;
  slide: TNode;
  theme: Theme;
  scale: number;
  selectedOffset: number | null;
  gestures: NodeGestures;
  slots: readonly SlotDescriptor[];
  dragActive: boolean;
  activeZoneKey: string | null;
  onZonesMeasured: (slideKey: string, zones: MeasuredZone[]) => void;
}

export default function SlideCanvas({
  slideKey,
  slide,
  theme,
  scale,
  selectedOffset,
  gestures,
  slots,
  dragActive,
  activeZoneKey,
  onZonesMeasured,
}: SlideCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<number, HTMLElement>());
  const [zones, setZones] = useState<MeasuredZone[]>([]);

  const registerNode = useCallback((offset: number, el: HTMLElement | null) => {
    if (el) nodes.current.set(offset, el);
    else nodes.current.delete(offset);
  }, []);

  useEffect(() => {
    if (!dragActive || !wrapperRef.current) {
      setZones([]);
      onZonesMeasured(slideKey, []);
      return;
    }
    const origin = wrapperRef.current.getBoundingClientRect();
    const measured: MeasuredZone[] = [];

    const add = (
      slot: SlotDescriptor,
      edge: MeasuredZone['edge'],
      left: number,
      top: number,
      width: number,
      height: number,
    ): void => {
      measured.push({
        key: zoneKey(slideKey, slot, edge),
        slot,
        edge,
        client: { left, top, width, height },
        local: { left: left - origin.left, top: top - origin.top, width, height },
      });
    };

    for (const slot of slots) {
      const container = nodes.current.get(slot.containerOffset);
      if (!container) continue;
      const target = slot.childOffset === null ? container : nodes.current.get(slot.childOffset);
      if (!target) continue;
      const rect = target.getBoundingClientRect();
      if (slot.side === 'inside') {
        add(slot, 'all', rect.left, rect.top, rect.width, rect.height);
        continue;
      }
      const horizontal = getComputedStyle(container).flexDirection.startsWith('row');
      const first = slot.side === 'before';
      if (horizontal) {
        add(
          slot,
          first ? 'left' : 'right',
          first ? rect.left : rect.left + rect.width / 2,
          rect.top,
          rect.width / 2,
          rect.height,
        );
      } else {
        add(
          slot,
          first ? 'top' : 'bottom',
          rect.left,
          first ? rect.top : rect.top + rect.height / 2,
          rect.width,
          rect.height / 2,
        );
      }
    }

    setZones(measured);
    onZonesMeasured(slideKey, measured);
  }, [dragActive, slots, slideKey, onZonesMeasured]);

  const inner = SLIDE_SIZE * scale;

  return (
    <div
      ref={wrapperRef}
      className={styles.wrapper}
      style={{ width: inner, height: inner }}
      data-drag={dragActive ? '' : undefined}
    >
      <div
        className={styles.canvas}
        style={{ width: SLIDE_SIZE, height: SLIDE_SIZE, transform: `scale(${scale})` }}
      >
        <TNodeView
          node={slide}
          theme={theme}
          selectedOffset={selectedOffset}
          gestures={gestures}
          registerNode={registerNode}
        />
      </div>

      {dragActive && zones.length > 0 && (
        <div className={styles.overlay}>
          {zones.map((zone) => (
            <div
              key={zone.key}
              className={[styles.zone, activeZoneKey === zone.key ? styles.zoneActive : '']
                .filter(Boolean)
                .join(' ')}
              data-edge={zone.edge}
              style={{
                left: zone.local.left,
                top: zone.local.top,
                width: zone.local.width,
                height: zone.local.height,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
