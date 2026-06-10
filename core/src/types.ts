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
  theme: string;           // e.g. "warm-industrial"
  slides: SlideBlock[];    // 2–8
  caption?: string;
  hashtags?: string[];
}

export interface Article {
  id: number; sourceId: string; sourceName: string; title: string;
  url: string | null; publishedAt: string; body: string; createdAt: string;
}

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

// ---- Template documents (the new source of truth for slide layouts) ----
// Style values may reference theme tokens:
//   "$color.primary"  "$spacing.lg"  "$rounded.md"
// Special style key `typography: "display"` expands to the theme typography token
// (fontFamily, fontSize, fontWeight, lineHeight, letterSpacing).
export type TStyle = Record<string, string | number>;

export type TNode =
  | { kind: 'box'; style?: TStyle; children?: TNode[] }
  | { kind: 'text'; style?: TStyle; text: string }                      // supports {{binding}}
  | { kind: 'repeat'; source: string; style?: TStyle; children: TNode[] }; // {{item}}, {{i}} inside

export interface FieldSpec {
  key: string; label: string;
  kind: 'text' | 'textarea' | 'list' | 'pair';
  required: boolean;
}

export interface TemplateDoc {
  id: string;                          // === slide variant, e.g. "title-main"
  theme: string;                       // "warm-industrial"
  family: 'title' | 'body' | 'quote';
  name: string;                        // display name
  fields: FieldSpec[];                 // drives the editor form
  sample: Record<string, unknown>;     // sample data for previews
  root: TNode;
}

export interface RenderTemplateOptions { index: number; total: number; fontBaseUrl: string }

export interface SourceConfig { id: string; name: string; rss: string; enabled: boolean }

export interface Settings {
  ollamaHost: string;       // default http://localhost:11434, cloud: https://ollama.com
  ollamaApiKey: string;     // empty = no auth header
  ollamaModel: string;      // default llama3.2:1b
  defaultTheme: string;     // default warm-industrial
}
