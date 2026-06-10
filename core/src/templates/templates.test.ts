/**
 * Tests for the 9 warm-industrial template JSON documents.
 * - All 9 pass validateTemplateDoc
 * - Each renders with its own sample to non-empty HTML containing sample strings
 * - One golden inline-snapshot for title-main
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateTemplateDoc, renderTemplate } from './interpreter.js';
import { loadTheme } from '../themes/index.js';
import type { TemplateDoc, RenderTemplateOptions } from '../types.js';

function loadDoc(id: string): TemplateDoc {
  const path = resolve('assets/templates/warm-industrial', `${id}.json`);
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as TemplateDoc;
}

const TEMPLATE_IDS = [
  'title-main',
  'title-statement',
  'title-question',
  'body-text',
  'body-list',
  'body-comparison',
  'quote-classic',
  'quote-pullout',
  'quote-reaction',
];

const theme = loadTheme('warm-industrial');
const opts: RenderTemplateOptions = { index: 1, total: 5, fontBaseUrl: '/fonts' };

describe('warm-industrial templates', () => {
  for (const id of TEMPLATE_IDS) {
    describe(id, () => {
      it('passes validateTemplateDoc', () => {
        const doc = loadDoc(id);
        expect(() => validateTemplateDoc(doc)).not.toThrow();
      });

      it('renders to non-empty HTML with sample data', () => {
        const doc = loadDoc(id);
        const html = renderTemplate(doc, doc.sample as Record<string, unknown>, theme, opts);
        expect(html.length).toBeGreaterThan(200);
        expect(html).toContain('<!doctype html>');
        expect(html).toContain('<body>');
      });

      it('rendered HTML contains sample string values', () => {
        const doc = loadDoc(id);
        const html = renderTemplate(doc, doc.sample as Record<string, unknown>, theme, opts);
        // Check that at least one sample string value appears in the HTML
        const sampleValues = Object.values(doc.sample as Record<string, unknown>)
          .flatMap((v) => {
            if (typeof v === 'string') return [v];
            if (Array.isArray(v)) return v.filter((x) => typeof x === 'string');
            if (typeof v === 'object' && v !== null) return Object.values(v as Record<string, string>).filter((x) => typeof x === 'string');
            return [];
          })
          .filter((s) => s.length > 3); // only non-trivial strings

        expect(sampleValues.length).toBeGreaterThan(0);
        // At least one sample value should appear in the rendered HTML
        const anyFound = sampleValues.some((s) => html.includes(s) || html.includes(s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')));
        expect(anyFound).toBe(true);
      });
    });
  }

  it('title-main golden snapshot', () => {
    const doc = loadDoc('title-main');
    const html = renderTemplate(
      doc,
      { text: 'Big News Today', kicker: 'Breaking' },
      theme,
      { index: 1, total: 5, fontBaseUrl: '/fonts' },
    );
    // Verify key structural properties rather than a full snapshot to keep it readable
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Big News Today');
    expect(html).toContain('Breaking');
    expect(html).toContain('1 / 5');
    expect(html).toContain('Newspapper');
    expect(html).toContain('#a2391a'); // primary color resolved from $color.primary
    expect(html).toContain('@font-face');
    expect(html).toContain('Inter-Regular.ttf');
    expect(html).toMatchInlineSnapshot(`
      "<!doctype html><html lang="en"><head><meta charset="UTF-8"><style>@font-face{font-family:'Inter';font-weight:400;src:url('/fonts/Inter-Regular.ttf') format('truetype');}
      @font-face{font-family:'Inter';font-weight:500;src:url('/fonts/Inter-Medium.ttf') format('truetype');}
      @font-face{font-family:'Inter';font-weight:600;src:url('/fonts/Inter-SemiBold.ttf') format('truetype');}
      @font-face{font-family:'Inter';font-weight:700;src:url('/fonts/Inter-Bold.ttf') format('truetype');}
      @font-face{font-family:'Inter';font-weight:800;src:url('/fonts/Inter-ExtraBold.ttf') format('truetype');}
      @font-face{font-family:'Inter';font-weight:900;src:url('/fonts/Inter-Black.ttf') format('truetype');}
      *{margin:0;padding:0;box-sizing:border-box;}
      body{margin:0;font-family:'Inter',sans-serif;}
      </style></head><body><div style="width:1080px;height:1080px;overflow:hidden;display:flex;"><div style="width:1080px;height:1080px;display:flex;flex-direction:column;background-color:#fbf9f8;color:#1b1c1c;padding:80px;font-family:'Inter', sans-serif"><div style="display:flex;flex-direction:column;gap:24px;margin-top:80px"><div style="display:flex;align-self:flex-start;padding:4px 12px;background-color:#a2391a;color:#ffffff;font-family:'Inter', sans-serif;font-size:18px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;border-radius:8px">Breaking</div><div style="display:flex;font-family:'Inter', sans-serif;font-weight:800;font-size:92px;line-height:1;letter-spacing:-0.04em;color:#1b1c1c">Big News Today</div></div><div style="display:flex;flex-direction:row;justify-content:space-between;align-items:center;margin-top:auto;padding-top:24px;font-family:'Inter', sans-serif;font-size:14px;font-weight:700;color:#57423c;letter-spacing:0.1em;text-transform:uppercase"><div>Newspapper</div><div>1 / 5</div></div></div></div></body></html>"
    `);
  });
});
