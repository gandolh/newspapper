/** Diagnostic shapes shared by the parser and the linter. */

import type { WzdLoc } from './ast.js';

export type WzdSeverity = 'error' | 'warning';

export type WzdDiagnosticCode =
  | 'syntax-error'
  | 'unknown-component'
  | 'unknown-prop'
  | 'invalid-prop-value'
  | 'missing-prop'
  | 'duplicate-prop'
  | 'misplaced-element'
  | 'missing-head'
  | 'missing-title'
  | 'empty-slide'
  | 'slide-count'
  | 'unknown-binding';

export interface WzdDiagnostic {
  code: WzdDiagnosticCode;
  severity: WzdSeverity;
  /** Written for a person to act on, ending in a full stop. */
  message: string;
  loc: WzdLoc;
}

export interface WzdRule {
  code: WzdDiagnosticCode;
  /** The severity this rule usually reports at; a finding carries its own. */
  severity: WzdSeverity;
  summary: string;
}

/** The rule table, as data — the settings UI lists it. */
export const WZD_RULES: Readonly<Record<WzdDiagnosticCode, WzdRule>> = Object.freeze({
  'syntax-error': {
    code: 'syntax-error',
    severity: 'error',
    summary: 'The document could not be parsed as written.',
  },
  'unknown-component': {
    code: 'unknown-component',
    severity: 'error',
    summary: 'A tag that is not in the catalogue.',
  },
  'unknown-prop': {
    code: 'unknown-prop',
    severity: 'error',
    summary: 'A prop that component does not take.',
  },
  'invalid-prop-value': {
    code: 'invalid-prop-value',
    severity: 'error',
    summary: 'A prop value outside its scale.',
  },
  'missing-prop': {
    code: 'missing-prop',
    severity: 'error',
    summary: 'A required prop was not given.',
  },
  'duplicate-prop': {
    code: 'duplicate-prop',
    severity: 'error',
    summary: 'The same prop was written twice on one element.',
  },
  'misplaced-element': {
    code: 'misplaced-element',
    severity: 'error',
    summary: 'An element somewhere it may not appear.',
  },
  'missing-head': {
    code: 'missing-head',
    severity: 'error',
    summary: 'The document has no <head>.',
  },
  'missing-title': {
    code: 'missing-title',
    severity: 'error',
    summary: 'The <head> declares no title.',
  },
  'empty-slide': {
    code: 'empty-slide',
    severity: 'error',
    summary: 'A slide with nothing on it.',
  },
  'slide-count': {
    code: 'slide-count',
    severity: 'error',
    summary: 'A post needs at least one slide, and gets unwieldy past ten.',
  },
  'unknown-binding': {
    code: 'unknown-binding',
    severity: 'error',
    summary: 'A {binding} with no <head> field behind it.',
  },
});

export function hasErrors(diagnostics: readonly WzdDiagnostic[]): boolean {
  return diagnostics.some((d) => d.severity === 'error');
}

/** Sort by position, then by code — a stable order for display. */
export function sortDiagnostics(diagnostics: readonly WzdDiagnostic[]): WzdDiagnostic[] {
  return [...diagnostics].sort(
    (a, b) => a.loc.start.offset - b.loc.start.offset || a.code.localeCompare(b.code),
  );
}

export function formatDiagnostic(d: WzdDiagnostic): string {
  return `${d.loc.start.line}:${d.loc.start.column}  ${d.severity}  ${d.message}  ${d.code}`;
}
