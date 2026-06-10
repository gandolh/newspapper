import { describe, it, expect } from 'vitest';
import { resolveStyle, renderTemplate, validateTemplateDoc, validateSlideData } from './interpreter.js';
import type { Theme, TemplateDoc, RenderTemplateOptions } from '../types.js';

// ---------------------------------------------------------------------------
// Minimal theme fixture
// ---------------------------------------------------------------------------
const theme: Theme = {
  name: 'test',
  colors: {
    primary: '#a2391a',
    'on-primary': '#ffffff',
    surface: '#fbf9f8',
    'on-surface': '#1b1c1c',
    'on-surface-variant': '#57423c',
    'surface-container': '#efeded',
  },
  typography: {
    display: {
      fontFamily: 'Inter',
      fontSize: '80px',
      fontWeight: '800',
      lineHeight: '1.0',
      letterSpacing: '-0.04em',
    },
    'body-md': {
      fontFamily: 'Inter',
      fontSize: '16px',
      fontWeight: '400',
      lineHeight: '1.5',
    },
  },
  rounded: { md: '0.75rem', sm: '0.25rem' },
  spacing: { md: '24px', lg: '48px', sm: '12px', xl: '80px', xs: '4px', base: '8px', gutter: '24px', 'container-margin': '32px' },
  shapes: { borderRadius: '0.5rem', borderWidth: '2px' },
};

const opts: RenderTemplateOptions = { index: 1, total: 5, fontBaseUrl: '/fonts' };

// ---------------------------------------------------------------------------
// resolveStyle tests
// ---------------------------------------------------------------------------
describe('resolveStyle', () => {
  it('resolves color token', () => {
    const result = resolveStyle({ color: '$color.primary' }, theme);
    expect(result['color']).toBe('#a2391a');
  });

  it('resolves spacing token', () => {
    const result = resolveStyle({ padding: '$spacing.md' }, theme);
    expect(result['padding']).toBe('24px');
  });

  it('resolves rounded token', () => {
    const result = resolveStyle({ borderRadius: '$rounded.md' }, theme);
    expect(result['border-radius']).toBe('0.75rem');
  });

  it('throws for unknown token', () => {
    expect(() => resolveStyle({ color: '$color.nonexistent' }, theme)).toThrow('Unknown color token');
  });

  it('converts camelCase to kebab-case', () => {
    const result = resolveStyle({ fontWeight: 700 }, theme);
    expect(result['font-weight']).toBeDefined();
  });

  it('adds px to number values for non-unitless props', () => {
    const result = resolveStyle({ fontSize: 32 }, theme);
    expect(result['font-size']).toBe('32px');
  });

  it('does NOT add px to unitless props', () => {
    const result = resolveStyle({ lineHeight: 1.5 }, theme);
    expect(result['line-height']).toBe('1.5');
    const result2 = resolveStyle({ fontWeight: 700 }, theme);
    expect(result2['font-weight']).toBe('700');
    const result3 = resolveStyle({ opacity: 0.5 }, theme);
    expect(result3['opacity']).toBe('0.5');
    const result4 = resolveStyle({ flex: 1 }, theme);
    expect(result4['flex']).toBe('1');
  });

  it('expands typography token', () => {
    const result = resolveStyle({ typography: 'display' }, theme);
    expect(result['font-family']).toBe('Inter');
    expect(result['font-size']).toBe('80px');
    expect(result['font-weight']).toBe('800');
    expect(result['line-height']).toBe('1.0');
    expect(result['letter-spacing']).toBe('-0.04em');
    expect(result['typography']).toBeUndefined();
  });

  it('explicit keys override typography expansion', () => {
    const result = resolveStyle({ typography: 'display', fontSize: 48 }, theme);
    expect(result['font-size']).toBe('48px');
  });

  it('throws for unknown typography token', () => {
    expect(() => resolveStyle({ typography: 'nonexistent' }, theme)).toThrow('Unknown typography token');
  });

  it('throws for unknown token group', () => {
    expect(() => resolveStyle({ color: '$foo.bar' }, theme)).toThrow('Unknown token group');
  });
});

// ---------------------------------------------------------------------------
// renderTemplate tests
// ---------------------------------------------------------------------------
describe('renderTemplate', () => {
  const simpleDoc: TemplateDoc = {
    id: 'test-simple',
    theme: 'test',
    family: 'title',
    name: 'Test Simple',
    fields: [{ key: 'text', label: 'Text', kind: 'textarea', required: true }],
    sample: { text: 'Hello' },
    root: {
      kind: 'box',
      style: { width: 1080, height: 1080, display: 'flex' },
      children: [
        { kind: 'text', text: '{{text}}' },
      ],
    },
  };

  it('returns a complete HTML document', () => {
    const html = renderTemplate(simpleDoc, { text: 'Hello World' }, theme, opts);
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<html');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');
    expect(html).toContain('Hello World');
  });

  it('HTML-escapes substituted values', () => {
    const html = renderTemplate(simpleDoc, { text: '<script>alert(1)</script>' }, theme, opts);
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('substitutes _index and _total built-ins', () => {
    const doc: TemplateDoc = {
      ...simpleDoc,
      root: {
        kind: 'box',
        children: [
          { kind: 'text', text: '{{_index}} of {{_total}}' },
        ],
      },
    };
    const html = renderTemplate(doc, {}, theme, { index: 3, total: 7, fontBaseUrl: '/f' });
    expect(html).toContain('3 of 7');
  });

  it('_date resolves from data._date', () => {
    const doc: TemplateDoc = {
      ...simpleDoc,
      root: { kind: 'text', text: '{{_date}}' },
    };
    const html = renderTemplate(doc, { _date: '2026-01-15' }, theme, opts);
    expect(html).toContain('2026-01-15');
  });

  it('resolves dot-path bindings', () => {
    const doc: TemplateDoc = {
      ...simpleDoc,
      root: { kind: 'text', text: '{{left.label}}' },
    };
    const html = renderTemplate(doc, { left: { label: 'Before' } }, theme, opts);
    expect(html).toContain('Before');
  });

  it('unknown binding → empty string', () => {
    const doc: TemplateDoc = {
      ...simpleDoc,
      root: { kind: 'text', text: '{{nonexistent}}' },
    };
    const html = renderTemplate(doc, {}, theme, opts);
    expect(html).toContain('<div></div>');
  });

  it('repeat renders each item with {{item}} and {{i}}', () => {
    const doc: TemplateDoc = {
      ...simpleDoc,
      root: {
        kind: 'repeat',
        source: 'items',
        children: [
          { kind: 'text', text: '{{i}}:{{item}}' },
        ],
      },
    };
    const html = renderTemplate(doc, { items: ['alpha', 'beta'] }, theme, opts);
    expect(html).toContain('1:alpha');
    expect(html).toContain('2:beta');
  });

  it('repeat with object items supports {{item.label}}', () => {
    const doc: TemplateDoc = {
      ...simpleDoc,
      root: {
        kind: 'repeat',
        source: 'items',
        children: [
          { kind: 'text', text: '{{item.label}}' },
        ],
      },
    };
    const html = renderTemplate(doc, { items: [{ label: 'Foo' }, { label: 'Bar' }] }, theme, opts);
    expect(html).toContain('Foo');
    expect(html).toContain('Bar');
  });

  it('includes @font-face declarations for Inter', () => {
    const html = renderTemplate(simpleDoc, { text: 'x' }, theme, opts);
    expect(html).toContain("@font-face");
    expect(html).toContain('Inter-Regular.ttf');
    expect(html).toContain('Inter-Bold.ttf');
  });

  it('root div is 1080x1080', () => {
    const html = renderTemplate(simpleDoc, { text: 'x' }, theme, opts);
    expect(html).toContain('width:1080px;height:1080px;overflow:hidden');
  });
});

// ---------------------------------------------------------------------------
// validateTemplateDoc tests
// ---------------------------------------------------------------------------
describe('validateTemplateDoc', () => {
  const validDoc = {
    id: 'test-doc',
    theme: 'warm-industrial',
    family: 'title' as const,
    name: 'Test',
    fields: [{ key: 'text', label: 'Text', kind: 'textarea' as const, required: true }],
    sample: { text: 'hello' },
    root: { kind: 'text' as const, text: '{{text}}' },
  };

  it('accepts a valid doc', () => {
    expect(() => validateTemplateDoc(validDoc)).not.toThrow();
  });

  it('returns the doc as TemplateDoc', () => {
    const result = validateTemplateDoc(validDoc);
    expect(result.id).toBe('test-doc');
  });

  it('throws for missing id', () => {
    expect(() => validateTemplateDoc({ ...validDoc, id: '' })).toThrow('id');
  });

  it('throws for invalid family', () => {
    expect(() => validateTemplateDoc({ ...validDoc, family: 'other' })).toThrow('family');
  });

  it('throws for non-object input', () => {
    expect(() => validateTemplateDoc(null)).toThrow();
    expect(() => validateTemplateDoc('string')).toThrow();
  });

  it('throws for invalid field kind', () => {
    const bad = { ...validDoc, fields: [{ key: 'x', label: 'X', kind: 'unknown', required: true }] };
    expect(() => validateTemplateDoc(bad)).toThrow('kind');
  });
});

// ---------------------------------------------------------------------------
// validateSlideData tests
// ---------------------------------------------------------------------------
describe('validateSlideData', () => {
  const doc: TemplateDoc = {
    id: 'test-doc',
    theme: 'test',
    family: 'title',
    name: 'Test',
    fields: [
      { key: 'text', label: 'Text', kind: 'textarea', required: true },
      { key: 'kicker', label: 'Kicker', kind: 'text', required: false },
    ],
    sample: { text: 'hello' },
    root: { kind: 'text', text: '{{text}}' },
  };

  it('accepts valid data', () => {
    expect(() => validateSlideData(doc, { text: 'hello' })).not.toThrow();
  });

  it('throws for missing required field', () => {
    expect(() => validateSlideData(doc, { kicker: 'ok' })).toThrow('text');
  });

  it('does not throw when optional field absent', () => {
    expect(() => validateSlideData(doc, { text: 'hello' })).not.toThrow();
  });

  it('throws for non-object data', () => {
    expect(() => validateSlideData(doc, null)).toThrow();
  });
});
