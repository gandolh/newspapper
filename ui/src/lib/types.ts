// MIRROR of core/src/types.ts — keep in sync
// The @newspapper/core package exports from src/types.ts which is not a compiled
// dist artefact; Vite/Astro can resolve it via the "exports" field for the dev
// server but the types fight the Astro build. We therefore copy the types here
// rather than re-exporting, to keep the UI self-contained.
//
// This mirror is core/src/types.ts minus the Node-side types (`Theme`,
// `RenderTemplateOptions`) and `UserRecord` (carries a password hash — no
// legitimate reason to exist in browser-facing code). See
// corpus/wiki/decisions-engineering.md "The UI keeps its own copy of the
// shared types". ui/src/lib/types.test.ts fails if this drifts from core.

export type SlideBlock =
  | { type: 'title'; variant: 'title-main'; text: string; kicker?: string }
  | { type: 'title'; variant: 'title-statement' | 'title-question'; text: string }
  | { type: 'body'; variant: 'body-text'; heading: string; body: string }
  | { type: 'body'; variant: 'body-list'; heading: string; items: string[] }
  | {
      type: 'body';
      variant: 'body-comparison';
      heading: string;
      left: { label: string; body: string };
      right: { label: string; body: string };
    }
  | {
      type: 'quote';
      variant: 'quote-classic' | 'quote-pullout' | 'quote-reaction';
      quote: string;
      attribution: string;
    };

export interface PostPayload {
  date: string; // YYYY-MM-DD
  title: string;
  theme: string; // e.g. "warm-industrial"
  slides: SlideBlock[]; // 2–8
  caption?: string;
  hashtags?: string[];
}

export interface Article {
  id: number;
  sourceId: string | null;
  sourceName: string;
  guid: string;
  title: string;
  url: string | null;
  publishedAt: string;
  body: string;
  savedAt: string;
}

/** A search hit — not yet saved. Returned by POST /api/scrape, never persisted. */
export interface ScrapedArticle {
  sourceId: string;
  sourceName: string;
  guid: string;
  title: string;
  url: string;
  body: string;
  publishedAt: string;
  matchCount: number;
}

export type PostStatus = 'draft' | 'published';

export interface PostHead {
  title: string;
  description: string;
  keywords: string[];
  date?: string;
  caption?: string;
  hashtags?: string[];
}

export interface Post {
  id: number;
  title: string;
  description: string;
  markup: string;
  theme: string;
  status: PostStatus;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface Keyword {
  id: number;
  name: string;
  postCount: number;
}

export interface User {
  id: number;
  username: string;
  createdAt: string;
}

export interface Upload {
  id: number;
  filename: string;
  storedPath: string;
  normalizedPath: string | null;
  mime: string;
  width: number | null;
  height: number | null;
  bytes: number;
  createdAt: string;
}

export interface RenderRecord {
  id: number;
  postId: number;
  outputDir: string;
  slideCount: number;
  optimized: boolean;
  createdAt: string;
}

/** @deprecated v2 payload post. Schema v3 stores markup; removed with the wizard routes. */
export interface PostRow {
  id: number;
  date: string;
  title: string;
  theme: string;
  payload: PostPayload;
  status: 'draft' | 'rendered';
  outputDir: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TStyle = Record<string, string | number>;

export type TNode =
  | { kind: 'box'; style?: TStyle; children?: TNode[] }
  | { kind: 'text'; style?: TStyle; text: string }
  | { kind: 'repeat'; source: string; style?: TStyle; children: TNode[] };

export interface SourceConfig {
  id: string;
  name: string;
  rss: string;
  enabled: boolean;
}

export interface Settings {
  defaultTheme: string;
}
