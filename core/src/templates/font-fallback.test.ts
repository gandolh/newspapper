/**
 * The fallback-stack guard.
 *
 * Every typography token on disk declares a bare family ("Inter"), and
 * `resolveStyle` emits it as an *inline* style on the text node. An inline
 * style outranks the document's `body{font-family:'Inter',sans-serif}` rule, so
 * a bare family means the slide's failure mode is Chromium's default — a
 * **serif**. That is why brief 66's CORS defect presented as Times rather than
 * as the intended sans.
 *
 * These tests hold two properties:
 *
 *  1. Structural, no browser: for **every theme on disk** — enumerated, not
 *     hardcoded, so a fourth theme is covered the day it is added — no emitted
 *     `font-family` is a bare family name, and the tail appended to a named
 *     face is a sans generic.
 *  2. Pixel, needs Chromium: with the named face unavailable, the slide renders
 *     identically to an explicitly `sans-serif` slide and *differently* from an
 *     explicitly `serif` one. Reasoning about CSS cascade is not proof; this is.
 *
 * If Chromium is missing the pixel tests are reported SKIPPED (never passed), a
 * banner goes to real stderr, and in CI they fail outright — "green because
 * nothing ran" is the failure mode this file exists to avoid.
 */

import { describe, it, expect, afterAll } from 'vitest';

import { listThemes, loadTheme } from '../themes/index.js';
import { WZD_SAMPLES } from '../wizard/samples.js';
import { compileSource } from '../wizard/compile.js';
import { renderTemplate, resolveStyle, withFallbackFamily } from './interpreter.js';
import type { Theme, TNode } from '../types.js';
import { htmlToPng } from '../render/screenshot.js';
import { getBrowser, closeBrowser } from '../render/browser.js';

// ---------------------------------------------------------------------------
// CSS generic families — the vocabulary a complete stack ends in
// ---------------------------------------------------------------------------

const GENERICS = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',
  'fangsong',
]);

/** The generics that are actually sans. A slide of text must not land on serif. */
const SANS_GENERICS = new Set(['sans-serif', 'ui-sans-serif', 'system-ui', 'ui-rounded']);

function families(decl: string): string[] {
  return decl
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

function bare(name: string): string {
  return name.replace(/^(['"])(.*)\1$/, '$2').toLowerCase();
}

function lastFamily(decl: string): string {
  const list = families(decl);
  return bare(list[list.length - 1] ?? '');
}

/**
 * Every `font-family` an HTML document declares, minus the `@font-face` blocks
 * — inside a face definition the property names the face being defined, where a
 * fallback stack would be meaningless.
 */
function declaredFamilies(html: string): string[] {
  const withoutFaces = html.replace(/@font-face\{[^}]*\}/g, '');
  return [...withoutFaces.matchAll(/font-family:([^;"}]*)/g)].map((m) => (m[1] ?? '').trim());
}

// ---------------------------------------------------------------------------
// 1. Structural — every theme on disk, no browser needed
// ---------------------------------------------------------------------------

const themeNames = listThemes();

describe('no emitted font-family is a bare family name', () => {
  it('there is at least one theme on disk to check', () => {
    expect(
      themeNames.length,
      'assets/design-systems is empty — this guard checked nothing',
    ).toBeGreaterThan(0);
  });

  for (const name of themeNames) {
    describe(name, () => {
      const theme = loadTheme(name);

      it('every typography token resolves to a stack ending in a generic', () => {
        const tokens = Object.keys(theme.typography);
        expect(tokens.length, `theme "${name}" declares no typography tokens`).toBeGreaterThan(0);

        for (const token of tokens) {
          const declared = theme.typography[token]?.fontFamily ?? '';
          const emitted = resolveStyle({ typography: token }, theme)['font-family'] ?? '';
          const list = families(emitted);

          expect(
            list.length,
            `${name}/${token}: font-family "${emitted}" is a bare family — when it fails ` +
              'to load the slide falls back to the default serif',
          ).toBeGreaterThan(1);

          expect(
            GENERICS.has(lastFamily(emitted)),
            `${name}/${token}: font-family "${emitted}" does not end in a CSS generic`,
          ).toBe(true);

          // A theme that authors its own generic keeps it (that is how a future
          // serif or monospace theme opts out). Anything else gets a sans tail.
          if (!GENERICS.has(lastFamily(declared))) {
            expect(
              SANS_GENERICS.has(lastFamily(emitted)),
              `${name}/${token}: declared "${declared}" fell back to ` +
                `"${lastFamily(emitted)}" — a slide of text must not land on serif`,
            ).toBe(true);
          }
        }
      });

      it('no rendered slide carries a bare font-family', () => {
        let checked = 0;
        for (const sample of WZD_SAMPLES) {
          const { slides } = compileSource(sample.source, theme);
          slides.forEach((slide, i) => {
            const html = renderTemplate(slide, {}, theme, {
              index: i + 1,
              total: slides.length,
              fontBaseUrl: '/assets/fonts',
            });
            for (const decl of declaredFamilies(html)) {
              checked++;
              expect(
                GENERICS.has(lastFamily(decl)),
                `${name}/${sample.name} slide ${i + 1}: rendered HTML declares ` +
                  `font-family:${decl} — no generic fallback`,
              ).toBe(true);
            }
          });
        }
        expect(checked, `no font-family reached the HTML for theme "${name}"`).toBeGreaterThan(0);
      });
    });
  }
});

describe('withFallbackFamily', () => {
  it('appends a sans tail to a bare named family', () => {
    expect(withFallbackFamily('Inter')).toBe('Inter,sans-serif');
  });

  it('passes the authored family through verbatim, quotes and all', () => {
    expect(withFallbackFamily('Times New Roman')).toBe('Times New Roman,sans-serif');
    expect(withFallbackFamily("'Inter'")).toBe("'Inter',sans-serif");
  });

  it('leaves a stack that already ends in a generic alone', () => {
    expect(withFallbackFamily("'Playfair Display', serif")).toBe("'Playfair Display',serif");
    expect(withFallbackFamily('monospace')).toBe('monospace');
  });

  it('keeps every family in a multi-family stack, in order', () => {
    expect(withFallbackFamily('Inter, Helvetica')).toBe('Inter,Helvetica,sans-serif');
  });

  it('degrades an empty declaration to the generic rather than emitting nothing', () => {
    expect(withFallbackFamily('  ')).toBe('sans-serif');
  });
});

// ---------------------------------------------------------------------------
// 2. Pixel — the fallback is a sans, proved by rendering it
// ---------------------------------------------------------------------------

let browserAvailable = true;
let browserError = '';
try {
  const browser = await getBrowser();
  if (!browser.isConnected()) throw new Error('browser not connected');
} catch (err) {
  browserAvailable = false;
  browserError = (err as Error).message.split('\n')[0] ?? String(err);
}

const SKIP_NOTE = 'Chromium unavailable — the fallback-stack guard did NOT verify any pixels';

function unavailableBanner(): string {
  const rule = '='.repeat(78);
  return [
    '',
    rule,
    '[font-fallback.test] CHROMIUM UNAVAILABLE — THE PIXEL HALF DID NOT RUN.',
    '[font-fallback.test] Nothing here verified that the fallback renders as a sans.',
    '[font-fallback.test] Run `npx playwright install chromium` before trusting this run.',
    `[font-fallback.test] cause: ${browserError}`,
    rule,
    '',
  ].join('\n');
}

function browserOrSkip(skip: (note?: string) => void): boolean {
  if (browserAvailable) return true;
  const banner = unavailableBanner();
  console.error(banner);
  if (process.env['CI']) {
    throw new Error(`${SKIP_NOTE}. In CI that is a failure, not a skip.${banner}`);
  }
  skip(SKIP_NOTE);
  return false;
}

afterAll(async () => {
  if (browserAvailable) {
    await closeBrowser();
    return;
  }
  // Vitest's reporter swallows console output from skipped tests, so the
  // warning goes straight to the real stderr.
  process.stderr.write(unavailableBanner());
});

/** A theme identical but for the family its typography asks for. */
function themeWithFamily(fontFamily: string): Theme {
  return {
    name: `fallback-${fontFamily}`,
    colors: { surface: '#ffffff', 'on-surface': '#000000' },
    typography: {
      display: { fontFamily, fontSize: '96px', fontWeight: '800', lineHeight: '1.1' },
      'body-md': { fontFamily, fontSize: '48px', fontWeight: '400', lineHeight: '1.4' },
    },
    rounded: { md: '0.75rem' },
    spacing: { md: '24px' },
    shapes: { borderRadius: '0.5rem', borderWidth: '2px' },
  };
}

const slide: TNode = {
  kind: 'box',
  style: {
    width: '1080px',
    height: '1080px',
    background: '$color.surface',
    padding: '$spacing.md',
    display: 'flex',
    flexDirection: 'column',
    gap: '$spacing.md',
  },
  children: [
    {
      kind: 'text',
      style: { typography: 'display', color: '$color.on-surface' },
      text: 'Handgloves 0123',
    },
    {
      kind: 'text',
      style: { typography: 'body-md', color: '$color.on-surface' },
      text: 'The quick brown fox jumps over the lazy dog.',
    },
  ],
};

function html(fontFamily: string): string {
  return renderTemplate(slide, {}, themeWithFamily(fontFamily), {
    index: 1,
    total: 1,
    // A path no font is served from: the family under test is the only thing
    // deciding these pixels.
    fontBaseUrl: '/assets/fonts',
  });
}

describe('the fallback a missing face lands on is a sans', () => {
  it('renders as sans-serif, not as the browser default serif', async (ctx) => {
    if (!browserOrSkip((note) => ctx.skip(note))) return;

    // Nothing on the machine may answer to this name, so the stack's tail is
    // what draws the text.
    const missing = await htmlToPng(html('NoSuchFaceOnThisMachine'));
    const sans = await htmlToPng(html('sans-serif'));
    const sansAgain = await htmlToPng(html('sans-serif'));
    const serif = await htmlToPng(html('serif'));

    expect(
      sans.equals(sansAgain),
      'two renders of the same slide differ — the comparisons below are noise, not signal',
    ).toBe(true);

    expect(
      sans.equals(serif),
      'this machine draws generic serif and generic sans-serif identically, so ' +
        'the assertion below could not tell them apart',
    ).toBe(false);

    expect(
      missing.equals(serif),
      'a slide whose face does not exist rendered identically to an explicitly ' +
        'serif slide — the emitted font-family has no sans fallback',
    ).toBe(false);

    expect(
      missing.equals(sans),
      'a slide whose face does not exist did not render as generic sans-serif',
    ).toBe(true);
  }, 60_000);
});
