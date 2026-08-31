import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile, parse, WZD_SAMPLES } from '@newspapper/core/wizard';
import type { TNode, Theme } from '@newspapper/core/templates';
import { compileTraced, sourceOffsetOf, styleWithoutStamp, WZD_SRC_KEY } from './compileTraced.js';

const themePath = fileURLToPath(
  new URL('../../../../../assets/design-systems/warm-industrial-1.json', import.meta.url),
);
const theme = JSON.parse(readFileSync(themePath, 'utf8')) as Theme;

function strip(node: TNode): TNode {
  const style = styleWithoutStamp(node);
  const base = { ...node, style } as TNode;
  if (base.kind === 'box') return { ...base, children: (base.children ?? []).map(strip) };
  if (base.kind === 'repeat') return { ...base, children: base.children.map(strip) };
  return base;
}

function every(node: TNode, visit: (n: TNode) => void): void {
  visit(node);
  if (node.kind === 'box') (node.children ?? []).forEach((c) => every(c, visit));
  if (node.kind === 'repeat') node.children.forEach((c) => every(c, visit));
}

describe('compileTraced', () => {
  it('produces exactly what core compile() produces, once the stamp is removed', () => {
    for (const sample of WZD_SAMPLES) {
      const doc = parse(sample.source).doc;
      const core = compile(doc, theme);
      const traced = compileTraced(doc, theme);
      expect(traced.slides.map(strip), sample.name).toEqual(core.slides);
      expect(traced.diagnostics, sample.name).toEqual(core.diagnostics);
      expect(traced.head, sample.name).toEqual(core.head);
      expect(traced.themeError, sample.name).toBeNull();
    }
  });

  it('stamps a source offset that resolves back to the element that made it', () => {
    const source = WZD_SAMPLES.find((s) => s.name === 'list')?.source ?? '';
    const doc = parse(source).doc;
    const traced = compileTraced(doc, theme);
    const offsets: number[] = [];
    traced.slides.forEach((slide) => {
      every(slide, (n) => {
        const at = sourceOffsetOf(n);
        if (at !== null) offsets.push(at);
      });
    });
    expect(offsets.length).toBeGreaterThan(3);
    for (const at of offsets) expect(source.slice(at, at + 1)).toBe('<');
  });

  it('stamps every column of a Row, whose children are cloned', () => {
    const source = WZD_SAMPLES.find((s) => s.name === 'two columns')?.source ?? '';
    expect(source).not.toBe('');
    const traced = compileTraced(parse(source).doc, theme);
    const rows: TNode[] = [];
    traced.slides.forEach((slide) =>
      every(slide, (n) => {
        if (n.kind === 'box' && (n.children?.length ?? 0) > 1 && n.style?.['flexDirection'] === 'row')
          rows.push(n);
      }),
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      for (const column of (row as { children?: TNode[] }).children ?? []) {
        expect(sourceOffsetOf(column)).not.toBeNull();
        expect(column.style?.['flex']).toBe(1);
      }
    }
  });

  it('reports a theme that cannot drive the library instead of throwing', () => {
    const broken = { ...theme, colors: {} } as Theme;
    const result = compileTraced(parse(WZD_SAMPLES[0].source).doc, broken);
    expect(result.themeError).toContain('missing tokens');
    expect(result.slides).toEqual([]);
  });

  it('keeps the stamp out of what resolveStyle is handed', () => {
    const traced = compileTraced(parse(WZD_SAMPLES[0].source).doc, theme);
    const slide = traced.slides[0];
    expect(slide.style?.[WZD_SRC_KEY]).toBe(WZD_SAMPLES[0].source.indexOf('<Slide>'));
    expect(WZD_SRC_KEY in styleWithoutStamp(slide)).toBe(false);
  });
});
