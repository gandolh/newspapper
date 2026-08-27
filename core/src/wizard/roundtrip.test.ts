import { describe, expect, it } from 'vitest';
import { elementChildren, textContent, walk, type WzdNode } from './ast.js';
import { format } from './format.js';
import { parse } from './parse.js';
import { WZD_SAMPLES } from './samples.js';

/** Everything about a tree except where it sat in the file. */
function shape(node: WzdNode): unknown {
  if (node.kind === 'text') return { text: node.value };
  if (node.kind === 'comment') return { comment: node.value };
  return {
    type: node.type,
    props: node.props,
    children: node.children.map(shape),
  };
}

describe('round-trip', () => {
  it.each(WZD_SAMPLES.map((s) => [s.name, s.source] as const))(
    'formatting %s changes nothing but whitespace',
    (_name, source) => {
      const before = parse(source);
      const after = parse(format(source));
      expect(after.errors).toEqual([]);
      expect(after.doc.children.map(shape)).toEqual(before.doc.children.map(shape));
      expect(after.doc.head).toEqual(before.doc.head);
    },
  );

  it.each(WZD_SAMPLES.map((s) => [s.name, s.source] as const))(
    'every node in %s points at the text it came from',
    (_name, source) => {
      const { doc, source: normalized } = parse(source);
      walk(doc, (node) => {
        const slice = normalized.slice(node.loc.start.offset, node.loc.end.offset);
        if (node.kind === 'element') {
          expect(slice.startsWith(`<${node.type}`)).toBe(true);
        } else if (node.kind === 'text') {
          expect(slice).toBe(node.raw);
        } else {
          expect(slice.startsWith('<!--')).toBe(true);
        }
      });
    },
  );
});

describe('tree helpers', () => {
  const source = `<head>
  <title>Budget</title>
</head>

<body>
  <Slide>
    <Heading>Three <!-- pending --> things</Heading>
    <List>
      <Item>One</Item>
      <Item>Two</Item>
    </List>
  </Slide>
</body>
`;

  it('walks depth-first, in source order, with ancestors', () => {
    const { doc } = parse(source);
    const seen: string[] = [];
    walk(doc, (node, ctx) => {
      if (node.kind === 'element') seen.push(`${ctx.ancestors.map((a) => a.type).join('/')}>${node.type}`);
    });
    expect(seen).toEqual([
      '>head',
      'head>title',
      '>body',
      'body>Slide',
      'body/Slide>Heading',
      'body/Slide>List',
      'body/Slide/List>Item',
      'body/Slide/List>Item',
    ]);
  });

  it('collects text content across children, ignoring comments', () => {
    const { doc } = parse(source);
    const slide = elementChildren(doc.bodyElement!)[0];
    expect(textContent(elementChildren(slide)[0])).toBe('Three things');
    expect(textContent(elementChildren(slide)[1])).toBe('One Two');
  });
});
