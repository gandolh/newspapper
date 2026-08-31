/**
 * `{field}` bindings — the one place a slide reads from `<head>`.
 *
 * The linter reports an unresolved binding; the compiler substitutes a
 * resolved one. Both read this module so they can never disagree about what
 * counts as a binding.
 */

import { WZD_HEAD_FIELDS } from './catalogue.js';

/** A `{name}` occurrence inside a text run. */
export interface WzdBinding {
  /** The field named between the braces, trimmed. */
  name: string;
  /** `{name}` exactly as written. */
  raw: string;
  /** Offset of the opening brace within the text it was found in. */
  start: number;
  /** Offset just past the closing brace. */
  end: number;
}

export type WzdBindingProblem = 'unknown-field' | 'empty-field';

export interface WzdUnresolvedBinding extends WzdBinding {
  problem: WzdBindingProblem;
}

const PATTERN = /\{([^{}]*)\}/g;

/** The fields a `{binding}` may name — the `<head>` fields, and only those. */
export const WZD_BINDABLE_FIELDS: readonly string[] = WZD_HEAD_FIELDS;

export function isBindableField(name: string): boolean {
  return WZD_BINDABLE_FIELDS.includes(name);
}

/** Every `{...}` in a text run, in source order. */
export function findBindings(text: string): WzdBinding[] {
  const found: WzdBinding[] = [];
  PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PATTERN.exec(text)) !== null) {
    found.push({
      name: match[1].trim(),
      raw: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return found;
}

/** The bindings that would not resolve against `head`, with why. */
export function unresolvedBindings(
  text: string,
  head: Record<string, string>,
): WzdUnresolvedBinding[] {
  const problems: WzdUnresolvedBinding[] = [];
  for (const binding of findBindings(text)) {
    if (!isBindableField(binding.name)) {
      problems.push({ ...binding, problem: 'unknown-field' });
    } else if (!head[binding.name]) {
      problems.push({ ...binding, problem: 'empty-field' });
    }
  }
  return problems;
}

/**
 * Substitute every resolvable binding. An unresolved one is left as written so
 * the author sees it on the slide rather than a silent gap — the linter is what
 * reports it.
 */
export function resolveBindings(text: string, head: Record<string, string>): string {
  return text.replace(PATTERN, (raw, inner: string) => {
    const name = inner.trim();
    if (!isBindableField(name)) return raw;
    const value = head[name];
    return value ? value : raw;
  });
}

/** The message a `unknown-binding` finding carries. */
export function bindingMessage(binding: WzdUnresolvedBinding): string {
  if (binding.problem === 'unknown-field') {
    return `\`${binding.raw}\` does not name a <head> field. Bindings read: ${WZD_BINDABLE_FIELDS.join(', ')}.`;
  }
  return `\`${binding.raw}\` has nothing to resolve to — the <head> declares no ${binding.name}.`;
}
