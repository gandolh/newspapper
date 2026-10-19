/**
 * Brief 106. The wax that marks the selected element in the galley must not
 * cover a single glyph, in the run or beside it.
 *
 * **Paint order is the whole bug, so this runs in real Chromium.** happy-dom
 * lays nothing out and paints nothing; a test there would pass on any CSS. The
 * shipped `SourcePane`, its CSS modules and `global.css` are bundled by Vite
 * and mounted in a Chromium page at a device scale of 3 (the brief's 300%
 * zoom), with the galley's own Spline Sans Mono served from `ui/public/fonts/`.
 * It goes through the same Chromium guard as the render tests: skipped with a
 * banner locally if Chromium is missing, a failure under `CI`.
 *
 * The check, per glyph: count its ink pixels with the wax painted, then again
 * with every background and shadow in the galley switched off (the control).
 * Wax under a glyph changes almost nothing about its ink; wax *over* a glyph
 * removes it. Under the old paint order, where every token carried its own
 * 0.35em `box-shadow` bleed, the next token's bleed covered about half of the
 * previous token's last glyph, so those glyphs kept well under half their ink.
 * That failure was watched before the fix went in.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build, type Plugin, type Rollup } from 'vite';
import { getBrowser } from '../../../../core/src/render/browser.js';
import {
  probeChromium,
  type ChromiumGuard,
} from '../../../../core/src/render/test-support/chromium.js';

/** Playwright's `Page`, taken from core's `getBrowser` rather than imported
 * from `playwright`, which `ui/package.json` does not declare. */
type Page = Awaited<ReturnType<Awaited<ReturnType<typeof getBrowser>>['newPage']>>;

const ORIGIN = 'http://galley.test';
const SCALE = 3;

let chromium: ChromiumGuard;
let page: Page | null = null;
const pageErrors: string[] = [];

const here = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));

/** A virtual entry that mounts the real SourcePane and exposes `mount()`. */
function entry(): Plugin {
  const id = 'virtual:galley-entry';
  return {
    name: 'galley-entry',
    // Lib mode hands the entry over joined to `root`, so match the tail.
    resolveId: (source) => (source.endsWith(id) ? '\0' + id : null),
    load: (resolved) =>
      resolved === '\0' + id
        ? `
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import ${JSON.stringify(here('../../styles/global.css'))};
import SourcePane from ${JSON.stringify(here('./SourcePane.tsx'))};
let root = null;
export function mount(source, range) {
  const host = document.getElementById('host');
  if (!root) root = createRoot(host);
  flushSync(() =>
    root.render(
      createElement(SourcePane, {
        source,
        onChange: () => {},
        diagnostics: [],
        selectionRange: range,
        revealToken: 0,
        onCursor: () => {},
        onFormat: () => {},
        formatted: true,
      }),
    ),
  );
}
`
        : null,
  };
}

async function bundle(): Promise<{ js: string; css: string }> {
  const result = (await build({
    configFile: false,
    logLevel: 'silent',
    root: here('../../..'),
    plugins: [entry()],
    // Under Vitest NODE_ENV is `test`, so Vite would emit `jsxDEV` calls, which
    // the production React this bundle defines has no implementation for.
    esbuild: { jsx: 'automatic', jsxDev: false },
    resolve: { alias: { '@': here('../..') } },
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      write: false,
      minify: false,
      cssCodeSplit: false,
      lib: { entry: 'virtual:galley-entry', formats: ['iife'], name: 'Galley', fileName: 'galley' },
    },
  })) as Rollup.RollupOutput[];
  const output = result[0]!.output;
  const js = output.find((o): o is Rollup.OutputChunk => o.type === 'chunk');
  const css = output
    .filter((o): o is Rollup.OutputAsset => o.type === 'asset' && o.fileName.endsWith('.css'))
    .map((o) => String(o.source))
    .join('\n');
  if (!js) throw new Error('vite produced no chunk for SourcePane');
  if (!css.includes('box-shadow'))
    throw new Error('the galley CSS did not make it into the bundle');
  return { js: js.code, css };
}

beforeAll(async () => {
  chromium = await probeChromium(
    'SourcePane.wax.test',
    'that the selected-element wax in the galley covers no glyph',
  );
  if (!chromium.available) return;
  const { js, css } = await bundle();
  const fontsDir = here('../../../public/fonts/');
  page = await (
    await getBrowser()
  ).newPage({
    viewport: { width: 900, height: 400 },
    deviceScaleFactor: SCALE,
  });
  await page.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith('/fonts/')) {
      const body = await readFile(fontsDir + path.slice('/fonts/'.length)).catch(() => null);
      return body
        ? route.fulfill({ body, contentType: path.endsWith('.ttf') ? 'font/ttf' : 'font/woff2' })
        : route.fulfill({ status: 404, body: '' });
    }
    return route.fulfill({
      contentType: 'text/html',
      body:
        '<!doctype html><html><head><style>html,body{margin:0}#host{width:900px;height:400px}</style></head>' +
        '<body><div id="host"></div></body></html>',
    });
  });
  // React reports a render error to the page, not to `mount()`'s caller.
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(`${ORIGIN}/`);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: js });
}, 120_000);

afterAll(async () => {
  await page?.close();
  await chromium.close();
});

interface Glyph {
  index: number;
  char: string;
  /** Device-pixel rect of the glyph's cell, inside the screenshot clip. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Ink per glyph, as counted from one screenshot of the galley's `<pre>`, and
 * the number of wax-yellow pixels in the whole shot. The second is the guard
 * against a wax that paints nowhere (behind the paper, say): that covers no
 * glyph either, and would pass the glyph check on its own.
 */
async function inkPerGlyph(png: Buffer, glyphs: Glyph[]): Promise<{ ink: number[]; wax: number }> {
  return page!.evaluate(
    async ({ data, glyphs }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const all = ctx.getImageData(0, 0, img.width, img.height).data;
      let wax = 0;
      // --wax is #f5d97a.
      for (let i = 0; i < all.length; i += 4) {
        const near =
          Math.abs(all[i]! - 0xf5) < 8 &&
          Math.abs(all[i + 1]! - 0xd9) < 8 &&
          Math.abs(all[i + 2]! - 0x7a) < 8;
        if (near) wax += 1;
      }
      const ink = glyphs.map((g) => {
        const { data: px } = ctx.getImageData(g.x, g.y, g.w, g.h);
        let n = 0;
        for (let i = 0; i < px.length; i += 4) {
          const lum = (0.2126 * px[i]! + 0.7152 * px[i + 1]! + 0.0722 * px[i + 2]!) / 255;
          // Wax is ~0.84 and paper 1.0; every galley ink is below 0.45.
          if (lum < 0.6) n += 1;
        }
        return n;
      });
      return { ink, wax };
    },
    { data: png.toString('base64'), glyphs },
  );
}

/**
 * Mount `source` with `[start, end)` waxed, and return every visible glyph
 * from `start - margin` to `end + margin` with its ink waxed and unwaxed.
 */
async function measure(source: string, range: [number, number], margin = 3) {
  await page!.evaluate(
    ({ source, range }) =>
      (
        window as unknown as { Galley: { mount: (s: string, r: [number, number]) => void } }
      ).Galley.mount(source, range),
    { source, range },
  );
  if (pageErrors.length) throw new Error(`the page threw: ${pageErrors.join(' | ')}`);
  await page!.evaluate(() => document.fonts.ready);

  const { clip, glyphs, family } = await page!.evaluate(
    ({ from, to, scale }) => {
      const pre = document.querySelector('pre');
      if (!pre) throw new Error('SourcePane did not render a <pre>');
      const box = pre.getBoundingClientRect();
      const glyphs: Glyph[] = [];
      const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
      let offset = 0;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent ?? '';
        for (let i = 0; i < text.length; i += 1) {
          const at = offset + i;
          if (at < from || at >= to || /\s/.test(text[i]!)) continue;
          const r = document.createRange();
          r.setStart(node, i);
          r.setEnd(node, i + 1);
          const rect = r.getBoundingClientRect();
          glyphs.push({
            index: at,
            char: text[i]!,
            x: Math.round((rect.left - box.left) * scale),
            y: Math.round((rect.top - box.top) * scale),
            w: Math.round(rect.width * scale),
            h: Math.round(rect.height * scale),
          });
        }
        offset += text.length;
      }
      return {
        clip: { x: box.left, y: box.top, width: box.width, height: box.height },
        glyphs,
        family: getComputedStyle(pre).fontFamily,
      };
    },
    { from: range[0] - margin, to: range[1] + margin, scale: SCALE },
  );

  const waxed = await inkPerGlyph(await page!.screenshot({ clip }), glyphs);
  const off = await page!.addStyleTag({
    content: 'pre, pre * { background: transparent !important; box-shadow: none !important; }',
  });
  const control = await inkPerGlyph(await page!.screenshot({ clip }), glyphs);
  await off.evaluate((el) => (el as Element).remove());

  return {
    family,
    waxCount: await page!.evaluate(() => document.querySelectorAll('pre [class*="wax"]').length),
    waxPixels: { waxed: waxed.wax, control: control.wax },
    glyphs: glyphs.map((g, i) => ({ ...g, waxed: waxed.ink[i]!, control: control.ink[i]! })),
  };
}

/** Glyphs that lost ink to the wax: under 85% of their unwaxed count. Throws
 * if the wax did not show at all, which would make "none" meaningless. */
function covered(result: Awaited<ReturnType<typeof measure>>) {
  const { waxed, control } = result.waxPixels;
  if (!(control === 0 && waxed > 5000)) {
    throw new Error(`the wax did not paint: ${waxed} wax pixels waxed, ${control} in the control`);
  }
  return result.glyphs
    .filter((g) => g.control > 0 && g.waxed < g.control * 0.85)
    .map((g) => `${JSON.stringify(g.char)}@${g.index} ${g.waxed}/${g.control}`);
}

describe('the selected-element wax in the galley (Chromium)', () => {
  it('runs: the galley font loaded, the wax painted, and every glyph has ink', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const source = '<Slide><Heading size="xl">Hi</Heading></Slide>';
    const start = source.indexOf('<Heading');
    const result = await measure(source, [start, source.indexOf('</Slide>')]);
    expect(await page!.evaluate(() => document.fonts.check('12.5px "Spline Sans Mono"'))).toBe(
      true,
    );
    expect(pageErrors).toEqual([]);
    expect(result.family).toMatch(/Spline Sans Mono/);
    expect(result.waxCount).toBeGreaterThan(0);
    // The control must itself see the glyphs, or "no glyph lost ink" is empty.
    expect(result.glyphs.length).toBeGreaterThan(30);
    for (const g of result.glyphs) expect(g.control, `${g.char}@${g.index}`).toBeGreaterThan(0);
  });

  it('covers no glyph inside a mid-line run, at a token boundary, or beside it', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    // A glyph sits right against both ends of the run: `>` before, `<` after.
    const source = '<Slide><Heading size="xl">Say something</Heading></Slide>';
    const start = source.indexOf('<Heading');
    const end = source.indexOf('</Slide>');
    expect(covered(await measure(source, [start, end]))).toEqual([]);
  });

  it('covers no glyph in a run from column 0 to the end of a line, over several lines', async (ctx) => {
    if (!chromium.orSkip((note) => ctx.skip(note))) return;
    const source = '<Heading size="xl">\n  Say something\n</Heading>\n<Text>after</Text>';
    const end = source.indexOf('\n<Text>');
    expect(covered(await measure(source, [0, end]))).toEqual([]);
  });
});
