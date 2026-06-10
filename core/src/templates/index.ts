// Browser-safe subpath: no `fs`, `path`, or any Node API.
// Re-exports template types and the pure interpreter.
export type {
  TemplateDoc,
  FieldSpec,
  TNode,
  TStyle,
  RenderTemplateOptions,
  SlideBlock,
  PostPayload,
  Theme,
} from '../types.js';

export {
  renderTemplate,
  resolveStyle,
  validateTemplateDoc,
  validateSlideData,
} from './interpreter.js';
