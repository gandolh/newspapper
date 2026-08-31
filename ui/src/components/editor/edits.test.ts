import { describe, it, expect } from 'vitest';
import { isFormatted, lintSource, parse, WZD_SAMPLES } from '@newspapper/core/wizard';
import {
  duplicateNode,
  insertComponent,
  makeElement,
  moveNode,
  nudgeNode,
  removeNode,
  sanitizeAttrValue,
  sanitizeText,
  setHeadField,
  setProp,
  setTextContent,
  starterElement,
} from './edits.js';
import { bodyPath, elementAtPath, slidePaths } from './paths.js';
import { starterDocument } from './starter.js';

const DOC = starterDocument('2026-08-31');

function doc(source: string) {
  return parse(source).doc;
}

function firstSlide(source: string): readonly number[] {
  return slidePaths(doc(source))[0];
}

describe('the starter document', () => {
  it('is canonical and lints clean', () => {
    expect(isFormatted(DOC)).toBe(true);
    expect(lintSource(DOC)).toEqual([]);
  });
});

describe('setProp', () => {
  it('writes a prop and leaves the source formatter-canonical', () => {
    const heading = [...firstSlide(DOC), 1];
    const next = setProp(DOC, heading, 'align', 'center');
    expect(isFormatted(next)).toBe(true);
    expect(elementAtPath(doc(next), heading)?.props).toMatchObject({
      size: 'xl',
      align: 'center',
    });
  });

  it('inserts a new prop in catalogue order', () => {
    const kicker = [...firstSlide(DOC), 0];
    const next = setProp(setProp(DOC, kicker, 'emphasis', 'strong'), kicker, 'size', 'sm');
    const el = elementAtPath(doc(next), kicker);
    expect(el?.attributes.map((a) => a.name)).toEqual(['size', 'emphasis']);
  });

  it('removes a prop when the value is empty', () => {
    const heading = [...firstSlide(DOC), 1];
    const next = setProp(DOC, heading, 'size', '');
    expect(elementAtPath(doc(next), heading)?.props['size']).toBeUndefined();
    expect(isFormatted(next)).toBe(true);
  });

  it('leaves unparseable source alone', () => {
    const broken = '<head><title>x</head>';
    expect(setProp(broken, [0], 'align', 'center')).toBe(broken);
  });
});

describe('setTextContent', () => {
  it('replaces the text and flattens what a person cannot type', () => {
    const heading = [...firstSlide(DOC), 1];
    const next = setTextContent(DOC, heading, '  a <b>  bold   claim  ');
    const el = elementAtPath(doc(next), heading);
    expect(el?.children).toHaveLength(1);
    expect(el?.children[0]).toMatchObject({ kind: 'text', value: 'a b> bold claim' });
    expect(isFormatted(next)).toBe(true);
  });

  it('empties an element rather than leaving whitespace behind', () => {
    const heading = [...firstSlide(DOC), 1];
    const next = setTextContent(DOC, heading, '   ');
    expect(elementAtPath(doc(next), heading)?.children).toEqual([]);
    expect(next).toContain('<Heading size="xl" />');
  });
});

describe('insertComponent', () => {
  it('drops into the slot between existing children', () => {
    const slide = firstSlide(DOC);
    const next = insertComponent(DOC, slide, 1, 'Divider');
    const children = elementAtPath(doc(next), slide)?.children.filter((c) => c.kind === 'element');
    expect(children?.map((c) => (c as { type: string }).type)).toEqual([
      'Kicker',
      'Divider',
      'Heading',
      'Text',
    ]);
    expect(isFormatted(next)).toBe(true);
  });

  it('clamps an out-of-range slot to the end', () => {
    const slide = firstSlide(DOC);
    const next = insertComponent(DOC, slide, 99, 'PageCounter');
    const children = elementAtPath(doc(next), slide)?.children.filter((c) => c.kind === 'element');
    expect((children?.[children.length - 1] as { type: string }).type).toBe('PageCounter');
  });

  it('adds a slide that lints clean', () => {
    const body = bodyPath(doc(DOC));
    expect(body).not.toBeNull();
    const next = insertComponent(DOC, body ?? [], 0, 'Slide');
    expect(lintSource(next)).toEqual([]);
    expect(slidePaths(doc(next))).toHaveLength(3);
  });

  it('starts every catalogue component in a state the linter accepts', () => {
    const slide = firstSlide(DOC);
    for (const name of ['Stack', 'Row', 'List', 'Quote', 'Stat', 'Kicker', 'Source', 'Divider', 'Spacer', 'PageCounter', 'Heading', 'Text']) {
      const next = insertComponent(DOC, slide, 0, name);
      expect(lintSource(next), name).toEqual([]);
      expect(isFormatted(next), name).toBe(true);
    }
  });
});

describe('removeNode / duplicateNode / moveNode', () => {
  it('removes a node', () => {
    const slide = firstSlide(DOC);
    const next = removeNode(DOC, [...slide, 0]);
    expect(next).not.toContain('<Kicker>');
    expect(isFormatted(next)).toBe(true);
  });

  it('duplicates a node in place', () => {
    const slide = firstSlide(DOC);
    const next = duplicateNode(DOC, [...slide, 0]);
    expect(next.match(/<Kicker>/g)).toHaveLength(2);
  });

  it('moves a node into another slide', () => {
    const [first, second] = slidePaths(doc(DOC));
    const next = moveNode(DOC, [...first, 0], second, 0);
    const target = elementAtPath(doc(next), second);
    expect((target?.children.filter((c) => c.kind === 'element')[0] as { type: string }).type).toBe(
      'Kicker',
    );
    expect(elementAtPath(doc(next), first)?.children.filter((c) => c.kind === 'element')).toHaveLength(2);
  });

  it('refuses to move a node into itself', () => {
    const slide = firstSlide(DOC);
    expect(moveNode(DOC, slide, [...slide, 0], 0)).toBe(DOC);
    expect(moveNode(DOC, slide, slide, 0)).toBe(DOC);
  });

  it('is a no-op when the slot is where the node already is', () => {
    const slide = firstSlide(DOC);
    expect(moveNode(DOC, [...slide, 1], slide, 1)).toBe(DOC);
    expect(moveNode(DOC, [...slide, 1], slide, 2)).toBe(DOC);
  });

  it('nudges a node one slot in each direction', () => {
    const slide = firstSlide(DOC);
    const up = nudgeNode(DOC, [...slide, 1], -1);
    const names = (source: string) =>
      elementAtPath(doc(source), slide)
        ?.children.filter((c) => c.kind === 'element')
        .map((c) => (c as { type: string }).type);
    expect(names(up)).toEqual(['Heading', 'Kicker', 'Text']);
    expect(names(nudgeNode(up, [...slide, 0], 1))).toEqual(['Kicker', 'Heading', 'Text']);
  });
});

describe('setHeadField', () => {
  it('updates an existing field', () => {
    const next = setHeadField(DOC, 'title', 'A better title');
    expect(parse(next).doc.head['title']).toBe('A better title');
    expect(isFormatted(next)).toBe(true);
  });

  it('inserts a missing field in canonical head order', () => {
    const stripped = setHeadField(DOC, 'keywords', '');
    expect(parse(stripped).doc.head['keywords']).toBeUndefined();
    const restored = setHeadField(stripped, 'keywords', 'budget, tax');
    const order = parse(restored)
      .doc.headElement?.children.filter((c) => c.kind === 'element')
      .map((c) => (c as { type: string }).type);
    expect(order).toEqual(['title', 'description', 'keywords', 'date', 'caption', 'hashtags']);
  });

  it('creates <head> when the document has none', () => {
    const next = setHeadField('<body>\n  <Slide>\n    <Heading>Hi</Heading>\n  </Slide>\n</body>\n', 'title', 'Hi');
    expect(parse(next).doc.head['title']).toBe('Hi');
    expect(isFormatted(next)).toBe(true);
  });
});

describe('sanitizers', () => {
  it('drops what the language cannot represent', () => {
    expect(sanitizeText('a\nb  c')).toBe('a b c');
    expect(sanitizeText('a <b')).toBe('a b');
    expect(sanitizeAttrValue(`he said "no"`)).toBe(`he said "no"`);
    expect(sanitizeAttrValue(`it's a "quote"`)).toBe(`it's a 'quote'`);
  });
});

describe('every edit over every sample leaves canonical source', () => {
  it('holds for a prop write on each sample\'s first slide', () => {
    for (const sample of WZD_SAMPLES) {
      const paths = slidePaths(doc(sample.source));
      if (!paths.length) continue;
      const next = setProp(sample.source, paths[0], 'align', 'center');
      expect(isFormatted(next), sample.name).toBe(true);
    }
  });
});

describe('makeElement / starterElement', () => {
  it('keeps props and attributes in step', () => {
    const el = makeElement('Heading', { size: 'lg' });
    expect(el.props).toEqual({ size: 'lg' });
    expect(el.attributes.map((a) => [a.name, a.value])).toEqual([['size', 'lg']]);
  });

  it('marks void components self-closing', () => {
    expect(starterElement('Divider').selfClosing).toBe(true);
    expect(starterElement('Heading').selfClosing).toBe(false);
  });
});
