import { describe, expect, it } from 'vitest';
import { WZD_DOCUMENT_PARENT } from './ast.js';
import {
  WZD_COMPONENTS,
  WZD_COMPONENT_NAMES,
  WZD_HEAD_FIELDS,
  WZD_PROP_SCALES,
  WZD_RENDERABLE_NAMES,
  allowedValues,
  getComponentSpec,
  isHeadField,
  isKnownComponent,
  propsFor,
} from './catalogue.js';
import { WZD_RULES } from './diagnostics.js';

const specs = Object.values(WZD_COMPONENTS);

describe('the scales', () => {
  it('are exactly size, align and emphasis', () => {
    expect(Object.keys(WZD_PROP_SCALES)).toEqual(['size', 'align', 'emphasis']);
    expect(WZD_PROP_SCALES.size).toEqual(['xs', 'sm', 'md', 'lg', 'xl']);
    expect(WZD_PROP_SCALES.align).toEqual(['left', 'center', 'right']);
    expect(WZD_PROP_SCALES.emphasis).toEqual(['muted', 'normal', 'strong']);
  });

  it('are the only enums any component uses', () => {
    for (const spec of specs) {
      for (const prop of Object.values(spec.props)) {
        if (prop.kind !== 'enum') continue;
        expect(Object.keys(WZD_PROP_SCALES)).toContain(prop.name);
        expect(prop.values).toEqual(WZD_PROP_SCALES[prop.name as keyof typeof WZD_PROP_SCALES]);
        expect(prop.values).toContain(prop.default);
      }
    }
  });

  it('offers no raw style escape hatch', () => {
    for (const spec of specs) {
      expect(Object.keys(spec.props)).not.toContain('style');
      expect(Object.keys(spec.props)).not.toContain('class');
    }
  });
});

describe('the catalogue is internally consistent', () => {
  it('keys every spec by its own name', () => {
    for (const [key, spec] of Object.entries(WZD_COMPONENTS)) expect(spec.name).toBe(key);
    expect(WZD_COMPONENT_NAMES).toHaveLength(specs.length);
  });

  it('keys every prop spec by its own name', () => {
    for (const spec of specs) {
      for (const [key, prop] of Object.entries(spec.props)) expect(prop.name).toBe(key);
    }
  });

  it('only references tags that exist', () => {
    for (const spec of specs) {
      for (const child of spec.allowedChildren ?? []) expect(isKnownComponent(child)).toBe(true);
      for (const parent of spec.requiredParent ?? []) {
        if (parent === WZD_DOCUMENT_PARENT) continue;
        expect(isKnownComponent(parent)).toBe(true);
      }
      if (spec.requiredAncestor) expect(isKnownComponent(spec.requiredAncestor)).toBe(true);
    }
  });

  it('marks void exactly when a component takes no children', () => {
    for (const spec of specs) expect(spec.void).toBe(spec.children === 'none');
  });

  it('restricts children only where the child model is elements', () => {
    for (const spec of specs) {
      if (spec.allowedChildren) expect(spec.children).toBe('elements');
    }
  });

  it('separates lowercase structure from capitalized components', () => {
    for (const spec of specs) {
      const lower = spec.name[0] === spec.name[0].toLowerCase();
      expect(spec.role).toBe(lower ? 'structure' : 'component');
    }
    expect(WZD_RENDERABLE_NAMES).toContain('Slide');
    expect(WZD_RENDERABLE_NAMES).not.toContain('head');
  });

  it('gives every component a description, for the inspector', () => {
    for (const spec of specs) {
      expect(spec.description.length).toBeGreaterThan(0);
      for (const prop of Object.values(spec.props)) {
        expect(prop.description.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('the catalogue matches the spec in markup.md', () => {
  it('has exactly the documented components', () => {
    expect(WZD_RENDERABLE_NAMES).toEqual([
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
    ]);
  });

  it('has exactly the documented head fields', () => {
    expect(WZD_HEAD_FIELDS).toEqual([
      'title',
      'description',
      'keywords',
      'date',
      'caption',
      'hashtags',
    ]);
    expect(WZD_COMPONENTS.head.allowedChildren).toEqual(WZD_HEAD_FIELDS);
  });

  it('places Slide under body, Item under List, and everything else under Slide', () => {
    expect(WZD_COMPONENTS.Slide.requiredParent).toEqual(['body']);
    expect(WZD_COMPONENTS.Item.requiredParent).toEqual(['List']);
    expect(WZD_COMPONENTS.List.allowedChildren).toEqual(['Item']);
    expect(WZD_COMPONENTS.Heading.requiredAncestor).toBe('Slide');
  });

  it('requires src on Image and nothing else anywhere', () => {
    const required = specs.flatMap((spec) =>
      Object.values(spec.props)
        .filter((p) => p.required)
        .map((p) => `${spec.name}.${p.name}`),
    );
    expect(required).toEqual(['Image.src']);
  });
});

describe('lookup helpers', () => {
  it('resolves a spec by name, case-sensitively', () => {
    expect(getComponentSpec('Heading')?.group).toBe('content');
    expect(getComponentSpec('heading')).toBeUndefined();
    expect(isKnownComponent('PageCounter')).toBe(true);
    expect(isKnownComponent('toString')).toBe(false);
  });

  it('lists a component props in catalogue order', () => {
    expect(propsFor('Heading').map((p) => p.name)).toEqual(['size', 'align', 'emphasis']);
    expect(propsFor('Spacer').map((p) => p.name)).toEqual(['size']);
    expect(propsFor('Nope')).toEqual([]);
  });

  it('reports the values a prop accepts, or null for free text', () => {
    expect(allowedValues('Heading', 'size')).toEqual(WZD_PROP_SCALES.size);
    expect(allowedValues('Image', 'src')).toBeNull();
    expect(allowedValues('Heading', 'nope')).toBeNull();
    expect(allowedValues('Nope', 'size')).toBeNull();
  });

  it('identifies head fields', () => {
    expect(isHeadField('title')).toBe(true);
    expect(isHeadField('Slide')).toBe(false);
  });
});

describe('the rule table', () => {
  it('describes every code it defines', () => {
    for (const [code, rule] of Object.entries(WZD_RULES)) {
      expect(rule.code).toBe(code);
      expect(rule.summary.length).toBeGreaterThan(0);
      expect(['error', 'warning']).toContain(rule.severity);
    }
  });
});
