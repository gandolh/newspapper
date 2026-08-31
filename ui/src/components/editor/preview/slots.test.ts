import { describe, it, expect } from 'vitest';
import { parse, walk, isElement } from '@newspapper/core/wizard';
import { canContain, slotsForSubtree } from './slots.js';
import { slidePaths } from '../paths.js';
import { starterDocument } from '../starter.js';

const SOURCE = starterDocument('2026-08-31');
const DOC = parse(SOURCE).doc;

/** Stand-in for "the compiler produced a box for this element". */
function allRendered(): Set<number> {
  const out = new Set<number>();
  walk(DOC, (node) => {
    if (isElement(node)) out.add(node.loc.start.offset);
  });
  return out;
}

describe('canContain', () => {
  it('follows the catalogue rather than restating it', () => {
    expect(canContain('Slide', 'Heading')).toBe(true);
    expect(canContain('Slide', 'Slide')).toBe(false);
    expect(canContain('List', 'Item')).toBe(true);
    expect(canContain('List', 'Heading')).toBe(false);
    expect(canContain('Item', 'Text')).toBe(false);
    expect(canContain('Heading', 'Text')).toBe(false);
    expect(canContain('Stack', 'Image')).toBe(true);
    expect(canContain('Nope', 'Text')).toBe(false);
  });
});

describe('slotsForSubtree', () => {
  const rendered = allRendered();
  const [first, second] = slidePaths(DOC);

  it('has no slots when nothing is being dragged', () => {
    expect(slotsForSubtree(DOC, first, null, rendered)).toEqual([]);
  });

  it('offers a slot on each side of every child', () => {
    const slots = slotsForSubtree(DOC, first, 'Text', rendered);
    expect(slots).toHaveLength(6);
    expect(slots.map((s) => s.index)).toEqual([0, 1, 1, 2, 2, 3]);
    expect(new Set(slots.map((s) => s.parentPath.join()))).toEqual(new Set([first.join()]));
  });

  it('offers only the containers that accept the dragged component', () => {
    const slots = slotsForSubtree(DOC, second, 'Item', rendered);
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(DOC.children).toBeTruthy();
      expect(slot.parentPath.length).toBeGreaterThan(second.length);
    }
  });

  it('nests: a List inside a Slide yields slots at two depths', () => {
    const slots = slotsForSubtree(DOC, second, 'Text', rendered);
    const depths = new Set(slots.map((s) => s.depth));
    expect(depths.size).toBe(1);
    const itemSlots = slotsForSubtree(DOC, second, 'Item', rendered);
    expect(new Set(itemSlots.map((s) => s.depth))).toEqual(new Set([1]));
  });

  it('sorts innermost last so a nested slot paints over its parent', () => {
    const slots = slotsForSubtree(DOC, [], 'Text', rendered);
    const depths = slots.map((s) => s.depth);
    expect([...depths].sort((a, b) => a - b)).toEqual(depths);
  });

  it('gives an empty container one slot covering it', () => {
    const empty = parse('<head>\n  <title>x</title>\n</head>\n\n<body>\n  <Slide>\n    <Stack />\n  </Slide>\n</body>\n');
    const seen = new Set<number>();
    walk(empty.doc, (node) => {
      if (isElement(node)) seen.add(node.loc.start.offset);
    });
    const stackSlots = slotsForSubtree(empty.doc, slidePaths(empty.doc)[0], 'Text', seen).filter(
      (s) => s.side === 'inside',
    );
    expect(stackSlots).toHaveLength(1);
    expect(stackSlots[0].index).toBe(0);
  });

  it('skips a container the compiler did not render', () => {
    expect(slotsForSubtree(DOC, first, 'Text', new Set())).toEqual([]);
  });
});
