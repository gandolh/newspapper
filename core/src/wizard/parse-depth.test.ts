/**
 * Brief 98. `parse` promises never to throw. A document nested a few thousand
 * levels deep used to overflow the stack (one frame per level) and throw a
 * RangeError, which blanked the editor and left the post unopenable.
 */
import { describe, expect, it } from 'vitest';
import { MAX_DEPTH, parse } from './parse.js';

function nested(depth: number): string {
  return `<head><title>T</title></head><body><Slide>${'<Stack>'.repeat(depth)}<Text>deep</Text>${'</Stack>'.repeat(depth)}</Slide></body>`;
}

const depthErrors = (source: string) =>
  parse(source).errors.filter(
    (e) => e.code === 'syntax-error' && e.message.includes(`more than ${MAX_DEPTH} deep`),
  );

describe('nesting depth', () => {
  it.each([10, 150, MAX_DEPTH - 3])(
    'a document %i levels deep parses with no depth error',
    (depth) => {
      const result = parse(nested(depth));
      expect(depthErrors(nested(depth))).toEqual([]);
      expect(result.errors.filter((e) => e.code === 'syntax-error')).toEqual([]);
    },
  );

  it.each([1_000, 6_000])(
    'a document %i levels deep reports one depth error and does not throw',
    (depth) => {
      expect(() => parse(nested(depth))).not.toThrow();
      expect(depthErrors(nested(depth))).toHaveLength(1);
      // The over-deep part is the explanation; the open ancestors are not each
      // reported as "never closed" on top of it.
      expect(
        parse(nested(depth)).errors.filter((e) => e.message.includes('is never closed')),
      ).toEqual([]);
    },
  );
});
