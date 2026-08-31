import { describe, it, expect } from 'vitest';
import { listThemes, loadTheme } from '../../themes/index.js';
import type { WzdSize } from './style.js';
import {
  WZD_STRUCTURAL_VALUES,
  WZD_TYPOGRAPHY_SCALES,
  missingThemeTokens,
  requiredThemeTokens,
  themeValues,
  unthemedStyleValues,
} from './style.js';
import {
  WZD_COMPONENTS,
  WZD_PROP_SCALES,
  WZD_RENDERABLE_NAMES,
  allowedValues,
  isKnownComponent,
} from '../catalogue.js';

const theme = loadTheme('warm-industrial-1');

describe('the structural allowlist', () => {
  it('holds no length, colour or font — only layout', () => {
    for (const value of WZD_STRUCTURAL_VALUES) {
      expect(value, `${value} looks like a length`).not.toMatch(/\d(px|rem|em|pt|ch|vw|vh)\b/);
      expect(value, `${value} looks like a colour`).not.toMatch(/^(#|rgb|hsl)/i);
      expect(value, `${value} names a font`).not.toMatch(/Inter|serif|sans/i);
    }
  });
});

describe('requiredThemeTokens', () => {
  it('is satisfied by the shipped theme', () => {
    expect(missingThemeTokens(theme)).toEqual([]);
  });

  it('names every typography token the scales reach for', () => {
    const required = new Set(requiredThemeTokens().typography);
    for (const scale of Object.values(WZD_TYPOGRAPHY_SCALES)) {
      for (const token of Object.values(scale)) expect(required.has(token)).toBe(true);
    }
  });

  it('reports what a theme is missing rather than failing late', () => {
    const stripped = { ...theme, typography: {} };
    expect(missingThemeTokens(stripped)).toContain('typography.display');
  });
});

/**
 * These walk the catalogue rather than a hand-written list, so a component
 * added to `catalogue.ts` is covered without anyone remembering to come here.
 */
describe('typography scales', () => {
  const scaled = Object.keys(WZD_TYPOGRAPHY_SCALES);

  /** `Item` takes its size from the enclosing `List`, so it declares no `size` prop of its own. */
  const sizesFor = (name: string): readonly WzdSize[] =>
    (allowedValues(name, 'size') ?? WZD_PROP_SCALES.size) as readonly WzdSize[];

  it('name only components the catalogue knows', () => {
    for (const name of scaled) {
      expect(
        isKnownComponent(name),
        `${name} has a typography scale but is not in the catalogue`,
      ).toBe(true);
      expect(WZD_RENDERABLE_NAMES).toContain(name);
    }
  });

  it('cover every component that draws words', () => {
    for (const [name, spec] of Object.entries(WZD_COMPONENTS)) {
      if (spec.role !== 'component' || spec.children !== 'text') continue;
      expect(scaled, `${name} draws text but has no typography scale`).toContain(name);
    }
  });

  it('carry one entry per step of the size scale', () => {
    for (const name of scaled) {
      expect(Object.keys(WZD_TYPOGRAPHY_SCALES[name])).toEqual([...WZD_PROP_SCALES.size]);
      const declared = allowedValues(name, 'size');
      if (declared) expect(declared).toEqual(WZD_PROP_SCALES.size);
    }
  });

  it('never resolve two adjacent sizes to the same token', () => {
    for (const name of scaled) {
      const sizes = sizesFor(name);
      for (let i = 1; i < sizes.length; i += 1) {
        const prev = sizes[i - 1];
        const next = sizes[i];
        expect(
          WZD_TYPOGRAPHY_SCALES[name][next],
          `${name} size="${prev}" and size="${next}" both resolve to ${WZD_TYPOGRAPHY_SCALES[name][prev]}`,
        ).not.toBe(WZD_TYPOGRAPHY_SCALES[name][prev]);
      }
    }
  });

  it('give every step of a component its own token', () => {
    for (const name of scaled) {
      const tokens = sizesFor(name).map((size) => WZD_TYPOGRAPHY_SCALES[name][size]);
      expect(
        new Set(tokens).size,
        `${name} repeats a token across its scale: ${tokens.join(', ')}`,
      ).toBe(tokens.length);
    }
  });

  it('render a visibly different step at every size, in every theme', () => {
    for (const name of listThemes()) {
      const t = loadTheme(name);
      for (const component of scaled) {
        const sizes = sizesFor(component);
        for (let i = 1; i < sizes.length; i += 1) {
          const a = t.typography[WZD_TYPOGRAPHY_SCALES[component][sizes[i - 1]]];
          const b = t.typography[WZD_TYPOGRAPHY_SCALES[component][sizes[i]]];
          expect(
            b?.fontSize,
            `${name}: ${component} size="${sizes[i - 1]}" and size="${sizes[i]}" both render at ${a?.fontSize}`,
          ).not.toBe(a?.fontSize);
        }
      }
    }
  });
});

describe('every shipped theme', () => {
  it('is discovered from assets/design-systems', () => {
    const names = listThemes();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(() => loadTheme(name)).not.toThrow();
  });

  it('defines every token the component library needs', () => {
    for (const name of listThemes()) {
      expect(missingThemeTokens(loadTheme(name)), `${name} is missing tokens`).toEqual([]);
    }
  });
});

describe('unthemedStyleValues', () => {
  it('catches a raw colour', () => {
    const offenders = unthemedStyleValues(
      [{ kind: 'text', text: 'x', style: { color: '#ff0000' } }],
      theme,
    );
    expect(offenders).toEqual(['color: #ff0000']);
  });

  it('catches a token the theme does not define', () => {
    const offenders = unthemedStyleValues(
      [{ kind: 'box', style: { padding: '$spacing.enormous' }, children: [] }],
      theme,
    );
    expect(offenders).toEqual(['padding: $spacing.enormous']);
  });

  it('catches a length that did not come from the theme', () => {
    const offenders = unthemedStyleValues(
      [{ kind: 'box', style: { padding: '37px' }, children: [] }],
      theme,
    );
    expect(offenders).toEqual(['padding: 37px']);
  });

  it('catches a bare number on a key the interpreter would give units', () => {
    const offenders = unthemedStyleValues(
      [{ kind: 'box', style: { padding: 12 }, children: [] }],
      theme,
    );
    expect(offenders).toEqual(['padding: 12']);
  });

  it('accepts a value the theme itself defines', () => {
    expect(themeValues(theme).has(theme.shapes.borderWidth)).toBe(true);
    expect(
      unthemedStyleValues(
        [{ kind: 'box', style: { height: theme.shapes.borderWidth }, children: [] }],
        theme,
      ),
    ).toEqual([]);
  });
});
