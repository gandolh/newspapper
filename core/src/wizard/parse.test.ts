import { describe, expect, it } from 'vitest';
import { isElement, nodeAt, walk, type WzdElement } from './ast.js';
import { WzdSyntaxError, parse, parseOrThrow } from './parse.js';

function firstElement(source: string, type: string): WzdElement {
  const { doc } = parse(source);
  let found: WzdElement | null = null;
  walk(doc, (node) => {
    if (node.kind === 'element' && node.type === type && !found) found = node;
  });
  if (!found) throw new Error(`no <${type}> in document`);
  return found;
}

describe('document shape', () => {
  const source = `<head>
  <title>Budget</title>
  <date>2026-08-27</date>
</head>

<body>
  <Slide>
    <Heading size="xl">Three things</Heading>
  </Slide>
</body>
`;

  it('lifts head fields into a record', () => {
    const { doc } = parse(source);
    expect(doc.head).toEqual({ title: 'Budget', date: '2026-08-27' });
  });

  it('exposes body children and keeps every top-level node', () => {
    const { doc } = parse(source);
    expect(doc.body.filter(isElement).map((n) => n.type)).toEqual(['Slide']);
    expect(doc.children.filter(isElement).map((n) => n.type)).toEqual(['head', 'body']);
    expect(doc.headElement?.type).toBe('head');
    expect(doc.bodyElement?.type).toBe('body');
  });

  it('parses props and nested children', () => {
    const heading = firstElement(source, 'Heading');
    expect(heading.props).toEqual({ size: 'xl' });
    expect(heading.children).toHaveLength(1);
    expect(heading.children[0]).toMatchObject({ kind: 'text', value: 'Three things' });
  });

  it('reports no errors for a well-formed document', () => {
    expect(parse(source).errors).toEqual([]);
  });
});

describe('tags and props', () => {
  it('parses a self-closing tag', () => {
    const el = firstElement('<body><Slide><PageCounter /></Slide></body>', 'PageCounter');
    expect(el.selfClosing).toBe(true);
    expect(el.children).toEqual([]);
    expect(el.closeTagLoc).toBeNull();
  });

  it('accepts single-quoted prop values', () => {
    const el = firstElement(`<body><Quote by='The Chancellor'>Hi</Quote></body>`, 'Quote');
    expect(el.props.by).toBe('The Chancellor');
  });

  it('keeps attribute order and records every attribute', () => {
    const el = firstElement('<body><Heading size="lg" align="center">x</Heading></body>', 'Heading');
    expect(el.attributes.map((a) => a.name)).toEqual(['size', 'align']);
    expect(Object.keys(el.props)).toEqual(['size', 'align']);
  });

  it('keeps the first value when a prop is repeated, but records both attributes', () => {
    const el = firstElement('<body><Heading size="lg" size="sm">x</Heading></body>', 'Heading');
    expect(el.props.size).toBe('lg');
    expect(el.attributes).toHaveLength(2);
  });

  it('tolerates whitespace around the equals sign', () => {
    const el = firstElement('<body><Heading  size = "lg" >x</Heading></body>', 'Heading');
    expect(el.props.size).toBe('lg');
  });
});

describe('text, comments and bindings', () => {
  it('collapses whitespace in value and keeps the source slice in raw', () => {
    const { doc } = parse('<body><Text>one\n   two</Text></body>');
    const text = firstElement('<body><Text>one\n   two</Text></body>', 'Text').children[0];
    expect(text).toMatchObject({ kind: 'text', value: 'one two', raw: 'one\n   two' });
    expect(doc.children).toHaveLength(1);
  });

  it('carries {date} through as plain text', () => {
    const el = firstElement('<body><Kicker>{date}</Kicker></body>', 'Kicker');
    expect(el.children[0]).toMatchObject({ kind: 'text', value: '{date}' });
  });

  it('parses comments as nodes', () => {
    const { doc, errors } = parse('<!--  a note  -->\n<head></head>');
    expect(errors).toEqual([]);
    expect(doc.children[0]).toMatchObject({ kind: 'comment', value: 'a note' });
  });

  it('drops whitespace-only text but records the blank line it held', () => {
    const el = firstElement(
      '<body><Slide><Heading>a</Heading>\n\n<Text>b</Text></Slide></body>',
      'Slide',
    );
    expect(el.children).toHaveLength(2);
    expect(el.children[0].blankLineBefore).toBe(false);
    expect(el.children[1].blankLineBefore).toBe(true);
  });
});

describe('source positions', () => {
  it('reports 1-based line and column and 0-based offset', () => {
    const source = '<head>\n  <title>Hi</title>\n</head>\n';
    const title = firstElement(source, 'title');
    expect(title.loc.start).toEqual({ offset: 9, line: 2, column: 3 });
    expect(title.nameLoc.start).toEqual({ offset: 10, line: 2, column: 4 });
    expect(source.slice(title.loc.start.offset, title.loc.end.offset)).toBe('<title>Hi</title>');
  });

  it('ranges an attribute name and value separately', () => {
    const source = '<body><Heading size="lg">x</Heading></body>';
    const heading = firstElement(source, 'Heading');
    const attr = heading.attributes[0];
    expect(source.slice(attr.nameLoc.start.offset, attr.nameLoc.end.offset)).toBe('size');
    expect(source.slice(attr.valueLoc.start.offset, attr.valueLoc.end.offset)).toBe('lg');
    expect(source.slice(attr.loc.start.offset, attr.loc.end.offset)).toBe('size="lg"');
  });

  it('finds the innermost node at an offset', () => {
    const source = '<body><Slide><Heading>Hello</Heading></Slide></body>';
    const { doc } = parse(source);
    const node = nodeAt(doc, source.indexOf('Hello') + 1);
    expect(node).toMatchObject({ kind: 'text', value: 'Hello' });
    expect(nodeAt(doc, source.length + 10)).toBeNull();
  });
});

describe('error recovery', () => {
  it('reports an unclosed element at its opening tag', () => {
    const { errors, doc } = parse('<body>\n  <Slide>\n</body>\n');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('syntax-error');
    expect(errors[0].message).toContain('never closed');
    expect(errors[0].loc.start.line).toBe(2);
    expect(doc.bodyElement).not.toBeNull();
  });

  it('reports a stray closing tag', () => {
    const { errors } = parse('<body></Slide></body>');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('Unexpected closing tag </Slide>');
  });

  it('recovers from a mismatched closing tag', () => {
    const { errors, doc } = parse('<body><Slide><Heading>a</Slide></body>');
    expect(errors.map((e) => e.message).join(' ')).toContain('<Heading>');
    expect(doc.bodyElement?.children.filter(isElement).map((n) => n.type)).toEqual(['Slide']);
  });

  it('rejects an unquoted prop value and says why', () => {
    const { errors } = parse('<body><Heading size=lg>a</Heading></body>');
    expect(errors[0].message).toContain('must be quoted');
    expect(errors[0].message).toContain('no expressions');
  });

  it('rejects a bare prop', () => {
    const { errors } = parse('<body><Heading strong>a</Heading></body>');
    expect(errors[0].message).toContain('needs a value');
  });

  it('reports an unterminated prop string', () => {
    const { errors } = parse('<body><Heading size="lg>a</Heading></body>');
    expect(errors[0].message).toContain('missing its closing');
  });

  it('reports an unterminated comment', () => {
    const { errors } = parse('<head></head>\n<!-- forever');
    expect(errors[0].message).toContain('never closed');
  });

  it('rejects a bare < in text', () => {
    const { errors } = parse('<body><Text>5 < 6</Text></body>');
    expect(errors[0].message).toContain('cannot appear in text');
  });

  it('never throws, whatever it is handed', () => {
    for (const junk of ['', '<', '</>', '<<<>>>', '<a b=', '"', '<Slide', '{}', '-->']) {
      expect(() => parse(junk)).not.toThrow();
    }
  });
});

describe('normalization', () => {
  it('normalizes CRLF so offsets line up with the returned source', () => {
    const { doc, source } = parse('<head>\r\n  <title>Hi</title>\r\n</head>\r\n');
    expect(source).not.toContain('\r');
    const title = doc.headElement!.children.filter(isElement)[0];
    expect(source.slice(title.loc.start.offset, title.loc.end.offset)).toBe('<title>Hi</title>');
  });
});

describe('parseOrThrow', () => {
  it('returns the document when clean', () => {
    expect(parseOrThrow('<head><title>a</title></head>').head.title).toBe('a');
  });

  it('throws a WzdSyntaxError carrying the first diagnostic', () => {
    try {
      parseOrThrow('<body><Slide></body>');
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(WzdSyntaxError);
      const e = err as WzdSyntaxError;
      expect(e.diagnostic.code).toBe('syntax-error');
      expect(e.diagnostic.loc.start.line).toBe(1);
      expect(e.message).toMatch(/^1:7:/);
    }
  });
});
