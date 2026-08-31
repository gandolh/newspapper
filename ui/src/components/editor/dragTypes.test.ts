import { describe, it, expect } from 'vitest';
import { zoneAt, zoneKey, type MeasuredZone } from './dragTypes.js';
import type { SlotDescriptor } from './preview/slots.js';

function slot(depth: number, index = 0): SlotDescriptor {
  return {
    parentPath: [1, 0],
    index,
    containerOffset: 0,
    childOffset: null,
    side: 'before',
    depth,
  };
}

function zone(key: string, depth: number, box: [number, number, number, number]): MeasuredZone {
  const [left, top, width, height] = box;
  return {
    key,
    slot: slot(depth),
    client: { left, top, width, height },
    local: { left, top, width, height },
    edge: 'top',
  };
}

describe('zoneAt', () => {
  const outer = zone('outer', 0, [0, 0, 100, 100]);
  const inner = zone('inner', 2, [40, 40, 20, 20]);

  it('finds nothing when the pointer is outside every zone', () => {
    expect(zoneAt([outer, inner], 500, 500)).toBeNull();
    expect(zoneAt([], 10, 10)).toBeNull();
  });

  it('picks the only zone under the pointer', () => {
    expect(zoneAt([outer, inner], 10, 10)?.key).toBe('outer');
  });

  it('lets the innermost zone win the overlap, whatever the order', () => {
    expect(zoneAt([outer, inner], 50, 50)?.key).toBe('inner');
    expect(zoneAt([inner, outer], 50, 50)?.key).toBe('inner');
  });

  it('includes the edges of a zone', () => {
    expect(zoneAt([outer], 0, 0)?.key).toBe('outer');
    expect(zoneAt([outer], 100, 100)?.key).toBe('outer');
    expect(zoneAt([outer], 101, 100)).toBeNull();
  });
});

describe('zoneKey', () => {
  it('is unique per slide, container, slot and edge', () => {
    const keys = new Set([
      zoneKey('1.0', slot(0, 0), 'top'),
      zoneKey('1.0', slot(0, 0), 'bottom'),
      zoneKey('1.0', slot(0, 1), 'top'),
      zoneKey('1.1', slot(0, 0), 'top'),
    ]);
    expect(keys.size).toBe(4);
  });
});
