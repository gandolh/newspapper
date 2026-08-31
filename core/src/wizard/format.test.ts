import { describe, expect, it } from 'vitest';
import { format, formatDocument, isFormatted } from './format.js';
import { parse } from './parse.js';
import { WZD_SAMPLES } from './samples.js';

describe('idempotency', () => {
  it.each(WZD_SAMPLES.map((s) => [s.name, s.source] as const))(
    'format(format(%s)) === format(%s)',
    (_name, source) => {
      const once = format(source);
      expect(format(once)).toBe(once);
    },
  );

  it.each(WZD_SAMPLES.filter((s) => s.canonical).map((s) => [s.name, s.source] as const))(
    'the %s sample is already canonical',
    (_name, source) => {
      expect(format(source)).toBe(source);
      expect(isFormatted(source)).toBe(true);
    },
  );

  it('survives a third pass over deliberately messy input', () => {
    const messy = WZD_SAMPLES.find((s) => !s.canonical)!.source;
    const a = format(messy);
    expect(format(format(a))).toBe(a);
    expect(a).not.toBe(messy);
  });
});

describe('canonical form', () => {
  it('indents two spaces per level and ends with a newline', () => {
    const out = format('<body><Slide><List><Item>a</Item></List></Slide></body>');
    expect(out).toBe(
      [
        '<body>',
        '  <Slide>',
        '    <List>',
        '      <Item>a</Item>',
        '    </List>',
        '  </Slide>',
        '</body>',
        '',
      ].join('\n'),
    );
  });

  it('keeps an element with only text on one line', () => {
    expect(format('<head>\n<title>\n  Hi\n</title>\n</head>')).toBe(
      '<head>\n  <title>Hi</title>\n</head>\n',
    );
  });

  it('breaks text onto its own line when the line would be too long', () => {
    const long = 'x'.repeat(120);
    const out = format(`<body><Text>${long}</Text></body>`);
    expect(out).toBe(`<body>\n  <Text>\n    ${long}\n  </Text>\n</body>\n`);
  });

  it('self-closes an element with no children', () => {
    expect(format('<body><Slide></Slide></body>')).toBe('<body>\n  <Slide />\n</body>\n');
    expect(format('<body><PageCounter/></body>')).toBe('<body>\n  <PageCounter />\n</body>\n');
  });

  it('keeps props on one line until they exceed the print width', () => {
    const inline = format('<body><Heading size="lg" align="center">a</Heading></body>');
    expect(inline).toContain('<Heading size="lg" align="center">a</Heading>');

    const narrow = format('<body><Heading size="lg" align="center">a</Heading></body>', {
      printWidth: 24,
    });
    expect(narrow).toBe(
      [
        '<body>',
        '  <Heading',
        '    size="lg"',
        '    align="center"',
        '  >',
        '    a',
        '  </Heading>',
        '</body>',
        '',
      ].join('\n'),
    );
  });

  it('closes a broken-out prop list of a childless element with />', () => {
    const out = format('<body><Image src="a-very-long-file-name.jpg" alt="a caption" /></body>', {
      printWidth: 30,
    });
    expect(out).toBe(
      [
        '<body>',
        '  <Image',
        '    src="a-very-long-file-name.jpg"',
        '    alt="a caption"',
        '  />',
        '</body>',
        '',
      ].join('\n'),
    );
  });

  it('preserves attribute order', () => {
    expect(format('<body><Heading align="center" size="lg">a</Heading></body>')).toContain(
      'align="center" size="lg"',
    );
  });

  it('normalizes quotes to double, falling back to single', () => {
    expect(format(`<body><Quote by='The Chancellor'>a</Quote></body>`)).toContain(
      'by="The Chancellor"',
    );
    expect(format(`<body><Quote by='he said "no"'>a</Quote></body>`)).toContain(
      `by='he said "no"'`,
    );
  });
});

describe('blank lines', () => {
  it('always separates top-level nodes with one blank line', () => {
    expect(format('<head><title>a</title></head><body><Slide /></body>')).toBe(
      '<head>\n  <title>a</title>\n</head>\n\n<body>\n  <Slide />\n</body>\n',
    );
  });

  it('keeps at most one blank line between siblings', () => {
    const out = format('<body><Slide><Heading>a</Heading>\n\n\n\n<Text>b</Text></Slide></body>');
    expect(out).toBe(
      '<body>\n  <Slide>\n    <Heading>a</Heading>\n\n    <Text>b</Text>\n  </Slide>\n</body>\n',
    );
  });

  it('drops a blank line before the first child', () => {
    const out = format('<body><Slide>\n\n<Heading>a</Heading></Slide></body>');
    expect(out).toBe('<body>\n  <Slide>\n    <Heading>a</Heading>\n  </Slide>\n</body>\n');
  });
});

describe('comments', () => {
  it('normalizes a comment to one line with single spaces inside', () => {
    expect(format('<body>\n<!--   a\n note   -->\n</body>')).toBe(
      '<body>\n  <!-- a note -->\n</body>\n',
    );
  });

  it('prints an empty comment without collapsing the delimiters', () => {
    expect(format('<body><!----></body>')).toBe('<body>\n  <!-- -->\n</body>\n');
  });
});

describe('options and entry points', () => {
  it('honours indentWidth', () => {
    expect(format('<body><Slide /></body>', { indentWidth: 4 })).toBe(
      '<body>\n    <Slide />\n</body>\n',
    );
  });

  it('formats an already-parsed document', () => {
    const { doc } = parse('<body><Slide /></body>');
    expect(formatDocument(doc)).toBe('<body>\n  <Slide />\n</body>\n');
  });

  it('formats an empty document to an empty string', () => {
    expect(format('')).toBe('');
    expect(format('   \n\n  ')).toBe('');
  });

  it('leaves unparseable source alone rather than mangling it', () => {
    const broken = '<body><Slide>\n';
    expect(format(broken)).toBe(broken);
    expect(isFormatted(broken)).toBe(false);
  });

  it('normalizes CRLF', () => {
    expect(format('<body>\r\n<Slide />\r\n</body>\r\n')).toBe('<body>\n  <Slide />\n</body>\n');
  });
});
