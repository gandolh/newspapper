import { describe, it, expect } from 'vitest';
import type { TNode, TemplateDoc } from '../types.js';
import { loadTheme } from '../themes/index.js';
import { renderTemplate } from '../templates/interpreter.js';
import { parse, parseOrThrow } from './parse.js';
import { lint } from './lint.js';
import { WZD_SAMPLES } from './samples.js';
import { unthemedStyleValues } from './components/index.js';
import {
  WzdCompileError,
  compile,
  compileDocument,
  compileSlide,
  compileSource,
  slideElements,
} from './compile.js';

const theme = loadTheme('warm-industrial');

function render(root: TNode, index: number, total: number): string {
  const doc: TemplateDoc = {
    id: 'wizard',
    theme: 'warm-industrial',
    family: 'body',
    name: 'Wizard',
    fields: [],
    sample: {},
    root,
  };
  return renderTemplate(doc, {}, theme, { index, total, fontBaseUrl: '/assets/fonts' });
}

describe('compileDocument', () => {
  it('returns one node per slide, in document order', () => {
    const doc = parseOrThrow(WZD_SAMPLES.find((s) => s.name === 'many slides')!.source);
    const slides = compileDocument(doc, theme);
    expect(slides).toHaveLength(5);
    expect(JSON.stringify(slides[0])).toContain('One');
    expect(JSON.stringify(slides[4])).toContain('Five');
  });

  it('refuses a document with lint errors', () => {
    const doc = parseOrThrow('<head><title>T</title></head><body><Slide><Marquee>a</Marquee></Slide></body>');
    expect(() => compileDocument(doc, theme)).toThrow(WzdCompileError);
  });

  it('carries the diagnostics on the error it throws', () => {
    const doc = parseOrThrow('<body><Slide><Heading>a</Heading></Slide></body>');
    try {
      compileDocument(doc, theme);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(WzdCompileError);
      expect((err as WzdCompileError).diagnostics.map((d) => d.code)).toContain('missing-head');
    }
  });

  it('compiles a document whose only finding is a warning', () => {
    const slides = Array.from({ length: 12 }, (_, i) => `<Slide><Heading>${i}</Heading></Slide>`).join('');
    const doc = parseOrThrow(`<head><title>T</title></head><body>${slides}</body>`);
    expect(compileDocument(doc, theme)).toHaveLength(12);
  });

  it('refuses a theme that lacks the tokens the components need', () => {
    const doc = parseOrThrow('<head><title>T</title></head><body><Slide><Heading>a</Heading></Slide></body>');
    expect(() => compileDocument(doc, { ...theme, colors: {} })).toThrow(/missing tokens/);
  });
});

describe('compile', () => {
  it('never throws over a broken document, and says what it skipped', () => {
    const { doc } = parse('<head><title>T</title></head><body><Slide><Marquee>a</Marquee></Slide></body>');
    const result = compile(doc, theme);
    expect(result.slides).toHaveLength(1);
    expect(result.diagnostics.map((d) => d.code)).toContain('unknown-component');
    if (result.slides[0].kind !== 'box') throw new Error('slide is not a box');
    expect(result.slides[0].children).toEqual([]);
  });

  it('hands back the head as the binding scope it used', () => {
    const doc = parseOrThrow('<head><title>T</title><date>2026-08-27</date></head><body><Slide><Heading>a</Heading></Slide></body>');
    expect(compile(doc, theme).head).toEqual({ title: 'T', date: '2026-08-27' });
  });
});

describe('bindings', () => {
  const source = '<head><title>Daily</title><date>2026-08-27</date></head><body><Slide><Kicker>{date}</Kicker><Heading>{title}</Heading></Slide></body>';

  it('resolve from <head> at compile time', () => {
    const [slide] = compileDocument(parseOrThrow(source), theme);
    if (slide.kind !== 'box') throw new Error('slide is not a box');
    const [kicker, heading] = slide.children ?? [];
    expect(kicker.kind === 'text' && kicker.text).toBe('2026-08-27');
    expect(heading.kind === 'text' && heading.text).toBe('Daily');
  });

  it('are a lint error when nothing resolves them, not an empty slide', () => {
    const bad = '<head><title>Daily</title></head><body><Slide><Kicker>{date}</Kicker></Slide></body>';
    const doc = parseOrThrow(bad);
    expect(lint(doc).map((d) => d.code)).toContain('unknown-binding');
    expect(() => compileDocument(doc, theme)).toThrow(WzdCompileError);
  });

  it('stay on the slide as written when compiled leniently', () => {
    const { doc } = parse('<head><title>Daily</title></head><body><Slide><Kicker>{date}</Kicker></Slide></body>');
    const slide = compile(doc, theme).slides[0];
    if (slide.kind !== 'box') throw new Error('slide is not a box');
    expect((slide.children ?? [])[0]).toMatchObject({ text: '{date}' });
  });

  it('report a field that is not in <head> at all', () => {
    const doc = parseOrThrow('<head><title>T</title></head><body><Slide><Kicker>{author}</Kicker></Slide></body>');
    const finding = lint(doc).find((d) => d.code === 'unknown-binding');
    expect(finding?.message).toContain('{author}');
    expect(finding?.loc.start.line).toBe(1);
  });

  it('are not scanned inside <head> itself', () => {
    const doc = parseOrThrow('<head><title>{not a binding}</title></head><body><Slide><Heading>a</Heading></Slide></body>');
    expect(lint(doc).map((d) => d.code)).not.toContain('unknown-binding');
  });
});

describe('escaping', () => {
  it('escapes text the interpreter would otherwise drop into HTML raw', () => {
    const doc = parseOrThrow('<head><title>T</title></head><body><Slide><Heading>Tom & Jerry > all</Heading></Slide></body>');
    const [slide] = compileDocument(doc, theme);
    const html = render(slide, 1, 1);
    expect(html).toContain('Tom &amp; Jerry &gt; all');
  });
});

describe('compileSlide', () => {
  it('compiles one slide with the page numbers it was given', () => {
    const doc = parseOrThrow('<head><title>T</title></head><body><Slide><PageCounter /></Slide></body>');
    const node = compileSlide(slideElements(doc)[0], theme, { head: doc.head, index: 3, total: 7 });
    if (node.kind !== 'box') throw new Error('slide is not a box');
    expect((node.children ?? [])[0]).toMatchObject({ text: '3/7' });
  });
});

describe('compileSource', () => {
  it('reports syntax errors alongside the lint findings', () => {
    const result = compileSource('<head><title>T</title></head><body><Slide><Heading>a</Slide></body>', theme);
    expect(result.diagnostics.some((d) => d.code === 'syntax-error')).toBe(true);
  });
});

describe('every sample', () => {
  for (const sample of WZD_SAMPLES) {
    it(`compiles and renders: ${sample.name}`, () => {
      const doc = parseOrThrow(sample.source);
      const slides = compileDocument(doc, theme);
      expect(slides.length).toBeGreaterThan(0);
      expect(unthemedStyleValues(slides, theme)).toEqual([]);
      slides.forEach((slide, i) => {
        const html = render(slide, i + 1, slides.length);
        expect(html).toContain('<!doctype html>');
        expect(html).not.toContain('$color.');
        expect(html).not.toContain('$spacing.');
        expect(html).not.toContain('typography:');
      });
    });
  }
});

describe('the rendered HTML', () => {
  const doc = parseOrThrow(WZD_SAMPLES.find((s) => s.name === 'full head')!.source);

  it('resolves every token against the theme', () => {
    const html = render(compileDocument(doc, theme)[0], 1, 1);
    expect(html).toContain(theme.colors['surface']);
    expect(html).toContain(theme.spacing['xl']);
    expect(html).toContain(theme.typography['display'].fontSize);
  });
});
