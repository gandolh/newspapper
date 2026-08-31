import { describe, it, expect } from 'vitest';
import { WZD_SAMPLES } from '@newspapper/core/wizard';
import { decorate, tokenize, type WzdToken } from './highlight.js';
import { starterDocument } from './starter.js';

function tiles(source: string, tokens: readonly WzdToken[]): boolean {
  let at = 0;
  for (const token of tokens) {
    if (token.start !== at || token.end <= token.start) return false;
    at = token.end;
  }
  return at === source.length;
}

function slice(source: string, tokens: readonly WzdToken[], kind: string): string[] {
  return tokens.filter((t) => t.kind === kind).map((t) => source.slice(t.start, t.end));
}

describe('tokenize', () => {
  it('tiles every sample with no gaps or overlaps', () => {
    for (const sample of WZD_SAMPLES) {
      expect(tiles(sample.source, tokenize(sample.source)), sample.name).toBe(true);
    }
    const starter = starterDocument('2026-08-31');
    expect(tiles(starter, tokenize(starter))).toBe(true);
  });

  it('separates capitalized components from lowercase structure', () => {
    const source = '<head>\n  <title>Hi</title>\n</head>\n\n<body>\n  <Slide>\n    <Heading size="lg">Hi</Heading>\n  </Slide>\n</body>\n';
    const tokens = tokenize(source);
    expect(new Set(slice(source, tokens, 'component'))).toEqual(new Set(['Slide', 'Heading']));
    expect(new Set(slice(source, tokens, 'structure'))).toEqual(new Set(['head', 'title', 'body']));
    expect(slice(source, tokens, 'attr')).toEqual(['size']);
    expect(slice(source, tokens, 'value')).toEqual(['"lg"']);
  });

  it('marks bindings inside text only', () => {
    const source = '<Source>{date}</Source>';
    expect(slice(source, tokenize(source), 'binding')).toEqual(['{date}']);
  });

  it('takes a comment whole, even unterminated', () => {
    const closed = '<!-- a note --><Slide />';
    expect(slice(closed, tokenize(closed), 'comment')).toEqual(['<!-- a note -->']);
    const open = 'x<!-- never closed';
    expect(slice(open, tokenize(open), 'comment')).toEqual(['<!-- never closed']);
    expect(tiles(open, tokenize(open))).toBe(true);
  });

  it('colours a half-typed tag rather than giving up', () => {
    for (const partial of ['<Head', '<Heading size=', '<Heading size="l', '</Head', '<', 'a < b']) {
      expect(tiles(partial, tokenize(partial)), partial).toBe(true);
    }
    const half = '<Heading size="l';
    expect(slice(half, tokenize(half), 'component')).toEqual(['Heading']);
    expect(slice(half, tokenize(half), 'value')).toEqual(['"l']);
  });

  it('treats a lone < as text', () => {
    const source = 'a < b';
    expect(slice(source, tokenize(source), 'text').join('')).toBe('a < b');
  });
});

describe('decorate', () => {
  const source = '<Heading size="zz">Hi</Heading>';
  const tokens = tokenize(source);

  it('is a pass-through when nothing is marked', () => {
    const spans = decorate(tokens, [], source.length);
    expect(spans.map((s) => s.marks)).toEqual(tokens.map(() => []));
  });

  it('splits a token at a mark boundary and keeps the tiling', () => {
    const start = source.indexOf('zz');
    const spans = decorate(tokens, [{ start, end: start + 2, mark: 'error' }], source.length);
    expect(tiles(source, spans)).toBe(true);
    const marked = spans.filter((s) => s.marks.includes('error'));
    expect(marked.map((s) => source.slice(s.start, s.end)).join('')).toBe('zz');
  });

  it('widens a zero-width mark so it is still visible', () => {
    const spans = decorate(tokens, [{ start: 0, end: 0, mark: 'error' }], source.length);
    const marked = spans.filter((s) => s.marks.includes('error'));
    expect(marked).toHaveLength(1);
    expect(marked[0].end - marked[0].start).toBe(1);
  });

  it('layers overlapping marks onto the same span', () => {
    const spans = decorate(
      tokens,
      [
        { start: 0, end: 10, mark: 'error' },
        { start: 5, end: 15, mark: 'selected' },
      ],
      source.length,
    );
    expect(tiles(source, spans)).toBe(true);
    const both = spans.filter((s) => s.marks.length === 2);
    expect(both.length).toBeGreaterThan(0);
    expect(both[0].marks.sort()).toEqual(['error', 'selected']);
  });

  it('clamps a mark that runs past the end of the source', () => {
    const spans = decorate(tokens, [{ start: 0, end: 9999, mark: 'error' }], source.length);
    expect(tiles(source, spans)).toBe(true);
    expect(spans.every((s) => s.marks.includes('error'))).toBe(true);
  });
});
