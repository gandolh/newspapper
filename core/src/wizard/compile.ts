/**
 * The compile: `.wzd` document → one `TNode` per slide.
 *
 * `TNode` is the compile target, not an authoring surface. The tree carries
 * `$token` style refs and `typography` keys that the existing interpreter
 * resolves against a theme; nothing here resolves a token itself, so the
 * interpreter, the theme system and the Chromium renderer are untouched.
 *
 * Browser-safe: this module and everything under `components/` import types
 * and the wizard's own modules only — no `node:` built-ins, no filesystem.
 */

import type { TNode, Theme } from '../types.js';
import { elementChildren, type WzdDocument, type WzdElement } from './ast.js';
import { hasErrors, type WzdDiagnostic } from './diagnostics.js';
import { lint, type WzdLintOptions } from './lint.js';
import { parse } from './parse.js';
import {
  baseContext,
  missingThemeTokens,
  renderSlide,
  type WzdRenderContext,
} from './components/index.js';

export interface WzdCompileOptions {
  /** Prefix an `<Image src>` is resolved against. Default `/uploads`. */
  uploadBaseUrl?: string;
  /** Passed through to the linter. */
  lint?: WzdLintOptions;
}

export const WZD_COMPILE_DEFAULTS: Required<Pick<WzdCompileOptions, 'uploadBaseUrl'>> = {
  uploadBaseUrl: '/uploads',
};

export interface WzdCompileResult {
  /** One node per `<Slide>`, in document order. */
  slides: TNode[];
  /** `<head>` — the binding scope the slides were compiled against. */
  head: Record<string, string>;
  /** Everything the linter found. Compile is best-effort; these say what it skipped. */
  diagnostics: WzdDiagnostic[];
}

export class WzdCompileError extends Error {
  readonly diagnostics: readonly WzdDiagnostic[];

  constructor(message: string, diagnostics: readonly WzdDiagnostic[]) {
    super(message);
    this.name = 'WzdCompileError';
    this.diagnostics = diagnostics;
  }
}

/** The `<Slide>` elements of a document, in order. */
export function slideElements(doc: WzdDocument): WzdElement[] {
  if (!doc.bodyElement) return [];
  return elementChildren(doc.bodyElement).filter((el) => el.type === 'Slide');
}

function contextFor(
  doc: WzdDocument,
  theme: Theme,
  options: WzdCompileOptions,
  index: number,
  total: number,
): WzdRenderContext {
  return baseContext({
    theme,
    head: doc.head,
    align: 'left',
    size: 'md',
    index,
    total,
    uploadBaseUrl: options.uploadBaseUrl ?? WZD_COMPILE_DEFAULTS.uploadBaseUrl,
  });
}

/**
 * Compile without refusing. Anything the linter flags is skipped rather than
 * thrown over — an unknown component renders as nothing, a `{binding}` with
 * nowhere to resolve stays on the slide as written. This is what a live
 * preview wants while someone is still typing.
 */
export function compile(
  doc: WzdDocument,
  theme: Theme,
  options: WzdCompileOptions = {},
): WzdCompileResult {
  const missing = missingThemeTokens(theme);
  if (missing.length) {
    throw new WzdCompileError(
      `Theme "${theme.name}" is missing tokens the component library needs: ${missing.join(', ')}.`,
      [],
    );
  }

  const elements = slideElements(doc);
  const total = elements.length;
  const slides = elements.map((el, i) =>
    renderSlide(el, contextFor(doc, theme, options, i + 1, total)),
  );

  return { slides, head: { ...doc.head }, diagnostics: lint(doc, options.lint) };
}

/**
 * Compile a document that is expected to be valid — one `TNode` per slide,
 * ready for `renderTemplate`. Throws `WzdCompileError` when the document has
 * lint errors; warnings pass. Use `compile()` for the forgiving path.
 */
export function compileDocument(
  doc: WzdDocument,
  theme: Theme,
  options: WzdCompileOptions = {},
): TNode[] {
  const result = compile(doc, theme, options);
  if (hasErrors(result.diagnostics)) {
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    throw new WzdCompileError(
      `This document has ${errors.length} error${errors.length === 1 ? '' : 's'} and cannot be compiled: ${errors[0].message}`,
      result.diagnostics,
    );
  }
  return result.slides;
}

/** Parse, lint and compile in one call. Never throws on bad syntax. */
export function compileSource(
  source: string,
  theme: Theme,
  options: WzdCompileOptions = {},
): WzdCompileResult {
  const parsed = parse(source);
  const result = compile(parsed.doc, theme, options);
  return { ...result, diagnostics: [...parsed.errors, ...result.diagnostics] };
}

/**
 * Compile one slide on its own — what the editor re-renders when a single
 * slide changes. `index` and `total` are what its `<PageCounter>` shows.
 */
export function compileSlide(
  slide: WzdElement,
  theme: Theme,
  scope: { head?: Record<string, string>; index?: number; total?: number } = {},
  options: WzdCompileOptions = {},
): TNode {
  return renderSlide(
    slide,
    baseContext({
      theme,
      head: scope.head ?? {},
      align: 'left',
      size: 'md',
      index: scope.index ?? 1,
      total: scope.total ?? 1,
      uploadBaseUrl: options.uploadBaseUrl ?? WZD_COMPILE_DEFAULTS.uploadBaseUrl,
    }),
  );
}
