/**
 * Newspapper Wizard (`.wzd`) — the language a post is written in.
 *
 * text -> parse -> WzdDocument -> format -> text, with lint over the tree.
 * The catalogue is data; the compiler (brief 54) and the editor (brief 59)
 * both read it rather than restating it.
 */

export type {
  WzdPosition,
  WzdLoc,
  WzdAttribute,
  WzdElement,
  WzdText,
  WzdComment,
  WzdNode,
  WzdDocument,
  WzdVisitorContext,
} from './ast.js';
export {
  WZD_DOCUMENT_PARENT,
  isElement,
  isText,
  isComment,
  elementChildren,
  textContent,
  walk,
  locContains,
  nodeAt,
} from './ast.js';

export type {
  WzdPropKind,
  WzdPropSpec,
  WzdChildModel,
  WzdComponentGroup,
  WzdComponentSpec,
  WzdScaleName,
  WzdHeadField,
} from './catalogue.js';
export {
  WZD_PROP_SCALES,
  WZD_HEAD_FIELDS,
  WZD_REQUIRED_HEAD_FIELDS,
  WZD_COMPONENTS,
  WZD_COMPONENT_NAMES,
  WZD_RENDERABLE_NAMES,
  getComponentSpec,
  isKnownComponent,
  isHeadField,
  propsFor,
  allowedValues,
} from './catalogue.js';

export type { WzdSeverity, WzdDiagnosticCode, WzdDiagnostic, WzdRule } from './diagnostics.js';
export { WZD_RULES, hasErrors, sortDiagnostics, formatDiagnostic } from './diagnostics.js';

export type { WzdParseResult } from './parse.js';
export { parse, parseOrThrow, normalizeSource, WzdSyntaxError } from './parse.js';

export type { WzdFormatOptions } from './format.js';
export { format, formatDocument, isFormatted, WZD_FORMAT_DEFAULTS } from './format.js';

export type { WzdLintOptions } from './lint.js';
export { lint, lintSource, WZD_LINT_DEFAULTS } from './lint.js';

export type { WzdSample } from './samples.js';
export { WZD_SAMPLES } from './samples.js';
