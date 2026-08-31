import { describe, it, expect } from 'vitest';
import { parse } from '@newspapper/core/wizard';
import {
  ancestorPaths,
  bodyPath,
  elementAtPath,
  elementPathAtOffset,
  isAncestorPath,
  nodeAtPath,
  pathAtOffset,
  samePath,
  slidePathFor,
  slidePaths,
} from './paths.js';
import { starterDocument } from './starter.js';

const SOURCE = starterDocument('2026-08-31');
const DOC = parse(SOURCE).doc;

describe('paths', () => {
  it('finds <body> and the slides under it', () => {
    expect(bodyPath(DOC)).toEqual([1]);
    expect(slidePaths(DOC)).toEqual([
      [1, 0],
      [1, 1],
    ]);
  });

  it('round-trips a path to an element and back through its offset', () => {
    for (const path of slidePaths(DOC)) {
      const el = elementAtPath(DOC, path);
      expect(el?.type).toBe('Slide');
      expect(elementPathAtOffset(DOC, el?.loc.start.offset ?? -1)).toEqual(path);
    }
  });

  it('resolves a cursor inside text to the element that owns it', () => {
    const at = SOURCE.indexOf('worth swiping') + 3;
    const path = elementPathAtOffset(DOC, at);
    expect(elementAtPath(DOC, path)?.type).toBe('Heading');
  });

  it('resolves a cursor inside a prop value to the element', () => {
    const at = SOURCE.indexOf('size="xl"') + 7;
    expect(elementAtPath(DOC, elementPathAtOffset(DOC, at))?.type).toBe('Heading');
  });

  it('returns the innermost node, text included, from pathAtOffset', () => {
    const at = SOURCE.indexOf('Drag a component') + 2;
    expect(nodeAtPath(DOC, pathAtOffset(DOC, at))?.kind).toBe('text');
  });

  it('has no path past the end of the document', () => {
    expect(pathAtOffset(DOC, SOURCE.length)).toBeNull();
    expect(elementPathAtOffset(DOC, SOURCE.length)).toBeNull();
  });

  it('finds the slide enclosing a deeply nested node', () => {
    const at = SOURCE.indexOf('Click anything');
    const path = elementPathAtOffset(DOC, at);
    expect(path?.length).toBeGreaterThan(3);
    expect(slidePathFor(DOC, path)).toEqual([1, 1]);
  });

  it('compares and enumerates paths', () => {
    expect(samePath([1, 2], [1, 2])).toBe(true);
    expect(samePath([1, 2], [1])).toBe(false);
    expect(samePath(null, null)).toBe(true);
    expect(samePath(null, [1])).toBe(false);
    expect(isAncestorPath([1], [1, 2])).toBe(true);
    expect(isAncestorPath([1, 2], [1, 2])).toBe(false);
    expect(isAncestorPath([2], [1, 2])).toBe(false);
    expect(ancestorPaths([1, 2, 3])).toEqual([[1], [1, 2], [1, 2, 3]]);
  });

  it('returns null for a path that no longer resolves', () => {
    expect(elementAtPath(DOC, [9, 9])).toBeNull();
    expect(nodeAtPath(DOC, [])).toBeNull();
    expect(nodeAtPath(DOC, null)).toBeNull();
  });
});
