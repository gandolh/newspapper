/**
 * The token vocabulary the components compile into.
 *
 * The rule this file exists to enforce: **every length, colour and font a
 * component emits is a theme token.** What is left over is layout — flex
 * keywords, percentages, `auto` — which carries no brand and is listed in
 * `WZD_STRUCTURAL_VALUES`. `unthemedStyleValues()` checks a compiled tree
 * against exactly that statement, and a test asserts the allowlist holds no
 * lengths, colours or font names.
 *
 * Browser-safe: types and data only, no Node APIs.
 */

import type { TNode, TStyle, Theme } from '../../types.js';

export type WzdSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type WzdAlign = 'left' | 'center' | 'right';
export type WzdEmphasis = 'muted' | 'normal' | 'strong';

export const colorToken = (name: string): string => `$color.${name}`;
export const spacingToken = (name: string): string => `$spacing.${name}`;
export const roundedToken = (name: string): string => `$rounded.${name}`;

type BySize<T> = Readonly<Record<WzdSize, T>>;
type ByEmphasis = Readonly<Record<WzdEmphasis, string>>;

/**
 * `size` → typography token, per component. Written out rather than derived
 * from a ramp so the steps are visible and a theme can be retuned against
 * them. The warm-industrial theme ships six steps, so the largest components
 * repeat `display` at the top of their scale.
 */
export const WZD_TYPOGRAPHY_SCALES: Readonly<Record<string, BySize<string>>> = Object.freeze({
  Heading: { xs: 'body-lg', sm: 'headline-md', md: 'headline-lg', lg: 'display', xl: 'display' },
  Text: { xs: 'body-md', sm: 'body-lg', md: 'headline-md', lg: 'headline-lg', xl: 'display' },
  Item: { xs: 'body-md', sm: 'body-lg', md: 'headline-md', lg: 'headline-lg', xl: 'display' },
  Quote: { xs: 'body-lg', sm: 'headline-md', md: 'headline-lg', lg: 'display', xl: 'display' },
  Stat: { xs: 'headline-md', sm: 'headline-lg', md: 'display', lg: 'display', xl: 'display' },
  Kicker: { xs: 'label-bold', sm: 'label-bold', md: 'label-bold', lg: 'body-md', xl: 'body-lg' },
  Source: { xs: 'label-bold', sm: 'label-bold', md: 'label-bold', lg: 'body-md', xl: 'body-lg' },
  PageCounter: { xs: 'label-bold', sm: 'label-bold', md: 'label-bold', lg: 'body-md', xl: 'body-lg' },
});

/** The label under a `Stat`, the attribution under a `Quote`. */
export const WZD_CAPTION_TYPOGRAPHY = 'label-bold';

/** `emphasis` → colour token, for everything that draws words. */
export const WZD_TEXT_COLORS: ByEmphasis = Object.freeze({
  muted: 'on-surface-variant',
  normal: 'on-surface',
  strong: 'primary',
});

/** `emphasis` → colour token for a rule, which sits on the outline scale. */
export const WZD_RULE_COLORS: ByEmphasis = Object.freeze({
  muted: 'outline-variant',
  normal: 'outline',
  strong: 'primary',
});

/** The colour of secondary copy that has no `emphasis` of its own. */
export const WZD_CAPTION_COLOR = 'on-surface-variant';

/** `size` → spacing token. Gaps, and the height of a `Spacer`. */
export const WZD_SPACING_BY_SIZE: BySize<string> = Object.freeze({
  xs: 'xs', sm: 'sm', md: 'md', lg: 'lg', xl: 'xl',
});

/** A list's rows sit tighter than free-standing blocks at the same size. */
export const WZD_LIST_GAP_BY_SIZE: BySize<string> = Object.freeze({
  xs: 'xs', sm: 'xs', md: 'sm', lg: 'md', xl: 'lg',
});

/** `size` → width, for the two components that occupy a fraction of the column. */
export const WZD_FRACTION_BY_SIZE: BySize<string> = Object.freeze({
  xs: '25%', sm: '40%', md: '60%', lg: '80%', xl: '100%',
});

/** The slide padding, and the gap between a slide's blocks. */
export const WZD_SLIDE_PADDING = 'xl';
export const WZD_SLIDE_GAP = 'md';

export const WZD_TEXT_ALIGN: Readonly<Record<WzdAlign, string>> = Object.freeze({
  left: 'left', center: 'center', right: 'right',
});

/** The aspect an `<Image>` box is held to. */
export const WZD_IMAGE_ASPECT = '3 / 2';

/**
 * Layout values a component may emit that are not theme tokens. Flex
 * keywords, percentages and `auto` — nothing with a length, a colour or a
 * font in it. A test asserts that property of this list.
 */
export const WZD_STRUCTURAL_VALUES: ReadonlySet<string> = new Set([
  'flex',
  'column',
  'row',
  'left',
  'center',
  'right',
  'hidden',
  'uppercase',
  'auto',
  'cover',
  '0',
  '25%',
  '40%',
  '60%',
  '80%',
  '100%',
  WZD_IMAGE_ASPECT,
]);

/** Style keys whose numeric values the interpreter leaves unitless. */
export const WZD_UNITLESS_KEYS: ReadonlySet<string> = new Set(['flex', 'flexGrow', 'flexShrink']);

/**
 * The one style key that carries content rather than design — the upload an
 * `<Image>` points at. Everything else is tokens and layout.
 */
export const WZD_CONTENT_STYLE_KEYS: ReadonlySet<string> = new Set(['backgroundImage']);

/** Token groups the interpreter knows how to resolve. */
const TOKEN_GROUPS: Readonly<Record<string, (theme: Theme) => Record<string, unknown>>> = {
  color: (t) => t.colors,
  spacing: (t) => t.spacing,
  rounded: (t) => t.rounded,
};

/** Every literal value the theme defines, flattened — what a component may copy. */
export function themeValues(theme: Theme): ReadonlySet<string> {
  const values = new Set<string>();
  for (const v of Object.values(theme.colors)) values.add(v);
  for (const v of Object.values(theme.spacing)) values.add(v);
  for (const v of Object.values(theme.rounded)) values.add(v);
  for (const v of Object.values(theme.shapes)) values.add(v);
  for (const token of Object.values(theme.typography)) {
    for (const v of Object.values(token)) if (v) values.add(v);
  }
  return values;
}

/** The tokens the component library needs a theme to define. */
export function requiredThemeTokens(): {
  typography: string[];
  colors: string[];
  spacing: string[];
  rounded: string[];
} {
  const typography = new Set<string>([WZD_CAPTION_TYPOGRAPHY]);
  for (const scale of Object.values(WZD_TYPOGRAPHY_SCALES)) {
    for (const token of Object.values(scale)) typography.add(token);
  }
  const colors = new Set<string>([
    'surface',
    'surface-container',
    WZD_CAPTION_COLOR,
    ...Object.values(WZD_TEXT_COLORS),
    ...Object.values(WZD_RULE_COLORS),
  ]);
  const spacing = new Set<string>([
    WZD_SLIDE_PADDING,
    WZD_SLIDE_GAP,
    ...Object.values(WZD_SPACING_BY_SIZE),
    ...Object.values(WZD_LIST_GAP_BY_SIZE),
  ]);
  return {
    typography: [...typography].sort(),
    colors: [...colors].sort(),
    spacing: [...spacing].sort(),
    rounded: ['md'],
  };
}

/** Tokens the component library needs that `theme` does not define. */
export function missingThemeTokens(theme: Theme): string[] {
  const required = requiredThemeTokens();
  const missing: string[] = [];
  for (const name of required.typography) if (!theme.typography[name]) missing.push(`typography.${name}`);
  for (const name of required.colors) if (!theme.colors[name]) missing.push(`color.${name}`);
  for (const name of required.spacing) if (!theme.spacing[name]) missing.push(`spacing.${name}`);
  for (const name of required.rounded) if (!theme.rounded[name]) missing.push(`rounded.${name}`);
  return missing;
}

/** Every `[key, value]` in every style of a tree, depth-first. */
export function collectStyleEntries(nodes: readonly TNode[]): Array<[string, string | number]> {
  const entries: Array<[string, string | number]> = [];
  const visit = (node: TNode): void => {
    const style: TStyle | undefined = node.style;
    if (style) for (const [key, value] of Object.entries(style)) entries.push([key, value]);
    if (node.kind !== 'text') for (const child of node.children ?? []) visit(child);
  };
  for (const node of nodes) visit(node);
  return entries;
}

/**
 * Style values in `nodes` that are neither a theme token, a value the theme
 * defines, nor a listed structural constant. An empty result is the invariant
 * holding: the tree carries no design value the theme did not supply.
 */
export function unthemedStyleValues(nodes: readonly TNode[], theme: Theme): string[] {
  const literals = themeValues(theme);
  const offenders: string[] = [];
  for (const [key, value] of collectStyleEntries(nodes)) {
    if (WZD_CONTENT_STYLE_KEYS.has(key)) continue;
    if (typeof value === 'number') {
      if (!WZD_UNITLESS_KEYS.has(key)) offenders.push(`${key}: ${value}`);
      continue;
    }
    if (key === 'typography') {
      if (!theme.typography[value]) offenders.push(`${key}: ${value}`);
      continue;
    }
    if (value.startsWith('$')) {
      const dot = value.indexOf('.');
      const group = value.slice(1, dot === -1 ? undefined : dot);
      const name = dot === -1 ? '' : value.slice(dot + 1);
      const table = TOKEN_GROUPS[group];
      if (!table || table(theme)[name] === undefined) offenders.push(`${key}: ${value}`);
      continue;
    }
    if (WZD_STRUCTURAL_VALUES.has(value)) continue;
    if (literals.has(value)) continue;
    offenders.push(`${key}: ${value}`);
  }
  return offenders;
}
