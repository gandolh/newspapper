import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from '@newspapper/core/wizard';
import { resolveStyle } from '@newspapper/core/templates';
import type { TStyle, Theme } from '@newspapper/core/templates';
import { collectStyleProblems, resolveTolerant, toReactStyle } from './resolve.js';
import { compileTraced } from './compileTraced.js';

const themePath = fileURLToPath(
  new URL('../../../../../assets/design-systems/warm-industrial-1.json', import.meta.url),
);
const theme = JSON.parse(readFileSync(themePath, 'utf8')) as Theme;

const DOC = `<head>
  <title>Tokens</title>
</head>

<body>
  <Slide>
    <Heading>Something</Heading>
  </Slide>
</body>
`;

describe('resolveTolerant', () => {
  it('is core resolveStyle, verbatim, when the theme has every token', () => {
    const style: TStyle = {
      color: '$color.on-surface',
      padding: '$spacing.xl',
      typography: 'display',
    };
    const result = resolveTolerant(style, theme);
    expect(result.problems).toEqual([]);
    expect(result.css).toEqual(resolveStyle(style, theme));
  });

  it('keeps the declarations it can resolve and names the ones it cannot', () => {
    const style: TStyle = { color: '$color.no-such-token', padding: '$spacing.xl' };
    expect(() => resolveStyle(style, theme)).toThrow();
    const result = resolveTolerant(style, theme);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toContain('$color.no-such-token');
    expect(result.css['padding']).toBe(theme.spacing['xl']);
    expect(result.css['color']).toBeUndefined();
  });

  it('reports a missing typography token without losing the rest', () => {
    const result = resolveTolerant(
      { typography: 'no-such-scale', color: '$color.on-surface' },
      theme,
    );
    expect(result.problems[0]).toContain('typography');
    expect(result.css['color']).toBe(theme.colors['on-surface']);
  });

  it('lets an explicit declaration override the typography expansion, as core does', () => {
    const style: TStyle = { typography: 'display', fontSize: '99px' };
    expect(resolveTolerant(style, theme).css['font-size']).toBe(
      resolveStyle(style, theme)['font-size'],
    );
  });
});

describe('collectStyleProblems', () => {
  it('finds nothing on a complete theme', () => {
    const { slides } = compileTraced(parse(DOC).doc, theme);
    expect(collectStyleProblems(slides, theme)).toEqual([]);
  });

  it('names the offending node by its source offset', () => {
    const stripped: Theme = {
      ...theme,
      colors: Object.fromEntries(Object.entries(theme.colors).filter(([k]) => k !== 'on-surface')),
    };
    const { slides } = compileTraced(parse(DOC).doc, theme);
    const problems = collectStyleProblems(slides, stripped);
    expect(problems.length).toBeGreaterThan(0);
    const offsets = problems.map((p) => p.offset).filter((o): o is number => o !== null);
    expect(offsets.length).toBeGreaterThan(0);
    for (const at of offsets) expect(DOC.slice(at, at + 1)).toBe('<');
  });
});

describe('toReactStyle', () => {
  it('camelCases standard properties and leaves custom ones alone', () => {
    expect(
      toReactStyle({ 'font-size': '12px', 'aspect-ratio': '3 / 2', '--wzd-src': '4' }),
    ).toEqual({
      fontSize: '12px',
      aspectRatio: '3 / 2',
      '--wzd-src': '4',
    });
  });
});
