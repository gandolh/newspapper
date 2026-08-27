// Browser-safe subpath: no `fs`, `path`, or any Node API.
// Re-exports the compile-target types and the pure TNode interpreter.
export type {
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
  validateSlideData,
} from './interpreter.js';
