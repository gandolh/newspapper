import { describe, expect, it } from 'vitest';
import type { WzdDiagnosticCode } from './diagnostics.js';
import { isElement } from './ast.js';
import { lint, lintSource } from './lint.js';
import { parse } from './parse.js';
import { WZD_SAMPLES } from './samples.js';

function codes(source: string): WzdDiagnosticCode[] {
  return lintSource(source).map((d) => d.code);
}

function only(source: string, code: WzdDiagnosticCode) {
  return lintSource(source).filter((d) => d.code === code);
}

/** A valid document with `inner` dropped into the first slide. */
function inSlide(inner: string): string {
  return `<head>\n  <title>t</title>\n</head>\n\n<body>\n  <Slide>\n    ${inner}\n  </Slide>\n</body>\n`;
}

const VALID = inSlide('<Heading>Hello</Heading>');

describe('a clean document', () => {
  it('produces no findings', () => {
    expect(lintSource(VALID)).toEqual([]);
  });

  it.each(WZD_SAMPLES.filter((s) => s.clean).map((s) => [s.name, s.source] as const))(
    'the %s sample lints clean',
    (_name, source) => {
      expect(lintSource(source)).toEqual([]);
    },
  );
});

describe('unknown-component', () => {
  it('triggers on a capitalized tag that is not in the catalogue', () => {
    const found = only(inSlide('<Marquee>Hi</Marquee>'), 'unknown-component');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('<Marquee>');
    expect(found[0].severity).toBe('error');
    expect(found[0].loc.start.line).toBe(7);
  });

  it('triggers on an unknown lowercase tag and says lowercase is structure', () => {
    const found = only('<head>\n  <author>me</author>\n  <title>t</title>\n</head>\n<body><Slide><Text>a</Text></Slide></body>', 'unknown-component');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('document structure');
  });

  it('does not trigger on a catalogue component', () => {
    expect(codes(inSlide('<Quote by="X">Hi</Quote>'))).toEqual([]);
  });
});

describe('unknown-prop', () => {
  it('triggers on a prop the component does not take', () => {
    const found = only(inSlide('<Item2 />'.replace('Item2', 'Spacer align="left"')), 'unknown-prop');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('<Spacer> has no `align` prop');
    expect(found[0].message).toContain('It takes: size.');
  });

  it('points at the prop name, not the element', () => {
    const source = inSlide('<Heading colour="red">Hi</Heading>');
    const found = only(source, 'unknown-prop')[0];
    expect(source.slice(found.loc.start.offset, found.loc.end.offset)).toBe('colour');
  });

  it('does not trigger on a prop the component takes', () => {
    expect(codes(inSlide('<Heading size="lg" align="center" emphasis="strong">Hi</Heading>'))).toEqual([]);
  });
});

describe('invalid-prop-value', () => {
  it('triggers on a value outside the scale and lists the scale', () => {
    const source = inSlide('<Heading size="huge">Hi</Heading>');
    const found = only(source, 'invalid-prop-value');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('xs, sm, md, lg, xl');
    expect(source.slice(found[0].loc.start.offset, found[0].loc.end.offset)).toBe('huge');
  });

  it('triggers for each scale', () => {
    expect(only(inSlide('<Heading align="middle">a</Heading>'), 'invalid-prop-value')).toHaveLength(1);
    expect(only(inSlide('<Heading emphasis="bold">a</Heading>'), 'invalid-prop-value')).toHaveLength(1);
  });

  it('triggers on a free-text value carrying both quote characters', () => {
    // Unwriteable in source — Wizard has no escapes — but the visual editor can set it.
    const { doc } = parse(inSlide('<Quote by="x">a</Quote>'));
    const quote = doc.bodyElement!.children.filter(isElement)[0].children.filter(isElement)[0];
    quote.attributes[0].value = `he said "no", it's over`;
    quote.props.by = quote.attributes[0].value;
    const found = lint(doc).filter((d) => d.code === 'invalid-prop-value');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('both quote characters');
  });

  it('does not trigger on a value inside the scale, or on ordinary free text', () => {
    expect(codes(inSlide('<Heading size="xs">Hi</Heading>'))).toEqual([]);
    expect(codes(inSlide('<Image src="a.jpg" alt="A door, ajar" />'))).toEqual([]);
  });
});

describe('missing-prop', () => {
  it('triggers when a required prop is absent', () => {
    const found = only(inSlide('<Image alt="x" />'), 'missing-prop');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('needs a `src` prop');
  });

  it('triggers when a required prop is empty', () => {
    expect(only(inSlide('<Image src="" />'), 'missing-prop')).toHaveLength(1);
  });

  it('does not trigger when it is present', () => {
    expect(codes(inSlide('<Image src="a.jpg" />'))).toEqual([]);
  });
});

describe('duplicate-prop', () => {
  it('triggers when a prop is written twice', () => {
    const found = only(inSlide('<Heading size="lg" size="sm">a</Heading>'), 'duplicate-prop');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('The first value wins');
  });

  it('does not trigger on two different props', () => {
    expect(codes(inSlide('<Heading size="lg" align="left">a</Heading>'))).toEqual([]);
  });
});

describe('misplaced-element', () => {
  it('triggers for Item outside List', () => {
    const found = only(inSlide('<Item>a</Item>'), 'misplaced-element');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('direct child of <List>');
  });

  it('triggers for a non-Item inside List', () => {
    const found = only(inSlide('<List><Text>a</Text></List>'), 'misplaced-element');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('cannot go inside <List>');
  });

  it('triggers for content outside <body>', () => {
    const found = only('<head>\n  <title>t</title>\n</head>\n<Slide><Text>a</Text></Slide>\n', 'misplaced-element');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('<Slide> must be a direct child of <body>');
  });

  it('triggers for text outside an element', () => {
    const found = only('<head>\n  <title>t</title>\n</head>\nloose words\n<body><Slide><Text>a</Text></Slide></body>', 'misplaced-element');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('cannot sit at the top level');
  });

  it('triggers for a Slide nested in a Slide, with a message about nesting', () => {
    const found = only(inSlide('<Slide><Text>a</Text></Slide>'), 'misplaced-element');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('cannot be nested inside another <Slide>');
  });

  it('triggers for a component outside any Slide', () => {
    const found = only('<head>\n  <title>t</title>\n</head>\n<body>\n  <Heading>a</Heading>\n</body>\n', 'misplaced-element');
    expect(found.some((f) => f.message.includes('must be inside a <Slide>'))).toBe(true);
  });

  it('triggers for text directly inside a container', () => {
    const found = only(inSlide('<List>loose</List>'), 'misplaced-element');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('holds elements, not text');
  });

  it('triggers for children inside a void component', () => {
    const found = only(inSlide('<Spacer><Text>a</Text></Spacer>'), 'misplaced-element');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('takes no content');
  });

  it('triggers for an element inside a text-only component', () => {
    const found = only(inSlide('<Heading><Text>a</Text></Heading>'), 'misplaced-element');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('holds text, not elements');
  });

  it('triggers on a second <head>', () => {
    const found = only('<head><title>a</title></head>\n<head><title>b</title></head>\n<body><Slide><Text>x</Text></Slide></body>', 'misplaced-element');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('one <head>');
  });

  it('does not trigger for correct nesting', () => {
    expect(codes(inSlide('<List><Item>a</Item><Item>b</Item></List>'))).toEqual([]);
    expect(codes(inSlide('<Row><Stack><Text>a</Text></Stack></Row>'))).toEqual([]);
  });
});

describe('missing-head and missing-title', () => {
  it('missing-head triggers when there is no head', () => {
    const found = only('<body><Slide><Text>a</Text></Slide></body>', 'missing-head');
    expect(found).toHaveLength(1);
    expect(found[0].loc.start).toEqual({ offset: 0, line: 1, column: 1 });
  });

  it('missing-title triggers when head declares none', () => {
    const found = only('<head>\n  <date>2026-08-27</date>\n</head>\n<body><Slide><Text>a</Text></Slide></body>', 'missing-title');
    expect(found).toHaveLength(1);
    expect(found[0].loc.start.line).toBe(1);
  });

  it('missing-title triggers on an empty title', () => {
    expect(only('<head><title></title></head><body><Slide><Text>a</Text></Slide></body>', 'missing-title')).toHaveLength(1);
  });

  it('neither triggers on a document with a head and a title', () => {
    expect(codes(VALID)).toEqual([]);
  });
});

describe('empty-slide', () => {
  it('triggers on a slide with nothing on it', () => {
    const found = only('<head><title>t</title></head><body><Slide /></body>', 'empty-slide');
    expect(found).toHaveLength(1);
  });

  it('triggers on a slide holding only a comment', () => {
    expect(only('<head><title>t</title></head><body><Slide><!-- todo --></Slide></body>', 'empty-slide')).toHaveLength(1);
  });

  it('does not trigger on a slide with content', () => {
    expect(only(VALID, 'empty-slide')).toHaveLength(0);
  });
});

describe('slide-count', () => {
  it('errors on a body with no slides', () => {
    const found = only('<head><title>t</title></head><body></body>', 'slide-count');
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('error');
    expect(found[0].message).toContain('at least 1');
  });

  it('errors when there is no body at all', () => {
    const found = only('<head><title>t</title></head>', 'slide-count');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('no <body>');
  });

  it('warns above ten slides', () => {
    const slides = Array.from({ length: 11 }, (_, i) => `<Slide><Text>${i}</Text></Slide>`).join('');
    const found = only(`<head><title>t</title></head><body>${slides}</body>`, 'slide-count');
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('warning');
    expect(found[0].message).toContain('11 slides');
  });

  it('does not trigger at exactly ten', () => {
    const slides = Array.from({ length: 10 }, (_, i) => `<Slide><Text>${i}</Text></Slide>`).join('');
    expect(only(`<head><title>t</title></head><body>${slides}</body>`, 'slide-count')).toHaveLength(0);
  });

  it('honours the bounds options', () => {
    const slides = Array.from({ length: 3 }, (_, i) => `<Slide><Text>${i}</Text></Slide>`).join('');
    const source = `<head><title>t</title></head><body>${slides}</body>`;
    expect(lintSource(source, { maxSlides: 2 })[0]).toMatchObject({
      code: 'slide-count',
      severity: 'warning',
    });
    expect(lintSource(source, { minSlides: 4 })[0]).toMatchObject({
      code: 'slide-count',
      severity: 'error',
    });
  });
});

describe('linter contract', () => {
  it('never throws, whatever it is handed', () => {
    for (const junk of ['', '<', '</>', '<Slide', '<head><body>', '{}', '<a b=']) {
      expect(() => lintSource(junk)).not.toThrow();
    }
  });

  it('still runs the semantic rules over a document with syntax errors', () => {
    const found = codes('<head><title>t</title></head><body><Slide><Marquee>a</Slide></body>');
    expect(found).toContain('syntax-error');
    expect(found).toContain('unknown-component');
  });

  it('returns findings in source order', () => {
    const source = inSlide('<Heading size="huge">a</Heading>\n    <Marquee>b</Marquee>');
    const found = lintSource(source);
    const offsets = found.map((f) => f.loc.start.offset);
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
  });

  it('lints an already-parsed document', () => {
    const { doc } = parse('<body><Slide /></body>');
    expect(lint(doc).map((d) => d.code).sort()).toEqual(['empty-slide', 'missing-head']);
  });
});
