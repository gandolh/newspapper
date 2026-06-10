// MIRROR of core/src/types.ts — keep in sync
// The @newspapper/core package exports from src/types.ts which is not a compiled
// dist artefact; Vite/Astro can resolve it via the "exports" field for the dev
// server but the types fight the Astro build. We therefore copy the types here
// rather than re-exporting, to keep the UI self-contained.

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
  sourceId: string;
  sourceName: string;
  title: string;
  url: string | null;
  publishedAt: string;
  body: string;
  createdAt: string;
}

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

export interface FieldSpec {
  key: string;
  label: string;
  kind: 'text' | 'textarea' | 'list' | 'pair';
  required: boolean;
}

export interface TemplateDoc {
  id: string;
  theme: string;
  family: 'title' | 'body' | 'quote';
  name: string;
  fields: FieldSpec[];
  sample: Record<string, unknown>;
  root: TNode;
}

export interface SourceConfig {
  id: string;
  name: string;
  rss: string;
  enabled: boolean;
}

export interface Settings {
  ollamaHost: string;
  ollamaApiKey: string;
  ollamaModel: string;
  defaultTheme: string;
}
