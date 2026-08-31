/**
 * The Newspapper Wizard component catalogue, as data.
 *
 * The parser knows nothing about this file; the linter and the compiler both
 * read it. It is the single definition of what a component is called, what it
 * accepts, and where it may appear.
 */

import { WZD_DOCUMENT_PARENT } from './ast.js';

export type WzdPropKind = 'enum' | 'text';

export interface WzdPropSpec {
  name: string;
  kind: WzdPropKind;
  /** Allowed values, for `kind: 'enum'`. Absent for free text. */
  values?: readonly string[];
  /** The value assumed when the prop is absent. */
  default?: string;
  required?: boolean;
  description: string;
}

export type WzdChildModel =
  /** No children at all — conventionally written self-closing. */
  | 'none'
  /** Text (and `{binding}` tokens) only. */
  | 'text'
  /** Element children only. */
  | 'elements';

export type WzdComponentGroup =
  | 'document'
  | 'metadata'
  | 'structure'
  | 'content'
  | 'accent'
  | 'generated';

export interface WzdComponentSpec {
  name: string;
  group: WzdComponentGroup;
  /** Lowercase tags declare; capitalized tags draw. */
  role: 'structure' | 'component';
  description: string;
  props: Record<string, WzdPropSpec>;
  children: WzdChildModel;
  /** When set, only these tag names may be direct element children. */
  allowedChildren?: readonly string[];
  /** When set, the element must be a *direct* child of one of these. */
  requiredParent?: readonly string[];
  /** When set, the element must appear somewhere below this ancestor. */
  requiredAncestor?: string;
  /** Conventionally printed self-closing (`children: 'none'`). */
  void: boolean;
}

/**
 * The named scales. A prop value outside its scale is a lint error, never a
 * silent fallback, and there is deliberately no raw-CSS escape hatch.
 */
export const WZD_PROP_SCALES = {
  size: ['xs', 'sm', 'md', 'lg', 'xl'],
  align: ['left', 'center', 'right'],
  emphasis: ['muted', 'normal', 'strong'],
} as const satisfies Record<string, readonly string[]>;

export type WzdScaleName = keyof typeof WZD_PROP_SCALES;

function scale(name: WzdScaleName, fallback: string, description: string): WzdPropSpec {
  return {
    name,
    kind: 'enum',
    values: WZD_PROP_SCALES[name],
    default: fallback,
    description,
  };
}

function text(name: string, description: string, required = false): WzdPropSpec {
  return { name, kind: 'text', required, description };
}

const SIZE = (): WzdPropSpec => scale('size', 'md', 'Type or spacing step from the theme scale.');
const ALIGN = (): WzdPropSpec => scale('align', 'left', 'Horizontal alignment within the flow.');
const EMPHASIS = (): WzdPropSpec =>
  scale('emphasis', 'normal', 'Relative weight and colour from the theme.');

/** The `<head>` fields, in canonical order. */
export const WZD_HEAD_FIELDS = [
  'title',
  'description',
  'keywords',
  'date',
  'caption',
  'hashtags',
] as const;

export type WzdHeadField = (typeof WZD_HEAD_FIELDS)[number];

/** Head fields that must be present for a document to be valid. */
export const WZD_REQUIRED_HEAD_FIELDS: readonly WzdHeadField[] = ['title'];

/** Components that render — everything capitalized. */
const RENDERABLE = [
  'Slide',
  'Stack',
  'Row',
  'Heading',
  'Text',
  'List',
  'Item',
  'Quote',
  'Stat',
  'Image',
  'Kicker',
  'Divider',
  'Spacer',
  'Source',
  'PageCounter',
] as const;

/** Anything that may sit inside a `Slide`, `Stack` or `Row`. */
const SLIDE_CONTENT: readonly string[] = RENDERABLE.filter((n) => n !== 'Slide' && n !== 'Item');

function metadata(name: WzdHeadField, description: string): WzdComponentSpec {
  return {
    name,
    group: 'metadata',
    role: 'structure',
    description,
    props: {},
    children: 'text',
    requiredParent: ['head'],
    void: false,
  };
}

const SPECS: WzdComponentSpec[] = [
  {
    name: 'head',
    group: 'document',
    role: 'structure',
    description: 'Everything about the post that is not a slide. Declares; never draws.',
    props: {},
    children: 'elements',
    allowedChildren: WZD_HEAD_FIELDS,
    requiredParent: [WZD_DOCUMENT_PARENT],
    void: false,
  },
  {
    name: 'body',
    group: 'document',
    role: 'structure',
    description: 'The slides, in order.',
    props: {},
    children: 'elements',
    allowedChildren: ['Slide'],
    requiredParent: [WZD_DOCUMENT_PARENT],
    void: false,
  },
  metadata('title', 'The post title. Required — it is how a post is identified.'),
  metadata('description', 'One-line summary of the post.'),
  metadata('keywords', 'Comma-separated keywords, indexed for search.'),
  metadata('date', 'The post date. Resolves the {date} binding on a slide.'),
  metadata('caption', 'The caption to post alongside the images.'),
  metadata('hashtags', 'Hashtags to append to the caption.'),

  {
    name: 'Slide',
    group: 'structure',
    role: 'component',
    description: 'One rendered image.',
    props: { align: ALIGN() },
    children: 'elements',
    allowedChildren: SLIDE_CONTENT,
    requiredParent: ['body'],
    void: false,
  },
  {
    name: 'Stack',
    group: 'structure',
    role: 'component',
    description: 'Flows its children vertically.',
    props: { size: SIZE(), align: ALIGN() },
    children: 'elements',
    allowedChildren: SLIDE_CONTENT,
    requiredAncestor: 'Slide',
    void: false,
  },
  {
    name: 'Row',
    group: 'structure',
    role: 'component',
    description: 'Splits horizontally — how a two-column comparison happens.',
    props: { size: SIZE(), align: ALIGN() },
    children: 'elements',
    allowedChildren: SLIDE_CONTENT,
    requiredAncestor: 'Slide',
    void: false,
  },

  {
    name: 'Heading',
    group: 'content',
    role: 'component',
    description: 'The slide headline.',
    props: { size: SIZE(), align: ALIGN(), emphasis: EMPHASIS() },
    children: 'text',
    requiredAncestor: 'Slide',
    void: false,
  },
  {
    name: 'Text',
    group: 'content',
    role: 'component',
    description: 'A paragraph of body copy.',
    props: { size: SIZE(), align: ALIGN(), emphasis: EMPHASIS() },
    children: 'text',
    requiredAncestor: 'Slide',
    void: false,
  },
  {
    name: 'List',
    group: 'content',
    role: 'component',
    description: 'A bulleted list. Holds Item and nothing else.',
    props: { size: SIZE(), align: ALIGN() },
    children: 'elements',
    allowedChildren: ['Item'],
    requiredAncestor: 'Slide',
    void: false,
  },
  {
    name: 'Item',
    group: 'content',
    role: 'component',
    description: 'One list entry.',
    props: { emphasis: EMPHASIS() },
    children: 'text',
    requiredParent: ['List'],
    void: false,
  },
  {
    name: 'Quote',
    group: 'content',
    role: 'component',
    description: 'A pull quote carrying its attribution.',
    props: {
      size: SIZE(),
      align: ALIGN(),
      emphasis: EMPHASIS(),
      by: text('by', 'Who said it. Rendered as the attribution line.'),
    },
    children: 'text',
    requiredAncestor: 'Slide',
    void: false,
  },
  {
    name: 'Stat',
    group: 'content',
    role: 'component',
    description: 'A big number with a label.',
    props: {
      size: SIZE(),
      align: ALIGN(),
      emphasis: EMPHASIS(),
      label: text('label', 'The caption under the number.'),
    },
    children: 'text',
    requiredAncestor: 'Slide',
    void: false,
  },
  {
    name: 'Image',
    group: 'content',
    role: 'component',
    description: 'An uploaded image, referenced by name.',
    props: {
      size: SIZE(),
      align: ALIGN(),
      src: text('src', 'The upload this references.', true),
      alt: text('alt', 'Alternative text.'),
    },
    children: 'none',
    requiredAncestor: 'Slide',
    void: true,
  },

  {
    name: 'Kicker',
    group: 'accent',
    role: 'component',
    description: 'The eyebrow label above a heading.',
    props: { size: SIZE(), align: ALIGN(), emphasis: EMPHASIS() },
    children: 'text',
    requiredAncestor: 'Slide',
    void: false,
  },
  {
    name: 'Divider',
    group: 'accent',
    role: 'component',
    description: 'A horizontal rule.',
    props: { size: SIZE(), emphasis: EMPHASIS() },
    children: 'none',
    requiredAncestor: 'Slide',
    void: true,
  },
  {
    name: 'Spacer',
    group: 'accent',
    role: 'component',
    description: 'Breathing room between blocks.',
    props: { size: SIZE() },
    children: 'none',
    requiredAncestor: 'Slide',
    void: true,
  },
  {
    name: 'Source',
    group: 'accent',
    role: 'component',
    description: 'The attribution line for the slide.',
    props: { size: SIZE(), align: ALIGN(), emphasis: EMPHASIS() },
    children: 'text',
    requiredAncestor: 'Slide',
    void: false,
  },

  {
    name: 'PageCounter',
    group: 'generated',
    role: 'component',
    description: 'Renders "2/5". The renderer fills in both numbers.',
    props: { size: SIZE(), align: ALIGN(), emphasis: EMPHASIS() },
    children: 'none',
    requiredAncestor: 'Slide',
    void: true,
  },
];

/** Every known tag, keyed by name. Casing is significant. */
export const WZD_COMPONENTS: Readonly<Record<string, WzdComponentSpec>> = Object.freeze(
  Object.fromEntries(SPECS.map((spec) => [spec.name, spec])),
);

/** Tag names in catalogue order. */
export const WZD_COMPONENT_NAMES: readonly string[] = SPECS.map((spec) => spec.name);

/** The capitalized, drawing components — what a component palette lists. */
export const WZD_RENDERABLE_NAMES: readonly string[] = SPECS.filter(
  (spec) => spec.role === 'component',
).map((spec) => spec.name);

export function getComponentSpec(name: string): WzdComponentSpec | undefined {
  return Object.prototype.hasOwnProperty.call(WZD_COMPONENTS, name)
    ? WZD_COMPONENTS[name]
    : undefined;
}

export function isKnownComponent(name: string): boolean {
  return getComponentSpec(name) !== undefined;
}

export function isHeadField(name: string): name is WzdHeadField {
  return (WZD_HEAD_FIELDS as readonly string[]).includes(name);
}

/** The props a component accepts, in catalogue order. Drives the inspector. */
export function propsFor(name: string): WzdPropSpec[] {
  const spec = getComponentSpec(name);
  return spec ? Object.values(spec.props) : [];
}

/** The values a prop accepts on a component; null when the prop is free text or unknown. */
export function allowedValues(component: string, prop: string): readonly string[] | null {
  const spec = getComponentSpec(component);
  const propSpec = spec?.props[prop];
  if (!propSpec || propSpec.kind !== 'enum') return null;
  return propSpec.values ?? null;
}
