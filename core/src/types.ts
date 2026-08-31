// Built-in template bindings available in all TNode trees:
//   {{_index}}  — 1-based slide index (number)
//   {{_total}}  — total slide count (number)
//   {{_date}}   — post date string YYYY-MM-DD

export type SlideBlock =
  | { type: 'title'; variant: 'title-main'; text: string; kicker?: string }
  | { type: 'title'; variant: 'title-statement' | 'title-question'; text: string }
  | { type: 'body'; variant: 'body-text'; heading: string; body: string }
  | { type: 'body'; variant: 'body-list'; heading: string; items: string[] }
  | { type: 'body'; variant: 'body-comparison'; heading: string;
      left: { label: string; body: string }; right: { label: string; body: string } }
  | { type: 'quote'; variant: 'quote-classic' | 'quote-pullout' | 'quote-reaction';
      quote: string; attribution: string };

export interface PostPayload {
  date: string;            // YYYY-MM-DD
  title: string;
  theme: string;           // e.g. "warm-industrial-1"
  slides: SlideBlock[];    // 2–8
  caption?: string;
  hashtags?: string[];
}

export interface Article {
  id: number; sourceId: string | null; sourceName: string; guid: string;
  title: string; url: string | null; publishedAt: string; body: string; savedAt: string;
}

// ---- Authored posts (schema v3) ----
// The `.wzd` markup is the source of truth; every other column on `posts` is
// derived from its <head> block on save and exists only to index the library.

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

export interface UserRecord extends User {
  passwordHash: string;
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
  id: number; date: string; title: string; theme: string;
  payload: PostPayload; status: 'draft' | 'rendered';
  outputDir: string | null; createdAt: string; updatedAt: string;
}

export interface Theme {
  name: string;
  colors: Record<string, string>;
  typography: Record<string, { fontFamily: string; fontSize: string; fontWeight: string;
    lineHeight: string; letterSpacing?: string }>;
  rounded: Record<string, string>;
  spacing: Record<string, string>;
  shapes: { borderRadius: string; borderWidth: string };
}

// ---- TNode — the compile target every `.wzd` slide compiles down to ----
// Style values may reference theme tokens:
//   "$color.primary"  "$spacing.lg"  "$rounded.md"
// Special style key `typography: "display"` expands to the theme typography token
// (fontFamily, fontSize, fontWeight, lineHeight, letterSpacing).
export type TStyle = Record<string, string | number>;

export type TNode =
  | { kind: 'box'; style?: TStyle; children?: TNode[] }
  | { kind: 'text'; style?: TStyle; text: string }                      // supports {{binding}}
  | { kind: 'repeat'; source: string; style?: TStyle; children: TNode[] }; // {{item}}, {{i}} inside

export interface RenderTemplateOptions { index: number; total: number; fontBaseUrl: string }

export interface SourceConfig { id: string; name: string; rss: string; enabled: boolean }

export interface Settings {
  defaultTheme: string;     // default warm-industrial-1
}
