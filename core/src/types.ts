// Built-in template bindings available in all TNode trees:
//   {{_index}}  — 1-based slide index (number)
//   {{_total}}  — total slide count (number)
//   {{_date}}   — post date string YYYY-MM-DD

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
  theme: string; // e.g. "warm-industrial-1"
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
  /** The writer's note on why this was kept (schema v6). `''` when none. */
  note: string;
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

/**
 * The signed-in person, as `GET /api/me` reports them: Ward's subject and
 * username, nothing else. Identity is Ward's (brief 55's `users` table was
 * dropped in schema v5), so there is no id, no created-at and no password hash
 * here any more.
 */
export interface User {
  subject: string;
  username: string;
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

export interface Theme {
  name: string;
  colors: Record<string, string>;
  typography: Record<
    string,
    {
      fontFamily: string;
      fontSize: string;
      fontWeight: string;
      lineHeight: string;
      letterSpacing?: string;
    }
  >;
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
  | { kind: 'text'; style?: TStyle; text: string } // supports {{binding}}
  | { kind: 'repeat'; source: string; style?: TStyle; children: TNode[] }; // {{item}}, {{i}} inside

export interface RenderTemplateOptions {
  index: number;
  total: number;
  fontBaseUrl: string;
}

export interface SourceConfig {
  id: string;
  name: string;
  rss: string;
  enabled: boolean;
  /** The Reader's grouping (schema v6). Blank or absent means uncategorized,
   * stored as NULL. */
  category?: string | null;
}

/**
 * A source as `listSources` / `getSource` return it: its config plus the
 * outcome of the Reader's last refresh of it. The validators (ETag,
 * Last-Modified) stay internal.
 */
export interface Source extends SourceConfig {
  category: string | null;
  /** When a refresh last reached the feed (a 200 or a 304). */
  lastFetchedAt: string | null;
  /** Why the last refresh failed; `null` once one succeeds. */
  lastError: string | null;
}

export interface Settings {
  defaultTheme: string; // default warm-industrial-1
}

/** A post as a list shows it: everything but the markup, which only the editor
 * needs. `GET /api/posts` returns these (brief 95). */
export type PostSummary = Omit<Post, 'markup'>;

/** A saved article as the library lists it: the body is cut to an excerpt,
 * which is all the list shows. */
export type ArticleSummary = Omit<Article, 'body'> & { excerpt: string };

// ---- The Reader (schema v6, brief 105) ----
// An **Item** is a stored feed entry. It becomes an **Article** only when saved
// to the library, keyed on the same `(sourceId, guid)` with `guid` = its URL.

/** An item as the Reader's list shows it. Never carries the HTML (brief 95's
 * lesson: a list payload holds only what the list shows). */
export interface FeedItemSummary {
  id: number;
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  author: string | null;
  /** As the feed dated it; `null` when it did not. */
  publishedAt: string | null;
  /** The timeline position: the earlier of `publishedAt` and the fetch time. */
  sortAt: string;
  read: boolean;
  /** The library has an article with the same `(sourceId, guid)`. */
  saved: boolean;
  /** The start of `contentText`, at most 200 characters. */
  excerpt: string;
}

/** One item in full, for the reading pane. */
export interface FeedItem extends Omit<FeedItemSummary, 'excerpt'> {
  /** The dedupe key: the item's URL. */
  guid: string;
  /** The feed's HTML, unsanitized, capped at 256 KB. Sanitize before rendering. */
  contentHtml: string;
  /** `stripHtml(contentHtml)`: what the filter searches. */
  contentText: string;
  fetchedAt: string;
  readAt: string | null;
  /** The saved article's id when `saved`, else `null`. */
  articleId: number | null;
}

/** One page of the Reader's list. `nextCursor` is `null` on the last page. */
export interface FeedItemPage {
  items: FeedItemSummary[];
  nextCursor: string | null;
}

/** Unread counts for the Reader's rail. */
export interface ReaderCounts {
  /** Unread items across every source. */
  unread: number;
  /** Every stored item, read or not. */
  all: number;
  /** Unread items per source id; every source is present, zero included. */
  unreadBySource: Record<string, number>;
}
