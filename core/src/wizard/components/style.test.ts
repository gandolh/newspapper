import { describe, it, expect } from 'vitest';
import { loadTheme } from '../../themes/index.js';
import {
  WZD_STRUCTURAL_VALUES,
  WZD_TYPOGRAPHY_SCALES,
  missingThemeTokens,
  requiredThemeTokens,
  themeValues,
  unthemedStyleValues,
} from './style.js';
import { WZD_RENDERABLE_NAMES } from '../catalogue.js';

const theme = loadTheme('warm-industrial');

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

describe('typography scales', () => {
  it('cover every component that draws words', () => {
    const withWords = ['Heading', 'Text', 'Item', 'Quote', 'Stat', 'Kicker', 'Source', 'PageCounter'];
    for (const name of withWords) {
      expect(WZD_RENDERABLE_NAMES).toContain(name);
      expect(Object.keys(WZD_TYPOGRAPHY_SCALES[name])).toEqual(['xs', 'sm', 'md', 'lg', 'xl']);
    }
  });
});

describe('unthemedStyleValues', () => {
  it('catches a raw colour', () => {
    const offenders = unthemedStyleValues([{ kind: 'text', text: 'x', style: { color: '#ff0000' } }], theme);
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
