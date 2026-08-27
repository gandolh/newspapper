import { describe, it, expect } from 'vitest';
import type { TNode } from '../../types.js';
import { loadTheme } from '../../themes/index.js';
import { WZD_RENDERABLE_NAMES } from '../catalogue.js';
import { parseOrThrow } from '../parse.js';
import { compile, compileSource } from '../compile.js';
import { WZD_RENDERERS, unthemedStyleValues } from './index.js';

const theme = loadTheme('warm-industrial');

function slide(markup: string, head = '<title>T</title>'): TNode {
  const doc = parseOrThrow(`<head>${head}</head><body><Slide>${markup}</Slide></body>`);
  return compile(doc, theme).slides[0];
}

/** The children of the compiled `<Slide>` root. */
function blocks(markup: string, head?: string): TNode[] {
  const root = slide(markup, head);
  if (root.kind !== 'box') throw new Error('slide is not a box');
  return root.children ?? [];
}

function first(markup: string, head?: string): TNode {
  return blocks(markup, head)[0];
}

function text(node: TNode): string {
  return node.kind === 'text' ? node.text : '';
}

describe('the registry', () => {
  it('implements exactly the catalogue', () => {
    expect(Object.keys(WZD_RENDERERS).sort()).toEqual([...WZD_RENDERABLE_NAMES].sort());
  });
});

describe('Slide', () => {
  it('fills its frame and carries the surface tokens', () => {
    const root = slide('<Heading>Hi</Heading>');
    expect(root.kind).toBe('box');
    expect(root.style).toMatchObject({
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '$spacing.xl',
      gap: '$spacing.md',
      backgroundColor: '$color.surface',
      color: '$color.on-surface',
      textAlign: 'left',
    });
  });

  it('states no pixel size of its own', () => {
    expect(JSON.stringify(slide('<Heading>Hi</Heading>'))).not.toContain('1080');
  });
});

describe('Stack', () => {
  it('flows a column with a gap from the size scale', () => {
    const node = first('<Stack size="lg"><Text>a</Text></Stack>');
    expect(node.style).toMatchObject({
      display: 'flex',
      flexDirection: 'column',
      gap: '$spacing.lg',
    });
  });
});

describe('Row', () => {
  it('splits horizontally and shares the width between its columns', () => {
    const node = first('<Row><Stack><Text>a</Text></Stack><Stack><Text>b</Text></Stack></Row>');
    expect(node.style).toMatchObject({ display: 'flex', flexDirection: 'row', gap: '$spacing.md' });
    if (node.kind !== 'box') throw new Error('Row is not a box');
    expect(node.children).toHaveLength(2);
    for (const column of node.children ?? []) {
      expect(column.style).toMatchObject({ flex: 1, minWidth: '0' });
    }
  });
});

describe('Heading', () => {
  it('selects a typography token per size', () => {
    expect(first('<Heading size="xs">a</Heading>').style?.['typography']).toBe('body-lg');
    expect(first('<Heading>a</Heading>').style?.['typography']).toBe('headline-lg');
    expect(first('<Heading size="xl">a</Heading>').style?.['typography']).toBe('display');
  });

  it('selects a colour token per emphasis', () => {
    expect(first('<Heading emphasis="muted">a</Heading>').style?.['color']).toBe('$color.on-surface-variant');
    expect(first('<Heading>a</Heading>').style?.['color']).toBe('$color.on-surface');
    expect(first('<Heading emphasis="strong">a</Heading>').style?.['color']).toBe('$color.primary');
  });

  it('carries its words', () => {
    expect(text(first('<Heading>Three things</Heading>'))).toBe('Three things');
  });
});

describe('Text', () => {
  it('sits a step below Heading on the type scale', () => {
    expect(first('<Text>a</Text>').style?.['typography']).toBe('headline-md');
    expect(first('<Text size="xl">a</Text>').style?.['typography']).toBe('display');
  });
});

describe('List and Item', () => {
  it('renders a bulleted column and passes its size down to the items', () => {
    const list = first('<List size="sm"><Item>one</Item><Item emphasis="strong">two</Item></List>');
    expect(list.style).toMatchObject({ display: 'flex', flexDirection: 'column', gap: '$spacing.xs' });
    if (list.kind !== 'box') throw new Error('List is not a box');
    const [one, two] = list.children ?? [];
    if (one.kind !== 'box' || two.kind !== 'box') throw new Error('Item is not a box');
    expect(text((one.children ?? [])[0])).toBe('•');
    expect(text((one.children ?? [])[1])).toBe('one');
    expect((one.children ?? [])[1].style?.['typography']).toBe('body-lg');
    expect((two.children ?? [])[1].style?.['color']).toBe('$color.primary');
  });
});

describe('Quote', () => {
  it('carries its attribution under the words', () => {
    const quote = first('<Quote size="lg" by="The Chancellor">We are backing working people.</Quote>');
    if (quote.kind !== 'box') throw new Error('Quote is not a box');
    const [body, attribution] = quote.children ?? [];
    expect(body.style?.['typography']).toBe('display');
    expect(text(body)).toBe('We are backing working people.');
    expect(text(attribution)).toBe('— The Chancellor');
    expect(attribution.style).toMatchObject({
      typography: 'label-bold',
      color: '$color.on-surface-variant',
    });
  });

  it('omits the attribution when there is none', () => {
    const quote = first('<Quote>Anonymous</Quote>');
    if (quote.kind !== 'box') throw new Error('Quote is not a box');
    expect(quote.children).toHaveLength(1);
  });
});

describe('Stat', () => {
  it('is a big number over a label', () => {
    const stat = first('<Stat size="xl" label="years frozen">15</Stat>');
    if (stat.kind !== 'box') throw new Error('Stat is not a box');
    const [number, label] = stat.children ?? [];
    expect(number.style?.['typography']).toBe('display');
    expect(text(number)).toBe('15');
    expect(text(label)).toBe('years frozen');
    expect(label.style).toMatchObject({ typography: 'label-bold', textTransform: 'uppercase' });
  });
});

describe('Image', () => {
  it('resolves src against the upload base and takes a width from the size scale', () => {
    const doc = parseOrThrow(
      '<head><title>T</title></head><body><Slide><Image src="door.jpg" size="lg" /></Slide></body>',
    );
    const root = compile(doc, theme, { uploadBaseUrl: '/uploads' }).slides[0];
    if (root.kind !== 'box') throw new Error('slide is not a box');
    const image = (root.children ?? [])[0];
    expect(image.style).toMatchObject({
      width: '80%',
      backgroundImage: "url('/uploads/door.jpg')",
      backgroundSize: 'cover',
      borderRadius: '$rounded.md',
    });
  });

  it('centres itself when aligned', () => {
    const doc = parseOrThrow(
      '<head><title>T</title></head><body><Slide><Image src="a.jpg" align="center" /></Slide></body>',
    );
    const root = compile(doc, theme).slides[0];
    if (root.kind !== 'box') throw new Error('slide is not a box');
    expect((root.children ?? [])[0].style).toMatchObject({ marginLeft: 'auto', marginRight: 'auto' });
  });
});

describe('Kicker', () => {
  it('is an uppercase label', () => {
    const kicker = first('<Kicker>Economy</Kicker>');
    expect(kicker.style).toMatchObject({ typography: 'label-bold', textTransform: 'uppercase' });
    expect(text(kicker)).toBe('Economy');
  });
});

describe('Source', () => {
  it('is a label that takes the emphasis scale', () => {
    const source = first('<Source emphasis="muted">HM Treasury</Source>');
    expect(source.style).toMatchObject({
      typography: 'label-bold',
      color: '$color.on-surface-variant',
    });
    expect(text(source)).toBe('HM Treasury');
  });
});

describe('Divider', () => {
  it('is a rule of the theme border width, on the outline scale', () => {
    const rule = first('<Divider size="sm" emphasis="muted" />');
    expect(rule.style).toMatchObject({
      width: '40%',
      height: theme.shapes.borderWidth,
      backgroundColor: '$color.outline-variant',
    });
  });
});

describe('Spacer', () => {
  it('is a fixed gap from the spacing scale', () => {
    expect(first('<Spacer size="lg" />').style).toMatchObject({
      height: '$spacing.lg',
      flexShrink: 0,
    });
  });
});

describe('PageCounter', () => {
  it('renders n/total for every slide in the document', () => {
    const source = ['<head><title>T</title></head><body>']
      .concat(
        Array.from({ length: 5 }, (_, i) => `<Slide><Heading>${i}</Heading><PageCounter /></Slide>`),
      )
      .concat(['</body>'])
      .join('');
    const { slides } = compileSource(source, theme);
    const counters = slides.map((s) => {
      if (s.kind !== 'box') throw new Error('slide is not a box');
      return text((s.children ?? [])[1]);
    });
    expect(counters).toEqual(['1/5', '2/5', '3/5', '4/5', '5/5']);
  });

  it('pins itself to the bottom of the slide', () => {
    expect(first('<PageCounter />').style?.['marginTop']).toBe('auto');
  });
});

describe('prop defaults', () => {
  it('resolve to the catalogue values when a prop is absent', () => {
    const bare = first('<Heading>a</Heading>');
    const explicit = first('<Heading size="md" align="left" emphasis="normal">a</Heading>');
    expect(bare.style).toEqual(explicit.style);
  });

  it('fall back rather than reaching the tree when a value is off the scale', () => {
    const bad = first('<Heading size="enormous">a</Heading>');
    expect(bad.style?.['typography']).toBe('headline-lg');
  });
});

describe('alignment', () => {
  it('is inherited by everything inside the element that set it', () => {
    const root = slide('<Stack align="center"><Heading>a</Heading><Text>b</Text></Stack>');
    if (root.kind !== 'box') throw new Error('slide is not a box');
    const stack = (root.children ?? [])[0];
    if (stack.kind !== 'box') throw new Error('Stack is not a box');
    for (const child of stack.children ?? []) expect(child.style?.['textAlign']).toBe('center');
  });

  it('is overridden by a nearer declaration', () => {
    const root = slide('<Stack align="center"><Heading align="right">a</Heading></Stack>');
    if (root.kind !== 'box') throw new Error('slide is not a box');
    const stack = (root.children ?? [])[0];
    if (stack.kind !== 'box') throw new Error('Stack is not a box');
    expect((stack.children ?? [])[0].style?.['textAlign']).toBe('right');
  });
});

describe('the token invariant', () => {
  it('holds for every component in the catalogue', () => {
    const markup = [
      '<Kicker>k</Kicker>',
      '<Heading size="xl" align="center" emphasis="strong">h</Heading>',
      '<Text size="xs" emphasis="muted">t</Text>',
      '<List size="lg"><Item emphasis="strong">i</Item></List>',
      '<Quote size="sm" by="Someone">q</Quote>',
      '<Row><Stack><Stat size="xl" label="l">1</Stat></Stack></Row>',
      '<Image src="a.jpg" alt="a" size="md" align="right" />',
      '<Divider size="xs" emphasis="strong" />',
      '<Spacer size="xl" />',
      '<Source emphasis="muted">s</Source>',
      '<PageCounter align="right" />',
    ].join('');
    expect(unthemedStyleValues([slide(markup)], theme)).toEqual([]);
  });

  it('holds for every size, align and emphasis of every component', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'];
    const aligns = ['left', 'center', 'right'];
    const emphases = ['muted', 'normal', 'strong'];
    const parts: string[] = [];
    for (const size of sizes) {
      for (const align of aligns) {
        for (const emphasis of emphases) {
          parts.push(
            `<Heading size="${size}" align="${align}" emphasis="${emphasis}">h</Heading>`,
            `<Text size="${size}" align="${align}" emphasis="${emphasis}">t</Text>`,
            `<Kicker size="${size}" align="${align}" emphasis="${emphasis}">k</Kicker>`,
            `<Source size="${size}" align="${align}" emphasis="${emphasis}">s</Source>`,
            `<Quote size="${size}" align="${align}" emphasis="${emphasis}" by="b">q</Quote>`,
            `<Stat size="${size}" align="${align}" emphasis="${emphasis}" label="l">1</Stat>`,
            `<PageCounter size="${size}" align="${align}" emphasis="${emphasis}" />`,
            `<Divider size="${size}" emphasis="${emphasis}" />`,
            `<Spacer size="${size}" />`,
            `<Image src="a.jpg" size="${size}" align="${align}" />`,
            `<Stack size="${size}" align="${align}"><Text>x</Text></Stack>`,
            `<Row size="${size}" align="${align}"><Text>x</Text></Row>`,
            `<List size="${size}" align="${align}"><Item emphasis="${emphasis}">i</Item></List>`,
          );
        }
      }
    }
    expect(unthemedStyleValues([slide(parts.join(''))], theme)).toEqual([]);
  });
});
