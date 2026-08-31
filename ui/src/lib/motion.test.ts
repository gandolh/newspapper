/**
 * The two moments, and the one rule that matters about them: under
 * `prefers-reduced-motion` the reduced path is the **end state, immediately**
 * — not a shorter animation. A regression here is invisible on screen for
 * anyone who does not set the preference, which is why it is asserted rather
 * than eyeballed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const animate = vi.fn();
const set = vi.fn();

vi.mock('animejs', () => ({
  animate: (...args: unknown[]) => animate(...args),
  utils: { set: (...args: unknown[]) => set(...args) },
}));

const { compile, hinge, prefersReducedMotion } = await import('./motion.js');

/** A stand-in for the element each moment is handed; nothing reads it. */
const element = {} as unknown as HTMLElement;

function withReducedMotion(reduce: boolean): void {
  vi.stubGlobal('window', {
    matchMedia: (query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion'),
    }),
  });
}

beforeEach(() => {
  animate.mockClear();
  set.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the authored moments', () => {
  it('animates the compile and the hinge when motion is welcome', () => {
    withReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);

    compile(element);
    hinge(element);

    expect(animate).toHaveBeenCalledTimes(2);
    expect(set).not.toHaveBeenCalled();
  });

  it('jumps straight to the end state under prefers-reduced-motion', () => {
    withReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);

    compile(element);
    hinge(element);

    expect(animate).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledTimes(2);
    // The end state, not a midpoint: the frame at rest, the tissue flat on
    // the board.
    expect(set).toHaveBeenNthCalledWith(1, element, { opacity: 1, scale: 1 });
    expect(set).toHaveBeenNthCalledWith(2, element, { rotateX: 0, opacity: 1 });
  });

  it('does nothing at all when the surface is not mounted', () => {
    withReducedMotion(false);

    compile(null);
    hinge(null);

    expect(animate).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });
});
