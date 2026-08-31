import { describe, it, expect } from 'vitest';
import { compile, parse, resolveProps } from '@newspapper/core/wizard';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Theme } from '@newspapper/core/templates';
import { inheritedAlign, textOf } from './props.js';
import { elementAtPath, slidePaths } from './paths.js';

const theme = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../../../../assets/design-systems/warm-industrial-1.json', import.meta.url),
    ),
    'utf8',
  ),
) as Theme;

const SOURCE = `<head>
  <title>Alignment</title>
</head>

<body>
  <Slide align="center">
    <Heading>Centred by the slide</Heading>
    <Stack align="right">
      <Text>Right, from the stack</Text>
      <Text align="left">Left, stated</Text>
    </Stack>
  </Slide>
</body>
`;

const doc = parse(SOURCE).doc;
const slide = slidePaths(doc)[0];

describe('inheritedAlign', () => {
  it('takes the nearest ancestor that states one', () => {
    expect(inheritedAlign(doc, slide)).toBe('center');
    expect(inheritedAlign(doc, [...slide, 0])).toBe('center');
    expect(inheritedAlign(doc, [...slide, 1])).toBe('right');
    expect(inheritedAlign(doc, [...slide, 1, 0])).toBe('right');
    expect(inheritedAlign(doc, [...slide, 1, 1])).toBe('left');
  });

  it('agrees with what the compiler puts on the node', () => {
    const { slides } = compile(doc, theme);
    const styles: string[] = [];
    const visit = (node: {
      kind: string;
      style?: Record<string, unknown>;
      children?: unknown[];
    }): void => {
      if (node.style?.['textAlign']) styles.push(String(node.style['textAlign']));
      (node.children as (typeof node)[] | undefined)?.forEach(visit);
    };
    visit(slides[0] as never);
    expect(styles).toContain('center');
    expect(styles).toContain('right');
    expect(styles).toContain('left');
  });

  it('falls back to left with no ancestor stating one', () => {
    const plain = parse(
      '<head>\n  <title>x</title>\n</head>\n\n<body>\n  <Slide>\n    <Text>Hi</Text>\n  </Slide>\n</body>\n',
    ).doc;
    expect(inheritedAlign(plain, [...slidePaths(plain)[0], 0])).toBe('left');
  });

  it('is not what resolveProps reports, which is why it exists', () => {
    const el = elementAtPath(doc, [...slide, 0]);
    expect(resolveProps(el!)['align']).toBe('left');
    expect(inheritedAlign(doc, [...slide, 0])).toBe('center');
  });
});

describe('textOf', () => {
  it('reads only the text the element owns', () => {
    expect(textOf(elementAtPath(doc, [...slide, 0])!)).toBe('Centred by the slide');
    expect(textOf(elementAtPath(doc, [...slide, 1])!)).toBe('');
  });
});
