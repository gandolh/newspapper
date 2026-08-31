/**
 * Turning a compiled node's `$token` styles into CSS, for the browser.
 *
 * There is exactly one implementation of that in this repo and it is core's
 * `resolveStyle` — the same function the Chromium renderer runs. This module
 * adds no resolution of its own; it only decides what to do when core refuses.
 *
 * Core throws on an unknown token, which is right for a render and wrong for a
 * preview: a half-finished document would become uneditable. So the fast path
 * is core's call verbatim, and only a refusal triggers a second pass that
 * re-runs `resolveStyle` one declaration at a time to find which ones the
 * theme cannot satisfy. The rest of the node stays visible and the failures
 * become a warning on it — see corpus/wiki/decisions-engineering.md "The
 * builder preview is strict, and says so".
 */

import { resolveStyle } from '@newspapper/core/templates';
import type { TNode, TStyle, Theme } from '@newspapper/core/templates';
import { sourceOffsetOf, styleWithoutStamp } from './compileTraced.js';

export interface ResolvedStyle {
  css: Record<string, string>;
  /** One message per declaration the theme could not resolve. */
  problems: string[];
}

export function resolveTolerant(style: TStyle, theme: Theme): ResolvedStyle {
  try {
    return { css: resolveStyle(style, theme), problems: [] };
  } catch {
    // fall through to the per-declaration pass
  }
  const css: Record<string, string> = {};
  const problems: string[] = [];
  // `typography` expands first and explicit keys override it, which is the
  // order `resolveStyle` itself uses.
  const keys = ['typography', ...Object.keys(style).filter((k) => k !== 'typography')];
  for (const key of keys) {
    if (!(key in style)) continue;
    try {
      Object.assign(css, resolveStyle({ [key]: style[key] } as TStyle, theme));
    } catch (err) {
      problems.push(err instanceof Error ? err.message : String(err));
    }
  }
  return { css, problems };
}

const CUSTOM = /^--/;

/** CSS declarations as React expects them: camelCase, custom properties intact. */
export function toReactStyle(css: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(css)) {
    out[CUSTOM.test(key) ? key : key.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())] =
      value;
  }
  return out;
}

export function childrenOf(node: TNode): TNode[] {
  if (node.kind === 'box') return node.children ?? [];
  if (node.kind === 'repeat') return node.children;
  return [];
}

export interface StyleProblem {
  offset: number | null;
  problems: string[];
}

/** Every node the theme cannot fully style — what the preview banner lists. */
export function collectStyleProblems(nodes: readonly TNode[], theme: Theme): StyleProblem[] {
  const out: StyleProblem[] = [];
  const visit = (node: TNode): void => {
    const { problems } = resolveTolerant(styleWithoutStamp(node), theme);
    if (problems.length) out.push({ offset: sourceOffsetOf(node), problems });
    childrenOf(node).forEach(visit);
  };
  nodes.forEach(visit);
  return out;
}
