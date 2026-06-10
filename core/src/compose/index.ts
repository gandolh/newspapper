// Compose module — Ollama client, post composition, caption, per-slide AI

export type { OllamaConfig } from './types.js';
export { OllamaClient, OllamaError } from './ollama.js';
export { DEFAULT_PROMPT, VARIANT_SHAPES, buildUserPrompt } from './prompt.js';
export { parsePost, parseSlide, ComposeParseError } from './parse.js';
export { composePost } from './compose-post.js';
export type { ComposePostOptions } from './compose-post.js';
export { generateCaption } from './caption.js';
export type { CaptionResult } from './caption.js';
export { slideAi } from './slide-ai.js';
export type { SlideAiAction } from './slide-ai.js';
