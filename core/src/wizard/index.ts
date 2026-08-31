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

export type { WzdBinding, WzdBindingProblem, WzdUnresolvedBinding } from './bindings.js';
export {
  WZD_BINDABLE_FIELDS,
  bindingMessage,
  findBindings,
  isBindableField,
  resolveBindings,
  unresolvedBindings,
} from './bindings.js';

export type {
  WzdAlign,
  WzdComponentRenderer,
  WzdEmphasis,
  WzdRenderContext,
  WzdSize,
} from './components/index.js';
export {
  WZD_CAPTION_COLOR,
  WZD_CAPTION_TYPOGRAPHY,
  WZD_CONTENT_STYLE_KEYS,
  WZD_FRACTION_BY_SIZE,
  WZD_IMAGE_ASPECT,
  WZD_LIST_GAP_BY_SIZE,
  WZD_RENDERERS,
  WZD_RENDERER_NAMES,
  WZD_RULE_COLORS,
  WZD_SLIDE_GAP,
  WZD_SLIDE_PADDING,
  WZD_SPACING_BY_SIZE,
  WZD_STRUCTURAL_VALUES,
  WZD_TEXT_COLORS,
  WZD_TYPOGRAPHY_SCALES,
  WZD_UNITLESS_KEYS,
  alignOf,
  baseContext,
  collectStyleEntries,
  colorToken,
  contentOf,
  emphasisOf,
  enumProp,
  escapeText,
  getRenderer,
  imageUrl,
  missingThemeTokens,
  renderComponent,
  renderComponents,
  renderSlide,
  requiredThemeTokens,
  resolveProps,
  roundedToken,
  sizeOf,
  spacingToken,
  themeValues,
  unthemedStyleValues,
} from './components/index.js';

export type { WzdCompileOptions, WzdCompileResult } from './compile.js';
export {
  WZD_COMPILE_DEFAULTS,
  WzdCompileError,
  compile,
  compileDocument,
  compileSlide,
  compileSource,
  slideElements,
} from './compile.js';
