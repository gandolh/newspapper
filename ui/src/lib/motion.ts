/**
 * The two authored moments. There are no others.
 *
 * DESIGN.md §6: one moment per surface. On the editor it is **the compile** —
 * the stage re-sets around a slide that has just been set. On the inspector it
 * is **the hinge** — a real rotation of the tissue about its top edge.
 *
 * Both are gated behind `prefers-reduced-motion`, and the reduced path is the
 * end state, immediately — not a shorter animation.
 *
 * Two rules hold everywhere in here:
 *   1. **The canvas never moves.** `compile()` is handed the stage *frame* —
 *      the crop marks, register targets and dimension line — never the 1080²
 *      artwork. A preview that animates in a way the renderer cannot reproduce
 *      is lying about what it will print.
 *   2. Nothing else in the app calls `animate()`. If a third moment starts to
 *      feel necessary, one of these two is in the wrong place.
 */

import { animate, utils } from 'animejs';

/** True when the operator has asked for less motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The compile. The stage frame ticks in around a slide that has just been
 * set: the marks draw, the dimension line settles. The artwork inside the
 * crop marks is untouched.
 */
export function compile(frame: HTMLElement | null): void {
  if (!frame) return;
  if (prefersReducedMotion()) {
    utils.set(frame, { opacity: 1, scale: 1 });
    return;
  }
  animate(frame, {
    opacity: [0.25, 1],
    scale: [1.014, 1],
    duration: 260,
    ease: 'outQuad',
  });
}

/**
 * The hinge. The tissue swings down about its top edge and comes to rest on
 * the board with the notes already on it. A rotation, not a fade.
 */
export function hinge(sheet: HTMLElement | null): void {
  if (!sheet) return;
  if (prefersReducedMotion()) {
    utils.set(sheet, { rotateX: 0, opacity: 1 });
    return;
  }
  animate(sheet, {
    rotateX: [-11, 0],
    opacity: [0.55, 1],
    duration: 300,
    ease: 'outCubic',
  });
}
