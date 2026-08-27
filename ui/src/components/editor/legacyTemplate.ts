/**
 * Local stand-ins for the retired slide-template document type and its
 * per-field spec.
 *
 * The template system (the JSON template docs, the registry, `/api/templates`,
 * `/builder`) was removed — see corpus/wiki/decisions.md "The template system
 * is removed". This whole `editor/` tree is the pre-pivot wizard editor; it
 * already can't reach a working `/api/templates` or `/api/slide-ai`, and brief
 * 59 rebuilds it on the new component library. These local types exist only so
 * this dead code keeps compiling in the meantime — nothing here is a contract
 * anyone should build against.
 */
export interface LegacySlideField {
  key: string;
  label: string;
  kind: 'text' | 'textarea' | 'list' | 'pair';
  required: boolean;
}

export interface LegacySlideTemplate {
  id: string;
  theme: string;
  family: 'title' | 'body' | 'quote';
  name: string;
  fields: LegacySlideField[];
  sample: Record<string, unknown>;
  root: unknown;
}
